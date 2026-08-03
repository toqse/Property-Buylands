"""Helpers for writing staff activity logs."""

from .models import StaffActivityLog


def log_staff_activity(
    actor,
    *,
    action: str,
    resource_type: str,
    resource_id: str = "",
    summary: str = "",
):
    if not actor or not getattr(actor, "is_authenticated", False):
        return None
    if not getattr(actor, "is_staff", False):
        return None
    return StaffActivityLog.objects.create(
        actor=actor,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id or ""),
        summary=(summary or "")[:255],
    )
