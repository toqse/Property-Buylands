"""
Quality-first compression for property listing and category icon images.
"""
from __future__ import annotations

import io
import uuid
from dataclasses import dataclass

from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import UploadedFile
from PIL import Image, ImageOps

PROPERTY_IMAGE_MAX_BYTES = 300 * 1024
PROPERTY_IMAGE_MAX_DIMENSION = 1920
PROPERTY_IMAGE_MIN_DIMENSION = 800

CATEGORY_ICON_MAX_BYTES = 80 * 1024
CATEGORY_ICON_MAX_DIMENSION = 512
CATEGORY_ICON_MIN_DIMENSION = 64

PROPERTY_IMAGE_ALLOWED_EXTENSIONS = ("jpg", "jpeg", "png", "webp")


@dataclass(frozen=True)
class ImageCompressSettings:
    max_bytes: int
    max_dimension: int
    min_dimension: int
    initial_quality: int = 85
    min_quality: int = 60
    quality_floor_before_resize: int = 70
    quality_step: int = 5
    dimension_scale: float = 0.85
    budget_error: str = "Image could not be optimized to the size limit."


PROPERTY_IMAGE_SETTINGS = ImageCompressSettings(
    max_bytes=PROPERTY_IMAGE_MAX_BYTES,
    max_dimension=PROPERTY_IMAGE_MAX_DIMENSION,
    min_dimension=PROPERTY_IMAGE_MIN_DIMENSION,
    budget_error=(
        "Image could not be optimized to 300 KB. "
        "Try a simpler photo or smaller dimensions."
    ),
)

CATEGORY_ICON_SETTINGS = ImageCompressSettings(
    max_bytes=CATEGORY_ICON_MAX_BYTES,
    max_dimension=CATEGORY_ICON_MAX_DIMENSION,
    min_dimension=CATEGORY_ICON_MIN_DIMENSION,
    initial_quality=82,
    min_quality=55,
    quality_floor_before_resize=65,
    budget_error=(
        "Category icon could not be optimized to 80 KB. "
        "Try a simpler image or smaller dimensions."
    ),
)


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


def _compress_to_budget(
    img: Image.Image,
    settings: ImageCompressSettings,
) -> tuple[bytes, str]:
    """Reduce quality first, then dimensions, until within the byte budget."""
    working = img
    quality = settings.initial_quality

    while True:
        while quality >= settings.quality_floor_before_resize:
            data, ext = _encode_image(working, quality)
            if len(data) <= settings.max_bytes:
                return data, ext
            quality -= settings.quality_step

        quality = settings.min_quality
        while quality >= settings.min_quality:
            data, ext = _encode_image(working, quality)
            if len(data) <= settings.max_bytes:
                return data, ext
            quality -= settings.quality_step

        w, h = working.size
        longest = max(w, h)
        if longest < settings.min_dimension:
            data, ext = _encode_image(working, settings.min_quality)
            if len(data) <= settings.max_bytes:
                return data, ext
            raise ValidationError(settings.budget_error)

        new_w = max(1, int(w * settings.dimension_scale))
        new_h = max(1, int(h * settings.dimension_scale))
        working = working.resize((new_w, new_h), Image.Resampling.LANCZOS)
        quality = settings.initial_quality


def _compress_image_upload(
    upload,
    settings: ImageCompressSettings,
    *,
    name_prefix: str = "image",
) -> ContentFile:
    if not upload:
        raise ValidationError("No image file provided.")

    try:
        img = Image.open(upload)
        img = ImageOps.exif_transpose(img)
    except Exception as exc:
        raise ValidationError("Invalid or unsupported image file.") from exc

    img = _to_rgb(img)
    img = _fit_max_dimension(img, settings.max_dimension)
    data, ext = _compress_to_budget(img, settings)

    if len(data) > settings.max_bytes:
        raise ValidationError(settings.budget_error)

    original_name = getattr(upload, "name", name_prefix) or name_prefix
    stem = original_name.rsplit(".", 1)[0][:80] if "." in original_name else original_name[:80]
    filename = f"{stem}_{uuid.uuid4().hex[:8]}.{ext}"
    return ContentFile(data, name=filename)


def compress_property_image(upload) -> ContentFile:
    """
    Compress an uploaded image to WebP (or JPEG fallback) at most 300 KB.
    Preserves quality by starting at high WebP quality and only resizing when needed.
    """
    return _compress_image_upload(upload, PROPERTY_IMAGE_SETTINGS)


def compress_category_icon(upload) -> ContentFile:
    """
    Compress a property-type category icon to WebP (or JPEG fallback) at most 80 KB.
    Icons are downscaled to 512 px on the longest edge.
    """
    return _compress_image_upload(
        upload,
        CATEGORY_ICON_SETTINGS,
        name_prefix="category_icon",
    )


def category_icon_is_optimized(file_field) -> bool:
    """True when the stored icon is already WebP and within the size cap."""
    if not file_field:
        return True
    name = (getattr(file_field, "name", "") or "").lower()
    if not name.endswith(".webp"):
        return False
    try:
        return file_field.size <= CATEGORY_ICON_MAX_BYTES
    except Exception:
        return False
