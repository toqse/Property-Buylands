from decimal import Decimal, InvalidOperation

from django.db import connection
from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from accounts.activity import log_staff_activity
from accounts.models import StaffActivityLog
from accounts.permissions import get_staff_permissions, user_is_portal_staff
from advertisements.injector import get_active_ads_payload
from advertisements.models import Advertisement
from advertisements.pagination import AdvertisementPagination
from advertisements.serializers import AdvertisementSerializer


def _parse_decimal(value):
    try:
        return Decimal(str(value))
    except (TypeError, ValueError, InvalidOperation):
        return None


def _parse_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


class AdvertisementViewSet(viewsets.ModelViewSet):
    queryset = Advertisement.objects.select_related("state", "district", "city", "linked_property")
    serializer_class = AdvertisementSerializer
    pagination_class = AdvertisementPagination

    def get_permissions(self):
        if self.action == "active":
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def _ensure_ad_permission(self, user):
        if not user or not user.is_authenticated or not user.is_staff:
            raise PermissionDenied("Staff access required.")
        perms = get_staff_permissions(user)
        if not perms.get("can_manage_advertisements"):
            raise PermissionDenied("You do not have permission to manage advertisements.")

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if self.action != "active":
            if user_is_portal_staff(user):
                queryset = queryset.filter(created_by=user)
            # Superusers see all

        params = self.request.query_params

        ad_type = (params.get("ad_type") or "").strip().lower()
        media_type = (params.get("media_type") or "").strip().lower()
        placement = (params.get("placement") or "").strip()
        state_id = _parse_int(params.get("state_id"))
        is_active = params.get("is_active")
        search = (params.get("search") or "").strip()
        ordering = (params.get("ordering") or "").strip().lower()

        if ad_type in dict(Advertisement.AD_TYPE_CHOICES):
            queryset = queryset.filter(ad_type=ad_type)
        if media_type in dict(Advertisement.MEDIA_TYPE_CHOICES):
            queryset = queryset.filter(media_type=media_type)
        if placement:
            if connection.features.supports_json_field_contains:
                queryset = queryset.filter(placements__contains=[placement])
            else:
                queryset = queryset.filter(placements__icontains=f'"{placement}"')
        if state_id is not None:
            queryset = queryset.filter(state_id=state_id)
        if is_active is not None:
            v = str(is_active).strip().lower()
            if v in ("1", "true", "yes"):
                queryset = queryset.filter(is_active=True)
            elif v in ("0", "false", "no"):
                queryset = queryset.filter(is_active=False)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(subtitle__icontains=search)
            )

        ordering_map = {
            "newest": ("-created_at",),
            "oldest": ("created_at",),
            "priority": ("priority", "-created_at"),
        }
        if ordering in ordering_map:
            queryset = queryset.order_by(*ordering_map[ordering])
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        self._ensure_ad_permission(user)
        instance = serializer.save(created_by=user)
        log_staff_activity(
            user,
            action=StaffActivityLog.ACTION_CREATE,
            resource_type=StaffActivityLog.RESOURCE_ADVERTISEMENT,
            resource_id=str(instance.pk),
            summary=f"Created advertisement: {getattr(instance, 'title', instance.pk)}",
        )

    def perform_update(self, serializer):
        user = self.request.user
        self._ensure_ad_permission(user)
        instance = serializer.save()
        log_staff_activity(
            user,
            action=StaffActivityLog.ACTION_UPDATE,
            resource_type=StaffActivityLog.RESOURCE_ADVERTISEMENT,
            resource_id=str(instance.pk),
            summary=f"Updated advertisement: {getattr(instance, 'title', instance.pk)}",
        )

    def perform_destroy(self, instance):
        user = self.request.user
        self._ensure_ad_permission(user)
        pk = instance.pk
        title = getattr(instance, "title", pk)
        instance.delete()
        log_staff_activity(
            user,
            action=StaffActivityLog.ACTION_DELETE,
            resource_type=StaffActivityLog.RESOURCE_ADVERTISEMENT,
            resource_id=str(pk),
            summary=f"Deleted advertisement: {title}",
        )

    @action(detail=False, methods=["get"], url_path="active")
    def active(self, request):
        placement = (request.query_params.get("placement") or "").strip()
        if not placement:
            return Response(
                {"detail": "placement is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload = get_active_ads_payload(request, placement)
        return Response(payload)
