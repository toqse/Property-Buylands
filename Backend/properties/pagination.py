from math import ceil

from rest_framework.pagination import PageNumberPagination


class PropertyPagination(PageNumberPagination):
    """
    Pagination settings for property listings.
    """

    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class LocationPagination(PageNumberPagination):
    """Pagination for states, districts, and cities list endpoints."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class TestimonialLimitPagination(PageNumberPagination):
    """Public testimonials: ``?page=1&limit=3`` with custom response metadata."""

    page_query_param = "page"
    page_size_query_param = "limit"
    page_size = 3
    max_page_size = 50

    def get_paginated_response(self, data, *, section=None):
        from rest_framework.response import Response

        total = self.page.paginator.count
        size = self.page.paginator.per_page
        current = self.page.number
        total_pages = max(1, ceil(total / size)) if size else 1

        payload = {
            "total_count": total,
            "current_page": current,
            "total_pages": total_pages,
            "results": data,
        }
        if section is not None:
            payload["section"] = section
        return Response(payload)


class AdminPanelImagePagination(PageNumberPagination):
    """Admin panel images: ``?page=1&limit=10`` with mobile-friendly metadata."""

    page_query_param = "page"
    page_size_query_param = "limit"
    page_size = 10
    max_page_size = 50

    def get_paginated_response(self, data, *, max_allowed=5, message="Images retrieved successfully."):
        from rest_framework.response import Response

        total = self.page.paginator.count
        size = self.page.paginator.per_page
        current = self.page.number
        total_pages = max(1, ceil(total / size)) if size else 1

        return Response(
            {
                "success": True,
                "message": message,
                "max_allowed": max_allowed,
                "total_count": total,
                "current_page": current,
                "total_pages": total_pages,
                "results": data,
            }
        )
