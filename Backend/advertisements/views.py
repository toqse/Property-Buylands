from decimal import Decimal, InvalidOperation

from django.db import connection
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

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

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        ad_type = (params.get("ad_type") or "").strip().lower()
        media_type = (params.get("media_type") or "").strip().lower()
        placement = (params.get("placement") or "").strip()
        state_id = _parse_int(params.get("state_id"))
        is_active = params.get("is_active")

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
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

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

