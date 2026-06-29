"""
Backward-compatible re-exports. New code should import from property_listing.video_services.
"""
from property_listing.video_services import (  # noqa: F401
    compress_video as compress_ad_video,
    generate_video_thumbnail,
    resolve_ffmpeg_binary,
    validate_video,
)
