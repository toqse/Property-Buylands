from datetime import date
from decimal import Decimal, InvalidOperation

from django.db import connection
from django.db.models import Case, IntegerField, Q, When

from advertisements.models import Advertisement
from advertisements.serializers import AdvertisementPublicSerializer
from properties.models import SiteSettings
from properties.utils import haversine_km
from property_listing.video_constants import VIDEO_READY

DISTANCE_SORT_SENTINEL = 999999.0


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


def _ad_distance_km(ad, lat, lng):
    if ad.latitude is None or ad.longitude is None:
        return DISTANCE_SORT_SENTINEL
    return haversine_km(lat, lng, ad.latitude, ad.longitude)


def _sort_ads_by_distance(items, lat, lng):
    return sorted(
        items,
        key=lambda ad: (
            0 if ad.ad_type == Advertisement.AD_TYPE_PROPERTY else 1,
            _ad_distance_km(ad, lat, lng),
            int(ad.priority or 0),
            -ad.created_at.timestamp() if ad.created_at else 0,
        ),
    )


def _location_filtered_ads(request, placement=None):
    """
    Return active ads, optionally filtered by placement code.
    When placement is None (property list injection), all active ads are eligible.
    """
    params = request.query_params
    lat = _parse_decimal(params.get("latitude") or params.get("lat"))
    lng = _parse_decimal(params.get("longitude") or params.get("lng"))
    state_id = _parse_int(params.get("state_id"))
    district_id = _parse_int(params.get("district_id"))
    city_id = _parse_int(params.get("city_id"))

    today = date.today()
    qs = Advertisement.objects.filter(
        is_active=True,
        video_processing_status=VIDEO_READY,
    ).filter(
        Q(start_date__isnull=True) | Q(start_date__lte=today)
    )
    if placement:
        if connection.features.supports_json_field_contains:
            qs = qs.filter(placements__contains=[placement])
        else:
            qs = qs.filter(placements__icontains=f'"{placement}"')
    qs = qs.exclude(end_date__lt=today).select_related("state", "district", "city", "linked_property")
    qs = qs.annotate(
        ad_type_rank=Case(
            When(ad_type=Advertisement.AD_TYPE_PROPERTY, then=0),
            default=1,
            output_field=IntegerField(),
        )
    ).order_by("ad_type_rank", "priority", "-created_at")

    items = list(qs)

    if lat is not None and lng is not None:
        # Generic ads are always eligible; only property ads are location-filtered.
        out = []
        for ad in items:
            if ad.ad_type != Advertisement.AD_TYPE_PROPERTY:
                out.append(ad)
                continue
            if ad.latitude is not None and ad.longitude is not None:
                distance = haversine_km(lat, lng, ad.latitude, ad.longitude)
                if distance <= float(ad.radius_km):
                    out.append(ad)
                    continue
            if city_id and ad.city_id == city_id:
                out.append(ad)
                continue
            if district_id and ad.district_id == district_id:
                out.append(ad)
                continue
            if state_id and ad.state_id == state_id:
                out.append(ad)
        return _sort_ads_by_distance(out, lat, lng)

    # No coordinates supplied: show all eligible ads (no location filtering),
    # whether or not the ad has latitude/longitude configured.
    return items


def get_active_ads_payload(request, placement):
    ads = _location_filtered_ads(request, placement)
    serializer = AdvertisementPublicSerializer(ads, many=True, context={"request": request})
    return serializer.data


def _global_inject_after_count():
    try:
        settings = SiteSettings.get_settings()
        return max(1, int(getattr(settings, "ad_inject_after_every_n_properties", 5) or 5))
    except (TypeError, ValueError):
        return 5


def inject_ads_into_results(serialized_properties, request):
    ads = get_active_ads_payload(request, placement=None)
    if not ads:
        return [{"type": "property", "data": prop} for prop in serialized_properties]

    wrapped = []
    ad_index = 0
    properties_since_injection = 0
    inject_after = _global_inject_after_count()

    for prop in serialized_properties:
        wrapped.append({"type": "property", "data": prop})
        properties_since_injection += 1
        if properties_since_injection >= inject_after:
            wrapped.append({"type": "ad", "data": ads[ad_index % len(ads)]})
            ad_index += 1
            properties_since_injection = 0
    return wrapped

