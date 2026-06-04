import io
import uuid

from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from PIL import Image, ImageOps

AD_IMAGE_INITIAL_QUALITY = 85
AD_IMAGE_MIN_QUALITY = 60
AD_IMAGE_QUALITY_FLOOR_BEFORE_RESIZE = 70
AD_IMAGE_QUALITY_STEP = 5
AD_IMAGE_DIMENSION_SCALE = 0.85


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


def _fit_max_dimension(img: Image.Image, max_dim: int) -> Image.Image:
    w, h = img.size
    longest = max(w, h)
    if longest <= max_dim:
        return img
    scale = max_dim / longest
    new_size = (max(1, int(w * scale)), max(1, int(h * scale)))
    return img.resize(new_size, Image.Resampling.LANCZOS)


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


def _compress_to_budget(
    img: Image.Image,
    *,
    max_bytes: int,
    min_dimension: int,
) -> tuple[bytes, str]:
    working = img
    quality = AD_IMAGE_INITIAL_QUALITY

    while True:
        while quality >= AD_IMAGE_QUALITY_FLOOR_BEFORE_RESIZE:
            data, ext = _encode_image(working, quality)
            if len(data) <= max_bytes:
                return data, ext
            quality -= AD_IMAGE_QUALITY_STEP

        quality = AD_IMAGE_MIN_QUALITY
        while quality >= AD_IMAGE_MIN_QUALITY:
            data, ext = _encode_image(working, quality)
            if len(data) <= max_bytes:
                return data, ext
            quality -= AD_IMAGE_QUALITY_STEP

        w, h = working.size
        if max(w, h) < min_dimension:
            data, ext = _encode_image(working, AD_IMAGE_MIN_QUALITY)
            if len(data) <= max_bytes:
                return data, ext
            raise ValidationError("Image could not be optimized to the required size.")

        new_w = max(1, int(w * AD_IMAGE_DIMENSION_SCALE))
        new_h = max(1, int(h * AD_IMAGE_DIMENSION_SCALE))
        working = working.resize((new_w, new_h), Image.Resampling.LANCZOS)
        quality = AD_IMAGE_INITIAL_QUALITY


def compress_ad_image(
    upload,
    *,
    max_bytes: int = 800 * 1024,
    max_dimension: int = 1920,
    min_dimension: int = 720,
) -> ContentFile:
    if not upload:
        raise ValidationError("No image file provided.")
    try:
        img = Image.open(upload)
        img = ImageOps.exif_transpose(img)
    except Exception as exc:
        raise ValidationError("Invalid or unsupported image file.") from exc

    img = _to_rgb(img)
    img = _fit_max_dimension(img, max_dimension)
    data, ext = _compress_to_budget(img, max_bytes=max_bytes, min_dimension=min_dimension)
    if len(data) > max_bytes:
        raise ValidationError("Image could not be optimized to the required size.")

    original_name = getattr(upload, "name", "ad_image") or "ad_image"
    stem = original_name.rsplit(".", 1)[0][:80] if "." in original_name else original_name[:80]
    filename = f"{stem}_{uuid.uuid4().hex[:8]}.{ext}"
    return ContentFile(data, name=filename)

