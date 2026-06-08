import logging
import secrets

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from rest_framework import status
from rest_framework.response import Response
from smtplib import SMTPException

from .models import OTPVerification

logger = logging.getLogger(__name__)

OTP_SEND_FAILURE_MESSAGE = "Unable to send OTP to this email address."
OTP_SEND_SUCCESS_MESSAGE = "OTP sent successfully."


class OTPDeliveryError(Exception):
    """Raised when OTP email cannot be delivered to the recipient."""


def generate_otp_code(length: int = 6) -> str:
    return "".join(secrets.choice("0123456789") for _ in range(length))


def normalize_email(email: str) -> str:
    normalized = (email or "").strip().lower()
    validate_email(normalized)
    return normalized


def _from_email() -> str:
    return getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@propertylisting.com")


def notify_admin_otp_delivery_failed(recipient: str, purpose: str = "") -> None:
    if not getattr(settings, "OTP_NOTIFY_ON_FAILURE", True):
        return

    admin_email = (getattr(settings, "OTP_ADMIN_NOTIFY_EMAIL", "") or "").strip()
    if not admin_email:
        return

    body = f"OTP delivery failed for user email: {recipient}"
    if purpose:
        body = f"{body}\nPurpose: {purpose}"

    try:
        send_mail(
            "OTP delivery failed",
            body,
            _from_email(),
            [admin_email],
            fail_silently=True,
        )
    except Exception:
        logger.exception("Failed to send OTP delivery failure notification to admin.")


def deliver_otp_email(
    *,
    recipient: str,
    subject: str,
    otp_code: str,
    body_prefix: str = "Your verification code is",
) -> None:
    """
    Send OTP email only (no User / OTPVerification row).
    Raises OTPDeliveryError on validation or delivery failure.
    """
    try:
        recipient = normalize_email(recipient)
    except ValidationError as exc:
        logger.warning("Invalid email for OTP delivery: %s", recipient)
        raise OTPDeliveryError(OTP_SEND_FAILURE_MESSAGE) from exc

    message = f"{body_prefix}: {otp_code}"

    try:
        send_mail(
            subject,
            message,
            _from_email(),
            [recipient],
            fail_silently=False,
        )
    except SMTPException:
        logger.exception("SMTP failure sending OTP to %s", recipient)
        notify_admin_otp_delivery_failed(recipient)
        raise OTPDeliveryError(OTP_SEND_FAILURE_MESSAGE)
    except Exception:
        logger.exception("Unexpected error sending OTP to %s", recipient)
        notify_admin_otp_delivery_failed(recipient)
        raise OTPDeliveryError(OTP_SEND_FAILURE_MESSAGE)


def send_otp_to_recipient(
    *,
    recipient: str,
    subject: str,
    user,
    purpose: str,
    body_prefix: str = "Your verification code is",
) -> OTPVerification:
    """
    Send OTP email to the recipient only. Persist OTP after successful delivery.
    Raises OTPDeliveryError on validation or delivery failure.
    """
    try:
        recipient = normalize_email(recipient)
    except ValidationError as exc:
        logger.warning("Invalid email for OTP delivery: %s", recipient)
        raise OTPDeliveryError(OTP_SEND_FAILURE_MESSAGE) from exc

    otp_code = generate_otp_code()
    message = f"{body_prefix}: {otp_code}"

    try:
        send_mail(
            subject,
            message,
            _from_email(),
            [recipient],
            fail_silently=False,
        )
    except SMTPException:
        logger.exception("SMTP failure sending OTP to %s", recipient)
        notify_admin_otp_delivery_failed(recipient, purpose)
        raise OTPDeliveryError(OTP_SEND_FAILURE_MESSAGE)
    except Exception:
        logger.exception("Unexpected error sending OTP to %s", recipient)
        notify_admin_otp_delivery_failed(recipient, purpose)
        raise OTPDeliveryError(OTP_SEND_FAILURE_MESSAGE)

    OTPVerification.objects.filter(user=user, purpose=purpose).delete()
    return OTPVerification.objects.create(user=user, purpose=purpose, otp=otp_code)


def _otp_payload(*, success: bool, message: str, otp: str | None = None, **extra) -> dict:
    payload = {"success": success, "message": message}
    if otp is not None:
        payload["otp"] = otp
    payload.update(extra)
    return payload


def otp_send_success(
    message: str = OTP_SEND_SUCCESS_MESSAGE,
    http_status: int = status.HTTP_200_OK,
    otp: str | None = None,
):
    return Response(_otp_payload(success=True, message=message, otp=otp), status=http_status)


def otp_send_failure(message: str = OTP_SEND_FAILURE_MESSAGE):
    return Response(_otp_payload(success=False, message=message), status=status.HTTP_400_BAD_REQUEST)


def otp_verify_success(message: str, otp: str, **extra):
    return Response(_otp_payload(success=True, message=message, otp=otp, **extra), status=status.HTTP_200_OK)
