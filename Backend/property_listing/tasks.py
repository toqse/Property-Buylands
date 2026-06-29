import logging

from celery import shared_task
from django.core.exceptions import ValidationError

from advertisements.image_utils import compress_ad_image
from advertisements.models import Advertisement
from properties.image_utils import compress_property_image
from properties.models import Property
from property_listing.video_constants import VIDEO_FAILED
from property_listing.video_services import process_stored_video

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    autoretry_for=(OSError, ValidationError),
    retry_backoff=True,
    retry_backoff_max=300,
    max_retries=3,
)
def process_property_video(self, property_id: int) -> None:
    logger.info("process_property_video started for property_id=%s", property_id)
    try:
        instance = Property.objects.get(pk=property_id)
    except Property.DoesNotExist:
        logger.warning("Property %s not found; skipping video processing.", property_id)
        return

    if not instance.property_video:
        logger.warning("Property %s has no video; skipping.", property_id)
        return

    try:
        process_stored_video(
            instance,
            video_field="property_video",
            thumbnail_field="video_thumbnail",
            status_field="video_processing_status",
            thumbnail_compressor=compress_property_image,
        )
    except Exception as exc:
        logger.exception("Property video processing failed for id=%s", property_id)
        if self.request.retries >= self.max_retries:
            Property.objects.filter(pk=property_id).update(
                video_processing_status=VIDEO_FAILED
            )
            logger.error(
                "Property video processing exhausted retries for id=%s; marked FAILED.",
                property_id,
            )
            return
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    autoretry_for=(OSError, ValidationError),
    retry_backoff=True,
    retry_backoff_max=300,
    max_retries=3,
)
def process_advertisement_video(self, advertisement_id: int) -> None:
    logger.info(
        "process_advertisement_video started for advertisement_id=%s",
        advertisement_id,
    )
    try:
        instance = Advertisement.objects.get(pk=advertisement_id)
    except Advertisement.DoesNotExist:
        logger.warning(
            "Advertisement %s not found; skipping video processing.",
            advertisement_id,
        )
        return

    if not instance.video_file:
        logger.warning("Advertisement %s has no video; skipping.", advertisement_id)
        return

    def _compress_ad_thumb(upload):
        return compress_ad_image(
            upload,
            max_bytes=800 * 1024,
            max_dimension=1080,
            min_dimension=540,
        )

    try:
        process_stored_video(
            instance,
            video_field="video_file",
            thumbnail_field="video_thumbnail",
            status_field="video_processing_status",
            thumbnail_compressor=_compress_ad_thumb,
        )
    except Exception as exc:
        logger.exception(
            "Advertisement video processing failed for id=%s",
            advertisement_id,
        )
        if self.request.retries >= self.max_retries:
            Advertisement.objects.filter(pk=advertisement_id).update(
                video_processing_status=VIDEO_FAILED
            )
            logger.error(
                "Advertisement video processing exhausted retries for id=%s; marked FAILED.",
                advertisement_id,
            )
            return
        raise self.retry(exc=exc)
