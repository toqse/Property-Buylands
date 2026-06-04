"""Project-level helpers (not tied to a single app)."""

from django.conf import settings
from django.http import JsonResponse
from django.urls import NoReverseMatch, reverse


def api_meta(request):
    """GET /api/_meta/ — proves which Django project and URLconf are running."""
    try:
        reg = reverse("register")
    except NoReverseMatch:
        reg = None
    return JsonResponse(
        {
            "service": "premium-property4u-backend",
            "ROOT_URLCONF": settings.ROOT_URLCONF,
            "register_path": reg,
            "hint": "Default dev server is port 8844 (see manage.py). If ROOT_URLCONF is not property_listing.urls, you are hitting a different app.",
        }
    )
