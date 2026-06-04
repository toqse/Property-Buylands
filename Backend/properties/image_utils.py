"""
Quality-first compression for property listing images (max 300 KB stored).
"""
import io
import uuid

from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import UploadedFile
from PIL import Image, ImageOps

PROPERTY_IMAGE_MAX_BYTES = 300 * 1024
PROPERTY_IMAGE_MAX_DIMENSION = 1920
PROPERTY_IMAGE_MIN_DIMENSION = 800
PROPERTY_IMAGE_INITIAL_QUALITY = 85
PROPERTY_IMAGE_MIN_QUALITY = 60
PROPERTY_IMAGE_QUALITY_FLOOR_BEFORE_RESIZE = 70
PROPERTY_IMAGE_QUALITY_STEP = 5
PROPERTY_IMAGE_DIMENSION_SCALE = 0.85
PROPERTY_IMAGE_ALLOWED_EXTENSIONS = ("jpg", "jpeg", "png", "webp")


def is_new_image_upload(file_field) -> bool:
    """True when the ImageField holds a new upload, not an existing stored file."""
    if not file_field:
        return False
    inner = getattr(file_field, "file", None)
    return isinstance(inner, UploadedFile)


def _to_rgb(img: Image.Image) -> Image.Image:
    if img.mode in ("RGBA", "LA", "P"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        if img.mode in ("RGBA", "LA"):
            background.paste(img, mask=img.split()[-1])
        else:
            background.paste(img)
        return background
    if img.mode != "RGB":
        return img.convert("RGB")
    return img


def _encode_webp(img: Image.Image, quality: int) -> bytes:
    buffer = io.BytesIO()
    img.save(buffer, format="WEBP", quality=quality, method=6)
    return buffer.getvalue()


def _encode_jpeg(img: Image.Image, quality: int) -> bytes:
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=quality, optimize=True, progressive=True)
    return buffer.getvalue()


def _encode_image(img: Image.Image, quality: int) -> tuple[bytes, str]:
    try:
        return _encode_webp(img, quality), "webp"
    except Exception:
        return _encode_jpeg(img, quality), "jpg"


def _fit_max_dimension(img: Image.Image, max_dim: int) -> Image.Image:
    w, h = img.size
    longest = max(w, h)
    if longest <= max_dim:
        return img
    scale = max_dim / longest
    new_size = (max(1, int(w * scale)), max(1, int(h * scale)))
    return img.resize(new_size, Image.Resampling.LANCZOS)


def _compress_to_budget(img: Image.Image) -> tuple[bytes, str]:
    """Reduce quality first, then dimensions, until within PROPERTY_IMAGE_MAX_BYTES."""
    working = img
    quality = PROPERTY_IMAGE_INITIAL_QUALITY

    while True:
        while quality >= PROPERTY_IMAGE_QUALITY_FLOOR_BEFORE_RESIZE:
            data, ext = _encode_image(working, quality)
            if len(data) <= PROPERTY_IMAGE_MAX_BYTES:
                return data, ext
            quality -= PROPERTY_IMAGE_QUALITY_STEP

        quality = PROPERTY_IMAGE_MIN_QUALITY
        while quality >= PROPERTY_IMAGE_MIN_QUALITY:
            data, ext = _encode_image(working, quality)
            if len(data) <= PROPERTY_IMAGE_MAX_BYTES:
                return data, ext
            quality -= PROPERTY_IMAGE_QUALITY_STEP

        w, h = working.size
        longest = max(w, h)
        if longest < PROPERTY_IMAGE_MIN_DIMENSION:
            data, ext = _encode_image(working, PROPERTY_IMAGE_MIN_QUALITY)
            if len(data) <= PROPERTY_IMAGE_MAX_BYTES:
                return data, ext
            raise ValidationError(
                "Image could not be optimized to 300 KB. Try a simpler photo or smaller dimensions."
            )

        new_w = max(1, int(w * PROPERTY_IMAGE_DIMENSION_SCALE))
        new_h = max(1, int(h * PROPERTY_IMAGE_DIMENSION_SCALE))
        working = working.resize((new_w, new_h), Image.Resampling.LANCZOS)
        quality = PROPERTY_IMAGE_INITIAL_QUALITY


def compress_property_image(upload) -> ContentFile:
    """
    Compress an uploaded image to WebP (or JPEG fallback) at most 300 KB.
    Preserves quality by starting at high WebP quality and only resizing when needed.
    """
    if not upload:
        raise ValidationError("No image file provided.")

    try:
        img = Image.open(upload)
        img = ImageOps.exif_transpose(img)
    except Exception as exc:
        raise ValidationError("Invalid or unsupported image file.") from exc

    img = _to_rgb(img)
    img = _fit_max_dimension(img, PROPERTY_IMAGE_MAX_DIMENSION)
    data, ext = _compress_to_budget(img)

    if len(data) > PROPERTY_IMAGE_MAX_BYTES:
        raise ValidationError(
            "Image could not be optimized to 300 KB. Try a simpler photo or smaller dimensions."
        )

    original_name = getattr(upload, "name", "image") or "image"
    stem = original_name.rsplit(".", 1)[0][:80] if "." in original_name else original_name[:80]
    filename = f"{stem}_{uuid.uuid4().hex[:8]}.{ext}"
    return ContentFile(data, name=filename)
