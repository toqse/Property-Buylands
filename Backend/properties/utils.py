"""
Utility functions for the properties app.
"""
import math
import re
from decimal import Decimal

from django.db.models import Q

from property_listing.video_constants import VIDEO_READY


def filter_public_video_ready(queryset):
    """Exclude uploaded videos that are not yet compressed (processing/failed)."""
    return queryset.filter(
        Q(property_video__isnull=True)
        | Q(property_video="")
        | Q(video_processing_status=VIDEO_READY)
    )


def absolute_media_url(request, file_field):
    """Build an absolute URL for a Django FileField, or None when unset."""
    if not file_field:
        return None
    try:
        relative = file_field.url
    except (ValueError, AttributeError):
        return None
    if not relative:
        return None
    if request is not None:
        return request.build_absolute_uri(relative)
    return relative


def cluster_property_locations(props, filter_radius_km):
    """
    Merge property rows that share the same state/district/city and fall within
    ``filter_radius_km`` of an existing cluster representative (newest row wins).
    Each ``prop`` must include: state_id, district_id, city_id, latitude, longitude,
    created_at, state_name, district_name, city_name.
    """
    from collections import defaultdict

    groups = defaultdict(list)
    for prop in props:
        key = (prop["state_id"], prop["district_id"], prop["city_id"])
        groups[key].append(prop)

    results = []
    radius = float(filter_radius_km)
    for group_props in groups.values():
        clusters = []
        for prop in group_props:
            lat1 = float(prop["latitude"])
            lon1 = float(prop["longitude"])
            placed = False
            for cluster in clusters:
                rep = cluster["rep"]
                if haversine_km(lat1, lon1, rep["latitude"], rep["longitude"]) <= radius:
                    cluster["members"].append(prop)
                    placed = True
                    break
            if not placed:
                clusters.append({"rep": prop, "members": [prop]})

        for cluster in clusters:
            rep = cluster["rep"]
            results.append(
                {
                    "location_name": f"{rep['city_name']}, {rep['district_name']}, {rep['state_name']}",
                    "latitude": rep["latitude"],
                    "longitude": rep["longitude"],
                    "state": rep["state_name"],
                    "district": rep["district_name"],
                    "city": rep["city_name"],
                    "_created_at": rep["created_at"],
                }
            )

    results.sort(key=lambda row: row["_created_at"], reverse=True)
    for row in results:
        del row["_created_at"]
    return results


def annotate_queryset_distance_km(queryset, user_lat, user_lng):
    """
    Annotate ``distance_km`` on a Property queryset relative to (user_lat, user_lng).
    Rows without coordinates sort last via a large sentinel.
    """
    from django.db.models import Case, F, FloatField, Value, When
    from django.db.models.expressions import ExpressionWrapper
    from django.db.models.functions import ACos, Cos, Radians, Sin

    lat_f = float(user_lat)
    lng_f = float(user_lng)
    raw_distance = ExpressionWrapper(
        6371.0
        * ACos(
            Cos(Radians(Value(lat_f)))
            * Cos(Radians(F("latitude")))
            * Cos(Radians(F("longitude")) - Radians(Value(lng_f)))
            + Sin(Radians(Value(lat_f))) * Sin(Radians(F("latitude")))
        ),
        output_field=FloatField(),
    )
    return queryset.annotate(
        distance_km=Case(
            When(latitude__isnull=True, then=Value(999999.0)),
            When(longitude__isnull=True, then=Value(999999.0)),
            default=raw_distance,
            output_field=FloatField(),
        )
    )


def haversine_km(lat1, lon1, lat2, lon2):
    """
    Return the great-circle distance in kilometers between two points
    given by (lat1, lon1) and (lat2, lon2) using the Haversine formula.
    Accepts Decimal or float.
    """
    lat1 = float(lat1)
    lon1 = float(lon1)
    lat2 = float(lat2)
    lon2 = float(lon2)
    R = 6371  # Earth's radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


_LEGACY_NEARBY_RE = re.compile(r"^\s*(.+?)\s*[-–—]\s*([\d.]+)\s*(km|kms|kilometers?)?\s*$", re.I)


def normalize_nearby_places_output(raw):
    """
    Normalize `Property.nearby_places` JSON for API clients.
    Supports [{"name", "distance"}], legacy strings "Place - 1km", and mixed lists.
    """
    if raw is None:
        return []
    if isinstance(raw, dict):
        raw = [raw]
    if not isinstance(raw, list):
        return []

    out = []
    for item in raw:
        if isinstance(item, dict):
            name = (item.get("name") or item.get("place") or "").strip()
            if not name:
                continue
            dist = item.get("distance", item.get("distance_km", 0))
            try:
                dist_num = float(dist)
            except (TypeError, ValueError):
                dist_num = 0.0
            out.append({"name": name, "distance": dist_num})
        elif isinstance(item, str):
            text = item.strip()
            if not text:
                continue
            m = _LEGACY_NEARBY_RE.match(text)
            if m:
                try:
                    dist_num = float(m.group(2))
                except ValueError:
                    dist_num = 0.0
                out.append({"name": m.group(1).strip(), "distance": dist_num})
            else:
                out.append({"name": text, "distance": 0.0})
    return out
