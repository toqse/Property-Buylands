from rest_framework.permissions import BasePermission


def user_is_platform_admin(user) -> bool:
    return bool(user and user.is_authenticated and user.is_superuser)


def user_is_portal_staff(user) -> bool:
    return bool(user and user.is_authenticated and user.is_staff and not user.is_superuser)


def user_is_any_staff(user) -> bool:
    return bool(user and user.is_authenticated and user.is_staff)


def get_staff_permissions(user) -> dict:
    """Permission flags for staff/superuser; superuser always has all."""
    if not user or not user.is_authenticated or not user.is_staff:
        return {
            "can_manage_properties": False,
            "can_manage_advertisements": False,
        }
    if user.is_superuser:
        return {
            "can_manage_properties": True,
            "can_manage_advertisements": True,
        }
    profile = getattr(user, "staff_profile", None)
    if not profile:
        return {
            "can_manage_properties": True,
            "can_manage_advertisements": True,
        }
    return {
        "can_manage_properties": bool(profile.can_manage_properties),
        "can_manage_advertisements": bool(profile.can_manage_advertisements),
    }


class IsStaffUser(BasePermission):
    """Authenticated staff (admin) users only."""

    def has_permission(self, request, view):
        return user_is_any_staff(request.user)


class IsSuperUser(BasePermission):
    """Platform super-admins only (Staff Management)."""

    def has_permission(self, request, view):
        return user_is_platform_admin(request.user)
