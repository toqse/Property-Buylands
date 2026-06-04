"""Unique URL slugs for Property listings."""

import re
from django.utils.text import slugify


def _reserved_digit_slug(s: str) -> bool:
    return bool(re.fullmatch(r"\d+", (s or "").strip()))


def generate_unique_property_slug(title: str, *, exclude_pk=None) -> str:
    """Build a URL-safe unique slug from title (suffix -2, -3, … on collision)."""
    base = slugify((title or "").strip())[:180] or "property"
    candidate = base
    n = 0
    from .models import Property

    qs = Property.objects.all()
    if exclude_pk is not None:
        qs = qs.exclude(pk=exclude_pk)
    while qs.filter(slug=candidate).exists() or _reserved_digit_slug(candidate):
        n += 1
        suffix = f"-{n}"
        candidate = (base[: 220 - len(suffix)] + suffix)[:220]
    return candidate


def normalize_property_slug_input(raw: str, *, exclude_pk=None) -> str:
    """Slugify user input and ensure uniqueness; rejects digit-only slugs (detail URL uses digits as pk)."""
    s = slugify((raw or "").strip())[:220]
    if not s:
        raise ValueError("empty slug")
    if _reserved_digit_slug(s):
        raise ValueError("slug cannot be only digits")
    from .models import Property

    candidate = s
    n = 0
    qs = Property.objects.all()
    if exclude_pk is not None:
        qs = qs.exclude(pk=exclude_pk)
    while qs.filter(slug=candidate).exists():
        n += 1
        suffix = f"-{n}"
        candidate = (s[: 220 - len(suffix)] + suffix)[:220]
    return candidate
