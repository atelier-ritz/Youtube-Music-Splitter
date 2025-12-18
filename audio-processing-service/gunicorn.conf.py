# Gunicorn configuration for Railway production deployment
import os

# Server socket
bind = f"0.0.0.0:{os.environ.get('PORT', 5000)}"
backlog = 2048

# Worker processes
workers = 1  # Single worker for Railway 8GB instance (Demucs is memory-intensive)
worker_class = "sync"
worker_connections = 1000
timeout = 1800  # 30 minutes timeout for long Demucs processing
keepalive = 2

# Restart workers after this many requests, to help control memory usage
max_requests = 10
max_requests_jitter = 5

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