#!/usr/bin/env python3
"""
Local Audio Processing Service using Demucs
Provides audio separation API compatible with the band-practice-webapp backend
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

# Job storage (in production, use a database)
jobs = {}
jobs_lock = threading.Lock()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_audio_duration(file_path):
    """Get audio duration in seconds using librosa"""
    try:
        duration = librosa.get_duration(path=file_path)
        return duration
    except Exception as e:
        print(f"Error getting duration: {e}")
        return 0

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
    """Helper function to update job progress"""
    with jobs_lock:
        jobs[job_id]['progress'] = progress
        if message:
            jobs[job_id]['message'] = message

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
        
        # Run Demucs separation optimized for Railway CPU environment
        # Use the lightweight mdx_extra model instead of htdemucs_6s
        cmd = [
            'python', '-m', 'demucs.separate',
            '--mp3',  # Output as MP3
            '--mp3-bitrate', '196',  # Conservative bitrate for stability
            '-n', 'htdemucs_6s',  # Use lighter 4-stem model (vocals, drums, bass, other)
            '--device', 'cpu',  # Force CPU mode
            '-o', str(job_output_dir),
            str(input_file)
        ]
        
        print(f"Running Demucs command: {' '.join(cmd)}")
        update_progress(job_id, 20, "Starting audio separation...")
        
        # Set memory limits for the process (conservative for Railway)
        import resource
        def set_memory_limit():
            # Limit memory to 4GB to leave plenty of headroom
            resource.setrlimit(resource.RLIMIT_AS, (4 * 1024 * 1024 * 1024, 4 * 1024 * 1024 * 1024))
        
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
            process = subprocess.Popen(
                cmd, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE, 
                text=True,
                preexec_fn=set_memory_limit,
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
                time.sleep(2)  # Update every 2 seconds
        
        # Start progress monitoring in a separate thread
        progress_thread = threading.Thread(target=simulate_progress)
        progress_thread.daemon = True
        progress_thread.start()
        
        # Wait for the process to complete
        stdout, stderr = process.communicate(timeout=600)  # 10 minute timeout
        
        if process.returncode != 0:
            raise Exception(f"Demucs failed: {stderr}")
        
        update_progress(job_id, 85, "Processing completed, organizing files...")
        
        # Find the separated files
        # Demucs creates: job_output_dir/htdemucs_6s/{filename_without_ext}/{track}.mp3
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
        
        # Map Demucs output to our expected format (6-stem model)
        track_mapping = {
            'vocals.mp3': 'vocals',
            'drums.mp3': 'drums', 
            'bass.mp3': 'bass',
            'guitar.mp3': 'guitar',
            'piano.mp3': 'piano',
            'other.mp3': 'other'
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
        
        # Complete the job
        with jobs_lock:
            jobs[job_id].update({
                'status': 'completed',
                'progress': 100,
                'tracks': tracks,
                'bpm': bpm,
                'duration': duration,
                'completed_at': time.time(),
                'message': 'Separation completed successfully!'
            })
        
        print(f"Job {job_id} completed successfully")
        
    except subprocess.TimeoutExpired:
        with jobs_lock:
            jobs[job_id].update({
                'status': 'failed',
                'error': 'Processing timeout - file may be too large or complex',
                'message': 'Processing timed out',
                'completed_at': time.time()
            })
        print(f"Job {job_id} timed out")
        
    except Exception as e:
        with jobs_lock:
            jobs[job_id].update({
                'status': 'failed',
                'error': str(e),
                'message': f'Processing failed: {str(e)}',
                'completed_at': time.time()
            })
        print(f"Job {job_id} failed: {e}")

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
        
        # Save uploaded file
        filename = secure_filename(file.filename)
        file_path = UPLOAD_FOLDER / f"{job_id}_{filename}"
        file.save(file_path)
        
        # Check file size
        if file_path.stat().st_size > MAX_FILE_SIZE:
            file_path.unlink()  # Delete the file
            return jsonify({'error': 'File too large. Maximum size: 50MB'}), 400
        
        # Create job entry
        with jobs_lock:
            jobs[job_id] = {
                'jobId': job_id,
                'status': 'pending',
                'progress': 0,
                'created_at': time.time(),
                'filename': filename
            }
        
        # Start processing in background thread
        thread = threading.Thread(target=separate_audio, args=(job_id, file_path))
        thread.daemon = True
        thread.start()
        
        return jsonify({'jobId': job_id}), 200
        
    except Exception as e:
        print(f"Error in process_audio: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/process/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """Get job status and results"""
    try:
        with jobs_lock:
            job = jobs.get(job_id)
        
        if not job:
            return jsonify({'error': 'Job not found'}), 404
        
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
    return jsonify({
        'status': 'healthy',
        'service': 'audio-processing-service',
        'version': '1.0.0',
        'demucs_available': True
    }), 200

@app.route('/api/jobs', methods=['GET'])
def list_jobs():
    """List all jobs (for debugging)"""
    with jobs_lock:
        return jsonify(list(jobs.values())), 200

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

if __name__ == '__main__':
    print("Starting Audio Processing Service with Demucs...")
    print("Make sure you have Demucs installed: pip install demucs")
    
    # Start cleanup scheduler
    schedule_cleanup()
    
    # Run the Flask app
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)