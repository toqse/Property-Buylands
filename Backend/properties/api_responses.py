"""Consistent mobile-friendly JSON envelopes for admin panel APIs."""

from rest_framework.response import Response


def success_response(*, message, data=None, status_code=200, **extra):
    payload = {"success": True, "message": message}
    if data is not None:
        payload["data"] = data
    payload.update(extra)
    return Response(payload, status=status_code)


def error_response(*, message, errors=None, status_code=400):
    payload = {"success": False, "message": message}
    if errors is not None:
        payload["errors"] = errors
    return Response(payload, status=status_code)
