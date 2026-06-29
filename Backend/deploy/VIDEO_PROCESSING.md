# Async Video Processing (Celery + Redis)

Property and advertisement video uploads are stored on S3 immediately. FFmpeg compression, thumbnail generation, and S3 replacement run in a Celery worker so create APIs return in ~1–2 seconds.

## 1. Install Redis (Ubuntu EC2)

```bash
sudo apt update
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping   # expect PONG
```

## 2. Install Python dependencies

```bash
cd /home/ubuntu/Property-Buylands/Backend
source venv/bin/activate
pip install -r requirements.txt
```

Adds: `celery`, `redis`, `django-storages`, `boto3`.

## 3. Environment variables

Add to `Backend/.env`:

```env
CELERY_BROKER_URL=redis://127.0.0.1:6379/0
CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/0
FFMPEG_BINARY=/usr/bin/ffmpeg
FFPROBE_BINARY=/usr/bin/ffprobe
```

Ensure existing AWS S3 variables remain set (`AWS_STORAGE_BUCKET_NAME`, `AWS_S3_REGION_NAME`, credentials).

## 4. Database migrations

```bash
python manage.py migrate
```

## 5. Celery systemd service

```bash
sudo cp deploy/celery.service /etc/systemd/system/celery.service
sudo systemctl daemon-reload
sudo systemctl enable celery
sudo systemctl start celery
sudo systemctl status celery
```

Logs:

```bash
sudo journalctl -u celery -f
```

## 6. Restart Gunicorn after deploy

```bash
sudo systemctl restart gunicorn
```

## Architecture

**Create API (sync, fast)**

1. Validate video (extension, MIME, 80 MB, 60 s via ffprobe)
2. Upload original to S3
3. Save model with `video_processing_status=processing`
4. Enqueue Celery task
5. Return response

**Celery worker (background, concurrency=1)**

1. Download original from S3
2. Compress to H.264/AAC MP4 (720p, ultrafast, CRF 30)
3. Generate JPEG thumbnail (00:00:01, fallback 00:00:00)
4. Upload compressed video + thumbnail to S3
5. Delete original video from S3
6. Set `video_processing_status=ready` (or `failed` after retries)

## API fields

| Model | Field | Values |
|-------|-------|--------|
| Property | `video_processing_status` | `processing`, `ready`, `failed`, `null` (no video) |
| Advertisement | `video_processing_status` | `processing`, `ready`, `failed` |

## Testing

### Redis + Celery health

```bash
redis-cli ping
cd Backend && source venv/bin/activate
celery -A property_listing inspect ping
```

### Property upload

```bash
curl -X POST https://api.buylandsindia.com/api/properties/properties/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -F "title=Test Video Property" \
  -F "property_for=sell" \
  ... \
  -F "property_video=@/path/to/video.mp4"
```

Response should return in ~1–2 s with `"video_processing_status": "processing"`.

Poll the property detail until status becomes `ready`.

### Advertisement upload (admin)

```bash
curl -X POST https://api.buylandsindia.com/api/advertisements/ \
  -H "Authorization: Token ADMIN_TOKEN" \
  -F "media_type=video" \
  -F "video_file=@/path/to/video.mp4" \
  ...
```

### Worker logs to expect

- `Compression started` / `Compression completed`
- `Thumbnail started` / `Thumbnail completed`
- `S3 upload started` / `S3 upload completed`
- `Total processing time for Property pk=N: X.XXs`

## Supported formats

Extensions: `mp4`, `mov`, `avi`, `mkv`, `webm`, `m4v`, `3gp`  
Output: always MP4 (H.264 + AAC)

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Tasks never run | Check `redis-server` and `celery` services |
| `ffmpeg not installed` | `sudo apt install -y ffmpeg` |
| Duration validation fails | Ensure `ffprobe` is installed (`ffmpeg` package includes it) |
| Stuck on `processing` | Check `journalctl -u celery -f` for errors |
| S3 permission errors | Verify IAM credentials and bucket policy |

## Key files

- `property_listing/celery.py` — Celery app
- `property_listing/tasks.py` — `process_property_video`, `process_advertisement_video`
- `property_listing/video_services.py` — validation, compression, thumbnails, S3 replace
- `property_listing/video_constants.py` — shared limits and status values
- `deploy/celery.service` — systemd unit (concurrency=1 for CPU-heavy FFmpeg)
