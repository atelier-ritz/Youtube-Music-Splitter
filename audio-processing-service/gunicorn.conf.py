# Gunicorn configuration for Railway production deployment
import os

# Server socket
bind = f"0.0.0.0:{os.environ.get('PORT', 5001)}"
backlog = 2048

# Worker processes
workers = 1  # Single worker for Railway 8GB instance (Demucs is memory-intensive)
worker_class = "sync"
worker_connections = 1000
timeout = 1800  # 30 minutes timeout for long Demucs processing
keepalive = 2

# Restart workers after this many requests, to help control memory usage
# IMPORTANT: Set very high values to avoid killing long-running audio processing jobs
max_requests = 0  # Disable automatic worker restarts (0 = never restart)
max_requests_jitter = 0  # No jitter needed since restarts are disabled

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "audio-processing-service"

# Server mechanics
preload_app = True
daemon = False
pidfile = None
user = None
group = None
tmp_upload_dir = None

# SSL (Railway handles this)
keyfile = None
certfile = None

# Memory and performance
worker_tmp_dir = "/dev/shm"  # Use shared memory for better performance

# Graceful worker shutdown - extended for long audio processing
graceful_timeout = 300  # Give workers 5 minutes to finish current requests
worker_abort_timeout = 600  # Force kill workers after 10 minutes (for very long jobs)

# Worker lifecycle logging (inline functions)
def on_starting(server):
    """Called just before the master process is initialized."""
    print("🔄 Gunicorn master process starting...")

def on_reload(server):
    """Called to recycle workers during a reload via SIGHUP."""
    print("🔄 Gunicorn reloading workers...")

def worker_int(worker):
    """Called just after a worker exited on SIGINT or SIGQUIT."""
    print(f"⚠️ Gunicorn worker {worker.pid} interrupted - jobs may be affected")

def post_worker_init(worker):
    """Called just after a worker has been forked."""
    print(f"👷 Gunicorn worker {worker.pid} initialized")