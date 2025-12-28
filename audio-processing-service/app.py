#!/usr/bin/env python3
"""
Local Audio Processing Service using Demucs
Provides audio separation API compatible with the band-practice-webapp backend

IMPORTANT CONFIGURATION NOTES:
- ALWAYS use htdemucs_6s model (NEVER change to demucs, mdx_extra, or other models)
- User specifically requires 6-track separation: vocals, drums, bass, guitar, piano, other
- This model provides superior quality for band practice purposes
- Optimized for Railway 8GB CPU environment
"""

import os
import uuid
import json
import time
import shutil
import threading
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import subprocess
import librosa

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("python-dotenv not installed, using system environment variables only")

app = Flask(__name__)
CORS(app)

# Configure Flask for larger file uploads
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size

# Configuration
UPLOAD_FOLDER = Path('./uploads')
OUTPUT_FOLDER = Path('./separated')
TEMP_FOLDER = Path('./temp')
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {'mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'}

# Create directories
for folder in [UPLOAD_FOLDER, OUTPUT_FOLDER, TEMP_FOLDER]:
    folder.mkdir(exist_ok=True)

# Persistent job storage to survive service restarts
JOBS_FOLDER = Path('./jobs')
JOBS_FOLDER.mkdir(exist_ok=True)

# In-memory cache for performance
jobs = {}
jobs_lock = threading.Lock()

def save_job_to_disk(job_id, job_data):
    """Save job data to disk for persistence"""
    try:
        job_file = JOBS_FOLDER / f"{job_id}.json"
        with open(job_file, 'w') as f:
            json.dump(job_data, f)
        print(f"💾 Saved job {job_id} to disk")
    except Exception as e:
        print(f"❌ Failed to save job {job_id} to disk: {e}")

def load_job_from_disk(job_id):
    """Load job data from disk"""
    try:
        job_file = JOBS_FOLDER / f"{job_id}.json"
        if job_file.exists():
            with open(job_file, 'r') as f:
                job_data = json.load(f)
            print(f"📂 Loaded job {job_id} from disk")
            return job_data
    except Exception as e:
        print(f"❌ Failed to load job {job_id} from disk: {e}")
    return None

def load_all_jobs_from_disk():
    """Load all jobs from disk on startup"""
    try:
        loaded_count = 0
        processing_jobs = 0
        
        print(f"🔄 Loading jobs from disk at startup...")
        print(f"📁 Jobs folder: {JOBS_FOLDER}")
        print(f"📁 Jobs folder exists: {JOBS_FOLDER.exists()}")
        
        if not JOBS_FOLDER.exists():
            print(f"⚠️ Jobs folder doesn't exist, creating it...")
            JOBS_FOLDER.mkdir(exist_ok=True)
            return
            
        job_files = list(JOBS_FOLDER.glob("*.json"))
        print(f"📄 Found {len(job_files)} job files on disk")
        
        for job_file in job_files:
            job_id = job_file.stem
            print(f"📂 Loading job file: {job_file}")
            job_data = load_job_from_disk(job_id)
            if job_data:
                with jobs_lock:
                    jobs[job_id] = job_data
                loaded_count += 1
                
                # Check if job was processing when service stopped
                if job_data.get('status') == 'processing':
                    processing_jobs += 1
                    job_age_minutes = (time.time() - job_data.get('created_at', 0)) / 60
                    print(f"⚠️ Job {job_id} was processing when service restarted (progress: {job_data.get('progress', 0)}%, age: {job_age_minutes:.1f} minutes)")
                    
                    # Mark interrupted jobs as failed to avoid confusion
                    # Jobs older than 30 minutes that are still "processing" are likely stuck
                    if job_age_minutes > 30:
                        job_data['status'] = 'failed'
                        job_data['error'] = 'Processing interrupted by service restart (job was stuck)'
                        job_data['message'] = f'Job was stuck at {job_data.get("progress", 0)}% and interrupted by service restart'
                        job_data['completed_at'] = time.time()
                        
                        # Save the updated status back to disk
                        save_job_to_disk(job_id, job_data)
                        print(f"❌ Marked stuck job {job_id} as failed (was stuck for {job_age_minutes:.1f} minutes)")
                    else:
                        # Recent jobs might still be valid, mark as failed but with different message
                        job_data['status'] = 'failed'
                        job_data['error'] = 'Processing interrupted by service restart'
                        job_data['message'] = 'Job was interrupted when the service restarted'
                        job_data['completed_at'] = time.time()
                        
                        # Save the updated status back to disk
                        save_job_to_disk(job_id, job_data)
                        print(f"❌ Marked interrupted job {job_id} as failed")
                    
                print(f"✅ Loaded job {job_id}: {job_data.get('status', 'unknown')} ({job_data.get('progress', 0)}%)")
            else:
                print(f"❌ Failed to load job from {job_file}")
                
        print(f"🔄 Startup complete: Loaded {loaded_count} jobs from disk")
        if processing_jobs > 0:
            print(f"⚠️ Warning: {processing_jobs} jobs were interrupted by service restart")
            
    except Exception as e:
        print(f"❌ Failed to load jobs from disk: {e}")
        import traceback
        traceback.print_exc()

# Load existing jobs on startup
print(f"🚀 Starting audio processing service...")
load_all_jobs_from_disk()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_audio_duration(file_path):
    """Get audio duration in seconds using librosa with fallback methods"""
    try:
        # Method 1: Use librosa.get_duration (fastest)
        duration = librosa.get_duration(path=file_path)
        print(f"DEBUG: librosa.get_duration returned {duration} seconds ({duration/60:.2f} minutes)")
        
        # Sanity check: if duration seems unreasonable (>30 minutes), try alternative method
        if duration > 1800:  # More than 30 minutes
            print(f"WARNING: Duration {duration/60:.1f} minutes seems too long, trying alternative method...")
            
            # Method 2: Load audio and calculate duration from samples
            y, sr = librosa.load(file_path, sr=None)
            calculated_duration = len(y) / sr
            print(f"DEBUG: Calculated duration from samples: {calculated_duration} seconds ({calculated_duration/60:.2f} minutes)")
            
            # Use the shorter duration (more likely to be correct)
            if calculated_duration < duration:
                print(f"Using calculated duration {calculated_duration} instead of metadata duration {duration}")
                return calculated_duration
        
        return duration
    except Exception as e:
        print(f"Error getting duration with librosa: {e}")
        
        # Fallback: Try using ffprobe if available
        try:
            import subprocess
            result = subprocess.run([
                'ffprobe', '-v', 'quiet', '-show_entries', 'format=duration',
                '-of', 'csv=p=0', str(file_path)
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                duration = float(result.stdout.strip())
                print(f"DEBUG: ffprobe returned duration: {duration} seconds ({duration/60:.2f} minutes)")
                return duration
        except Exception as ffprobe_error:
            print(f"ffprobe fallback failed: {ffprobe_error}")
        
        # Last resort: return a default duration
        print("WARNING: Could not determine audio duration, using default 180 seconds")
        return 180  # 3 minutes default

def detect_bpm(file_path):
    """Detect BPM using librosa with fallback methods"""
    try:
        # Load only first 30 seconds for faster processing
        y, sr = librosa.load(file_path, duration=30)
        
        # Method 1: Simple beat tracking (most reliable)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr, hop_length=512, trim=False)
        if tempo > 0:
            return int(tempo)
            
    except Exception as e:
        print(f"Primary BPM detection failed: {e}")
    
    try:
        # Method 2: Onset-based tempo estimation
        y, sr = librosa.load(file_path, duration=30)
        onset_envelope = librosa.onset.onset_strength(y=y, sr=sr, hop_length=512)
        
        # Try different tempo estimation methods
        try:
            # New librosa API (>= 0.10.0)
            if hasattr(librosa.feature, 'rhythm') and hasattr(librosa.feature.rhythm, 'tempo'):
                tempo = librosa.feature.rhythm.tempo(onset_envelope=onset_envelope, sr=sr, hop_length=512)[0]
            else:
                # Old librosa API (< 0.10.0)
                tempo = librosa.beat.tempo(onset_envelope=onset_envelope, sr=sr, hop_length=512)[0]
                
            if tempo > 0:
                return int(tempo)
        except Exception as e2:
            print(f"Onset-based BPM detection failed: {e2}")
            
    except Exception as e:
        print(f"Secondary BPM detection failed: {e}")
    
    # If all methods fail, return None (BPM detection is optional)
    print("BPM detection failed, continuing without BPM")
    return None

def update_progress(job_id, progress, message=None):
    """Helper function to update job progress with persistence"""
    with jobs_lock:
        if job_id in jobs:
            jobs[job_id]['progress'] = progress
            if message:
                jobs[job_id]['message'] = message
            # Save updated progress to disk
            save_job_to_disk(job_id, jobs[job_id])
        else:
            print(f"⚠️ Tried to update progress for non-existent job: {job_id}")

def separate_audio(job_id, input_file):
    """Separate audio using Demucs in a background thread"""
    try:
        update_progress(job_id, 5, "Initializing...")
        
        with jobs_lock:
            jobs[job_id]['status'] = 'processing'
        
        # Create output directory for this job
        job_output_dir = OUTPUT_FOLDER / job_id
        job_output_dir.mkdir(exist_ok=True)
        
        update_progress(job_id, 10, "Analyzing audio file...")
        
        # Get audio duration to estimate processing time
        duration = get_audio_duration(input_file)
        # Rough estimate: 6-stem model takes about 0.3-0.5x the audio duration
        estimated_processing_time = max(duration * 0.4, 30)  # At least 30 seconds
        
        update_progress(job_id, 15, "Preparing separation...")
        
        # IMPORTANT: NEVER CHANGE THE MODEL FROM htdemucs_6s
        # User specifically wants 6-track separation (vocals, drums, bass, guitar, piano, other)
        # This model provides superior quality for band practice purposes
        # 
        # Run Demucs separation with htdemucs_6s model optimized for Railway 8GB environment
        cmd = [
            'python', '-m', 'demucs.separate',
            '--mp3',  # Output as MP3
            '--mp3-bitrate', '128',  # Balanced quality/speed for 6-stem model
            '-n', 'htdemucs_6s',  # REQUIRED: 6-stem model (vocals, drums, bass, guitar, piano, other)
            '--device', 'cpu',  # Force CPU mode (Railway doesn't have GPU)
            '-o', str(job_output_dir),
            str(input_file)
        ]
        
        print(f"Running Demucs command: {' '.join(cmd)}")
        update_progress(job_id, 20, "Starting audio separation...")
        
        # Set memory limits for the process (conservative for Railway)
        import resource
        def set_memory_limit():
            try:
                # Limit memory to 4GB to leave plenty of headroom
                resource.setrlimit(resource.RLIMIT_AS, (4 * 1024 * 1024 * 1024, 4 * 1024 * 1024 * 1024))
            except (OSError, ValueError) as e:
                # Skip memory limits on systems where it's not supported (like macOS in some cases)
                print(f"⚠️ Could not set memory limits: {e}")
                pass
        
        # Set environment variables for minimal CPU usage
        import os
        env = os.environ.copy()
        env.update({
            'OMP_NUM_THREADS': '1',  # Single thread for stability
            'MKL_NUM_THREADS': '1',  # Intel MKL threads
            'NUMBA_NUM_THREADS': '1',  # Numba threads
            'PYTORCH_NUM_THREADS': '1',  # PyTorch CPU threads
            'MALLOC_TRIM_THRESHOLD_': '0',  # Reduce memory fragmentation
        })
        
        # Start the process with optimized settings
        try:
            # Skip preexec_fn on macOS development to avoid "Exception occurred in preexec_fn" error
            import platform
            use_preexec_fn = platform.system() != 'Darwin' or os.environ.get('NODE_ENV') == 'production'
            
            if use_preexec_fn:
                process = subprocess.Popen(
                    cmd, 
                    stdout=subprocess.PIPE, 
                    stderr=subprocess.PIPE, 
                    text=True,
                    preexec_fn=set_memory_limit,
                    env=env
                )
            else:
                print("⚠️ Skipping memory limits on macOS development environment")
                process = subprocess.Popen(
                    cmd, 
                    stdout=subprocess.PIPE, 
                    stderr=subprocess.PIPE, 
                    text=True,
                    env=env
                )
        except Exception as e:
            print(f"Failed to start Demucs process: {e}")
            raise Exception(f"Demucs initialization failed: {e}")
        
        # Monitor progress with time-based estimation
        start_time = time.time()
        
        # Progress simulation based on estimated time
        def simulate_progress():
            while process.poll() is None:  # While process is running
                elapsed = time.time() - start_time
                # Progress from 20% to 85% based on estimated time
                progress_range = 85 - 20
                time_progress = min(elapsed / estimated_processing_time, 1.0)
                current_progress = 20 + (progress_range * time_progress)
                
                # Add some realistic stages for 4-stem model
                if current_progress < 30:
                    message = "Loading lightweight model..."
                elif current_progress < 50:
                    message = "Separating vocals..."
                elif current_progress < 65:
                    message = "Separating drums..."
                elif current_progress < 80:
                    message = "Separating bass..."
                else:
                    message = "Finalizing separation..."
                
                update_progress(job_id, int(current_progress), message)
                time.sleep(10)  # Update every 10 seconds
        
        # Start progress monitoring in a separate thread
        progress_thread = threading.Thread(target=simulate_progress)
        progress_thread.daemon = True
        progress_thread.start()
        
        # Wait for the process to complete
        # htdemucs_6s model takes longer but provides superior 6-track separation
        # Timeout based on audio duration: ~2-3 minutes per minute of audio
        duration_minutes = duration / 60
        timeout_seconds = max(duration * 180, 600)  # 3 minutes per audio minute, minimum 10 minutes
        timeout_minutes = timeout_seconds / 60
        print(f"DEBUG: Audio duration: {duration:.1f} seconds ({duration_minutes:.2f} minutes)")
        print(f"DEBUG: Setting timeout to {timeout_seconds:.1f} seconds ({timeout_minutes:.1f} minutes) for htdemucs_6s")
        
        # Safety check: if timeout is unreasonably long, cap it
        if timeout_seconds > 3600:  # More than 1 hour
            print(f"WARNING: Timeout {timeout_minutes:.1f} minutes seems too long, capping at 30 minutes")
            timeout_seconds = 1800  # 30 minutes max
        
        try:
            stdout, stderr = process.communicate(timeout=timeout_seconds)
        except subprocess.TimeoutExpired:
            print(f"ERROR: htdemucs_6s processing timed out after {timeout_seconds} seconds")
            process.kill()
            stdout, stderr = process.communicate()
            raise Exception(f"Audio separation timed out after {timeout_seconds} seconds. The htdemucs_6s model requires significant processing time for high-quality 6-track separation.")
        
        if process.returncode != 0:
            raise Exception(f"Demucs failed: {stderr}")
        
        update_progress(job_id, 85, "Processing completed, organizing files...")
        
        # Find the separated files
        # IMPORTANT: htdemucs_6s model creates: job_output_dir/htdemucs_6s/{filename_without_ext}/{track}.mp3
        input_name = Path(input_file).stem
        separated_dir = job_output_dir / 'htdemucs_6s' / input_name
        
        # Debug: Check what Demucs actually created
        print(f"Looking for separated files in: {separated_dir}")
        if job_output_dir.exists():
            print(f"Contents of {job_output_dir}:")
            for item in job_output_dir.rglob('*'):
                print(f"  {item}")
        
        # If the expected directory doesn't exist, try to find the actual directory
        if not separated_dir.exists():
            htdemucs_dir = job_output_dir / 'htdemucs_6s'
            if htdemucs_dir.exists():
                # Find the first subdirectory (should be the separated tracks)
                subdirs = [d for d in htdemucs_dir.iterdir() if d.is_dir()]
                if subdirs:
                    separated_dir = subdirs[0]
                    print(f"Using actual separated directory: {separated_dir}")
                else:
                    print(f"No subdirectories found in {htdemucs_dir}")
            else:
                print(f"htdemucs_6s directory not found in {job_output_dir}")
                # Try to find any model directory that exists
                for possible_dir in ['htdemucs_6s', 'htdemucs', 'mdx_extra', 'demucs']:
                    test_dir = job_output_dir / possible_dir
                    if test_dir.exists():
                        print(f"Found alternative directory: {test_dir}")
                        subdirs = [d for d in test_dir.iterdir() if d.is_dir()]
                        if subdirs:
                            separated_dir = subdirs[0]
                            print(f"Using alternative separated directory: {separated_dir}")
                            break
        
        if not separated_dir.exists():
            raise Exception(f"Separated files not found at {separated_dir}")
        
        # IMPORTANT: Map Demucs htdemucs_6s output to our expected format
        # NEVER CHANGE: User specifically wants all 6 tracks for band practice
        # htdemucs_6s provides: vocals, drums, bass, guitar, piano, other
        track_mapping = {
            'vocals.mp3': 'vocals',    # Lead and backing vocals
            'drums.mp3': 'drums',      # Full drum kit
            'bass.mp3': 'bass',        # Bass guitar/synth bass
            'guitar.mp3': 'guitar',    # Electric/acoustic guitars
            'piano.mp3': 'piano',      # Piano/keyboard parts
            'other.mp3': 'other'       # Strings, horns, synths, etc.
        }
        
        tracks = {}
        for demucs_file, track_name in track_mapping.items():
            track_file = separated_dir / demucs_file
            if track_file.exists():
                # Create a URL that points to the backend proxy (which will proxy to this service)
                # This URL will be sent to the frontend, so it MUST be HTTPS to avoid mixed content issues
                backend_url = os.getenv('BACKEND_URL', 'http://localhost:3001')
                
                # Ensure the frontend gets HTTPS URLs to avoid mixed content blocking
                if 'railway.app' in backend_url and backend_url.startswith('http://'):
                    # Convert to HTTPS for frontend consumption (mixed content security)
                    backend_url = backend_url.replace('http://', 'https://')
                    print(f"DEBUG: Railway detected, converting to HTTPS for frontend: {backend_url}")
                
                print(f"DEBUG: Using backend_url: {backend_url} (from env: {os.getenv('BACKEND_URL')})")
                tracks[track_name] = f"{backend_url}/api/tracks/{job_id}/{demucs_file}"
                print(f"DEBUG: Generated track URL: {tracks[track_name]}")
        
        update_progress(job_id, 90, "Detecting BPM...")
        
        # Detect BPM from original file
        bpm = detect_bpm(input_file)
        
        update_progress(job_id, 95, "Finalizing...")
        
        # Complete the job with persistent storage
        job_update = {
            'status': 'completed',
            'progress': 100,
            'tracks': tracks,
            'bpm': bpm,
            'duration': duration,
            'completed_at': time.time(),
            'message': 'Separation completed successfully!'
        }
        
        with jobs_lock:
            jobs[job_id].update(job_update)
            # Save completed job to disk
            save_job_to_disk(job_id, jobs[job_id])
        
        print(f"✅ Job {job_id} completed successfully and saved to disk")
        
    except subprocess.TimeoutExpired:
        job_update = {
            'status': 'failed',
            'error': 'Processing timeout - file may be too large or complex',
            'message': 'Processing timed out',
            'completed_at': time.time()
        }
        with jobs_lock:
            jobs[job_id].update(job_update)
            save_job_to_disk(job_id, jobs[job_id])
        print(f"❌ Job {job_id} timed out and saved to disk")
        
    except Exception as e:
        job_update = {
            'status': 'failed',
            'error': str(e),
            'message': f'Processing failed: {str(e)}',
            'completed_at': time.time()
        }
        with jobs_lock:
            jobs[job_id].update(job_update)
            save_job_to_disk(job_id, jobs[job_id])
        print(f"❌ Job {job_id} failed: {e} and saved to disk")

@app.route('/api/process', methods=['POST'])
def process_audio():
    """Start audio processing job"""
    try:
        # Debug: Print all received data
        print(f"📥 Received request:")
        print(f"   Content-Type: {request.content_type}")
        print(f"   Files: {list(request.files.keys())}")
        print(f"   Form data: {list(request.form.keys())}")
        
        # Check if file is present
        if 'audio_file' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        file = request.files['audio_file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': f'File type not supported. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'}), 400
        
        # Generate job ID
        job_id = str(uuid.uuid4())
        print(f"🆔 Generated job ID: {job_id}")
        
        # Save uploaded file
        filename = secure_filename(file.filename)
        file_path = UPLOAD_FOLDER / f"{job_id}_{filename}"
        file.save(file_path)
        print(f"💾 Saved file: {file_path} ({file_path.stat().st_size} bytes)")
        
        # Check file size
        if file_path.stat().st_size > MAX_FILE_SIZE:
            file_path.unlink()  # Delete the file
            return jsonify({'error': 'File too large. Maximum size: 50MB'}), 400
        
        # Create job entry with persistent storage
        job_data = {
            'jobId': job_id,
            'status': 'pending',
            'progress': 0,
            'created_at': time.time(),
            'filename': filename
        }
        
        with jobs_lock:
            jobs[job_id] = job_data
            print(f"✅ Job created in memory: {job_id}")
            print(f"📊 Total jobs in memory: {len(jobs)}")
        
        # Save to disk for persistence
        save_job_to_disk(job_id, job_data)
        
        # Start processing in background thread
        thread = threading.Thread(target=separate_audio, args=(job_id, file_path))
        thread.daemon = True
        thread.start()
        print(f"🚀 Started background processing thread for job {job_id}")
        
        return jsonify({'jobId': job_id}), 200
        
    except Exception as e:
        print(f"Error in process_audio: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/process/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """Get job status and results"""
    try:
        print(f"🔍 JOB STATUS REQUEST: job_id={job_id}")
        
        with jobs_lock:
            job = jobs.get(job_id)
            total_jobs = len(jobs)
            all_job_ids = list(jobs.keys())
        
        print(f"📊 Current jobs in memory: {total_jobs}")
        print(f"📋 All job IDs: {all_job_ids}")
        
        # If not in memory, try loading from disk
        if not job:
            print(f"⚠️ Job {job_id} not found in memory, checking disk...")
            job = load_job_from_disk(job_id)
            if job:
                # Add back to memory cache
                with jobs_lock:
                    jobs[job_id] = job
                print(f"✅ Job {job_id} recovered from disk and added to memory")
                
                # If job was processing, it might have been interrupted by restart
                # Check if we need to resume or mark as failed
                if job.get('status') == 'processing':
                    print(f"⚠️ Job {job_id} was processing when service restarted")
                    # For now, let's return the job as-is, but we could implement resume logic
                    
            else:
                print(f"❌ Job {job_id} not found on disk either")
                # List available jobs on disk for debugging
                disk_jobs = []
                try:
                    for job_file in JOBS_FOLDER.glob("*.json"):
                        disk_jobs.append(job_file.stem)
                except Exception as e:
                    print(f"Error listing disk jobs: {e}")
                
                return jsonify({
                    'error': 'Job not found',
                    'jobId': job_id,
                    'availableJobs': all_job_ids,
                    'availableDiskJobs': disk_jobs,
                    'totalJobs': total_jobs,
                    'message': 'Job not found in memory or disk storage'
                }), 404
        
        # Return job status in the format expected by the backend
        response = {
            'jobId': job_id,
            'status': job['status'],
            'progress': job['progress']
        }
        
        # Include progress message if available
        if 'message' in job:
            response['message'] = job['message']
        
        if job['status'] == 'completed':
            response.update({
                'tracks': job.get('tracks', {}),
                'bpm': job.get('bpm'),
                'duration': job.get('duration')
            })
        elif job['status'] == 'failed':
            response['error'] = job.get('error', 'Unknown error')
        
        return jsonify(response), 200
        
    except Exception as e:
        print(f"Error in get_job_status: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/tracks/<job_id>/<filename>', methods=['GET'])
def serve_track(job_id, filename):
    """Serve separated track files"""
    try:
        # Security: ensure filename is safe
        filename = secure_filename(filename)
        
        # Try to find the track file even without job metadata
        # Check multiple possible model directories
        track_file = None
        for model_dir in ['htdemucs_6s', 'htdemucs', 'mdx_extra', 'demucs']:
            model_path = OUTPUT_FOLDER / job_id / model_dir
            if model_path.exists():
                # Search recursively for the filename
                for file_path in model_path.rglob(filename):
                    if file_path.is_file():
                        track_file = file_path
                        break
                if track_file:
                    break
        
        if not track_file:
            print(f"Track file '{filename}' not found for job '{job_id}'")
            
            # List what actually exists for debugging
            job_dir = OUTPUT_FOLDER / job_id
            if job_dir.exists():
                print(f"Contents of {job_dir}:")
                for item in job_dir.rglob('*'):
                    print(f"  {item}")
            else:
                print(f"Job directory {job_dir} does not exist")
            
            return jsonify({'error': 'Track file not found'}), 404
        
        print(f"Serving track file: {track_file}")
        return send_file(track_file, as_attachment=False)
        
    except Exception as e:
        print(f"Error serving track: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    with jobs_lock:
        total_jobs = len(jobs)
        job_statuses = {}
        for job_id, job in jobs.items():
            job_statuses[job_id] = {
                'status': job.get('status', 'unknown'),
                'progress': job.get('progress', 0),
                'created_at': job.get('created_at', 0)
            }
    
    return jsonify({
        'status': 'healthy',
        'service': 'audio-processing-service',
        'version': '1.0.0',
        'demucs_available': True,
        'model': 'htdemucs_6s',
        'total_jobs': total_jobs,
        'jobs': job_statuses,
        'uptime': time.time()
    }), 200

@app.route('/api/jobs', methods=['GET'])
def list_jobs():
    """List all jobs (for debugging)"""
    with jobs_lock:
        memory_jobs = dict(jobs)
    
    # Also check disk storage
    disk_jobs = {}
    try:
        for job_file in JOBS_FOLDER.glob("*.json"):
            job_id = job_file.stem
            job_data = load_job_from_disk(job_id)
            if job_data:
                disk_jobs[job_id] = job_data
    except Exception as e:
        print(f"Error reading disk jobs: {e}")
    
    return jsonify({
        'memory_jobs': list(memory_jobs.values()),
        'disk_jobs': list(disk_jobs.values()),
        'memory_count': len(memory_jobs),
        'disk_count': len(disk_jobs),
        'jobs_folder': str(JOBS_FOLDER),
        'jobs_folder_exists': JOBS_FOLDER.exists()
    }), 200

@app.route('/api/debug/storage', methods=['GET'])
def debug_storage():
    """Debug endpoint to check storage status"""
    try:
        # Check folders
        folders_status = {
            'jobs_folder': {
                'path': str(JOBS_FOLDER),
                'exists': JOBS_FOLDER.exists(),
                'files': []
            },
            'upload_folder': {
                'path': str(UPLOAD_FOLDER),
                'exists': UPLOAD_FOLDER.exists(),
                'files': []
            },
            'output_folder': {
                'path': str(OUTPUT_FOLDER),
                'exists': OUTPUT_FOLDER.exists(),
                'files': []
            }
        }
        
        # List files in each folder
        for folder_name, folder_info in folders_status.items():
            if folder_info['exists']:
                folder_path = Path(folder_info['path'])
                try:
                    folder_info['files'] = [f.name for f in folder_path.iterdir()]
                except Exception as e:
                    folder_info['error'] = str(e)
        
        with jobs_lock:
            memory_jobs_count = len(jobs)
            memory_job_ids = list(jobs.keys())
        
        return jsonify({
            'folders': folders_status,
            'memory_jobs': {
                'count': memory_jobs_count,
                'job_ids': memory_job_ids
            },
            'timestamp': time.time()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/debug/job/<job_id>', methods=['GET'])
def debug_single_job(job_id):
    """Debug endpoint to check a specific job in both memory and disk"""
    try:
        # Check memory
        with jobs_lock:
            memory_job = jobs.get(job_id)
        
        # Check disk
        disk_job = load_job_from_disk(job_id)
        
        # Check if job files exist
        job_file_path = JOBS_FOLDER / f"{job_id}.json"
        
        return jsonify({
            'job_id': job_id,
            'memory': {
                'exists': memory_job is not None,
                'data': memory_job
            },
            'disk': {
                'exists': disk_job is not None,
                'data': disk_job,
                'file_path': str(job_file_path),
                'file_exists': job_file_path.exists()
            },
            'timestamp': time.time()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/recovery/reload-jobs', methods=['POST'])
def reload_jobs_from_disk():
    """Manually reload all jobs from disk (recovery endpoint)"""
    try:
        # Clear current memory
        with jobs_lock:
            old_count = len(jobs)
            jobs.clear()
        
        # Reload from disk
        load_all_jobs_from_disk()
        
        with jobs_lock:
            new_count = len(jobs)
        
        return jsonify({
            'message': 'Jobs reloaded from disk',
            'old_memory_count': old_count,
            'new_memory_count': new_count,
            'timestamp': time.time()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/cache/clear', methods=['POST'])
def clear_cache():
    """Clear all cached audio files and jobs"""
    try:
        cleared_jobs = 0
        cleared_files = 0
        
        # Get list of all job IDs before clearing
        with jobs_lock:
            job_ids = list(jobs.keys())
            jobs.clear()  # Clear all jobs from memory
        
        # Remove all files from upload and output folders
        for folder in [UPLOAD_FOLDER, OUTPUT_FOLDER, TEMP_FOLDER]:
            if folder.exists():
                for item in folder.iterdir():
                    try:
                        if item.is_file():
                            item.unlink()
                            cleared_files += 1
                        elif item.is_dir():
                            shutil.rmtree(item)
                            cleared_files += 1
                    except Exception as e:
                        print(f"Error removing {item}: {e}")
        
        cleared_jobs = len(job_ids)
        
        print(f"🧹 Cache cleared: {cleared_jobs} jobs, {cleared_files} files/folders removed")
        
        return jsonify({
            'message': 'Cache cleared successfully',
            'cleared_jobs': cleared_jobs,
            'cleared_files': cleared_files,
            'timestamp': time.time()
        }), 200
        
    except Exception as e:
        print(f"Error clearing cache: {e}")
        return jsonify({'error': 'Failed to clear cache'}), 500

@app.route('/api/cache/clear-temp', methods=['POST'])
def clear_temp_cache():
    """Clear only temporary files"""
    try:
        cleared_files = 0
        
        # Remove all files from temp folder only
        if TEMP_FOLDER.exists():
            for item in TEMP_FOLDER.iterdir():
                try:
                    if item.is_file():
                        item.unlink()
                        cleared_files += 1
                    elif item.is_dir():
                        shutil.rmtree(item)
                        cleared_files += 1
                except Exception as e:
                    print(f"Error removing temp file {item}: {e}")
        
        print(f"🧹 Temp cache cleared: {cleared_files} files/folders removed from temp")
        
        return jsonify({
            'message': 'Temp cache cleared successfully',
            'cleared_files': cleared_files,
            'folder': str(TEMP_FOLDER),
            'timestamp': time.time()
        }), 200
        
    except Exception as e:
        print(f"Error clearing temp cache: {e}")
        return jsonify({'error': 'Failed to clear temp cache'}), 500

@app.route('/api/cache/clear-disk-jobs', methods=['POST'])
def clear_disk_jobs():
    """Clear only the disk job files (JSON files in jobs folder)"""
    try:
        print("🗑️ Clearing disk job files...")
        
        cleared_jobs = 0
        
        # Clear jobs from memory first
        with jobs_lock:
            memory_jobs = len(jobs)
            jobs.clear()
        
        # Clear job persistence files
        if JOBS_FOLDER.exists():
            job_files = list(JOBS_FOLDER.glob("*.json"))
            print(f"📄 Found {len(job_files)} job files to delete")
            
            for job_file in job_files:
                try:
                    print(f"🗑️ Deleting: {job_file}")
                    job_file.unlink()
                    cleared_jobs += 1
                except Exception as e:
                    print(f"❌ Error removing job file {job_file}: {e}")
        else:
            print(f"📁 Jobs folder {JOBS_FOLDER} does not exist")
        
        print(f"✅ Cleared {cleared_jobs} disk job files, {memory_jobs} memory jobs")
        
        return jsonify({
            'message': 'Disk job files cleared successfully',
            'cleared_disk_jobs': cleared_jobs,
            'cleared_memory_jobs': memory_jobs,
            'jobs_folder': str(JOBS_FOLDER),
            'timestamp': time.time()
        }), 200
        
    except Exception as e:
        print(f"❌ Error clearing disk jobs: {e}")
        return jsonify({
            'error': 'Failed to clear disk jobs',
            'details': str(e)
        }), 500

@app.route('/api/cache/status', methods=['GET'])
def cache_status():
    """Get cache status information"""
    try:
        # Count jobs
        with jobs_lock:
            total_jobs = len(jobs)
            completed_jobs = sum(1 for job in jobs.values() if job.get('status') == 'completed')
            failed_jobs = sum(1 for job in jobs.values() if job.get('status') == 'failed')
            processing_jobs = sum(1 for job in jobs.values() if job.get('status') in ['pending', 'processing'])
        
        # Count files by folder
        folder_stats = {}
        total_files = 0
        total_size = 0
        
        for folder in [UPLOAD_FOLDER, OUTPUT_FOLDER, TEMP_FOLDER]:
            folder_files = 0
            folder_size = 0
            
            if folder.exists():
                for item in folder.rglob('*'):
                    if item.is_file():
                        folder_files += 1
                        file_size = item.stat().st_size
                        folder_size += file_size
                        total_files += 1
                        total_size += file_size
            
            folder_stats[folder.name] = {
                'files': folder_files,
                'size_mb': round(folder_size / (1024 * 1024), 2)
            }
        
        # Convert total size to MB
        total_size_mb = total_size / (1024 * 1024)
        
        return jsonify({
            'jobs': {
                'total': total_jobs,
                'completed': completed_jobs,
                'failed': failed_jobs,
                'processing': processing_jobs
            },
            'files': {
                'total_files': total_files,
                'total_size_mb': round(total_size_mb, 2)
            },
            'folders': {
                'uploads': str(UPLOAD_FOLDER),
                'separated': str(OUTPUT_FOLDER),
                'temp': str(TEMP_FOLDER)
            },
            'folder_stats': folder_stats
        }), 200
        
    except Exception as e:
        print(f"Error getting cache status: {e}")
        return jsonify({'error': 'Failed to get cache status'}), 500

# Cleanup old files periodically
def cleanup_old_files():
    """Clean up files older than 24 hours"""
    try:
        cutoff_time = time.time() - (24 * 60 * 60)  # 24 hours ago
        
        with jobs_lock:
            jobs_to_remove = []
            for job_id, job in jobs.items():
                if job.get('created_at', 0) < cutoff_time:
                    jobs_to_remove.append(job_id)
        
        for job_id in jobs_to_remove:
            # Remove files
            for folder in [UPLOAD_FOLDER, OUTPUT_FOLDER]:
                for file_path in folder.glob(f"{job_id}*"):
                    if file_path.is_file():
                        file_path.unlink()
                    elif file_path.is_dir():
                        shutil.rmtree(file_path)
            
            # Remove job from memory
            with jobs_lock:
                jobs.pop(job_id, None)
        
        if jobs_to_remove:
            print(f"Cleaned up {len(jobs_to_remove)} old jobs")
            
    except Exception as e:
        print(f"Error in cleanup: {e}")

# Schedule cleanup every hour
def schedule_cleanup():
    cleanup_old_files()
    threading.Timer(3600, schedule_cleanup).start()  # Run every hour

def create_app():
    """Application factory for production deployment"""
    print("🚀 Starting Audio Processing Service with Demucs...")
    print("🔧 htdemucs_6s model configured for 6-track separation")
    print("⚡ Running in production mode with Gunicorn")
    
    # Load jobs from disk on worker startup
    print("📂 Loading existing jobs from disk...")
    load_all_jobs_from_disk()
    
    # Start cleanup scheduler
    schedule_cleanup()
    
    return app

# Gunicorn worker lifecycle hooks are now defined in gunicorn.conf.py

if __name__ == '__main__':
    # Development server (only used locally)
    print("⚠️ WARNING: Running development server. Use Gunicorn for production.")
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
else:
    # Production: Initialize when imported by Gunicorn
    create_app()