from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.test import override_settings
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from properties.models import City, District, Property, PropertyType, State
from property_listing.video_constants import VIDEO_PROCESSING, VIDEO_READY

TEST_STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

STATUS_URL = "/api/properties/properties/video-processing-status/"


@override_settings(STORAGES=TEST_STORAGES)
class VideoProcessingStatusEndpointTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_user(
            username="status_owner",
            email="status_owner@test.com",
            password="testpass123",
        )
        cls.other = User.objects.create_user(
            username="status_other",
            email="status_other@test.com",
            password="testpass123",
        )
        cls.staff = User.objects.create_user(
            username="status_staff",
            email="status_staff@test.com",
            password="testpass123",
            is_staff=True,
        )
        cls.state = State.objects.create(name="StatusState")
        cls.district = District.objects.create(name="StatusDistrict", state=cls.state)
        cls.city = City.objects.create(name="StatusCity", district=cls.district)
        cls.property_type = PropertyType.objects.create(name="Plot")

    def _property(self, slug, user, **overrides):
        data = {
            "property_for": "sell",
            "property_ownership": "direct_owner",
            "contact_name": "Seller",
            "whatsapp_number": "+919999999999",
            "phone_number": "+919999999999",
            "email": "seller@test.com",
            "state": self.state,
            "district": self.district,
            "city": self.city,
            "title": f"Property {slug}",
            "slug": slug,
            "price": "1000000",
            "property_type": self.property_type,
            "area": 1000,
            "area_unit": "sqft",
            "moderation_status": Property.MODERATION_PENDING,
            "created_by": user,
            "property_video": ContentFile(b"video-bytes", name="tour.mp4"),
            "video_processing_status": VIDEO_PROCESSING,
        }
        data.update(overrides)
        return Property.objects.create(**data)

    def _auth(self, user):
        token = Token.objects.get_or_create(user=user)[0]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    def test_unauthenticated_returns_401(self):
        prop = self._property("unauth", self.owner)
        response = self.client.get(STATUS_URL, {"ids": str(prop.pk)})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_owner_can_poll_own_processing_property(self):
        prop = self._property("owner-processing", self.owner)
        self._auth(self.owner)
        response = self.client.get(STATUS_URL, {"ids": str(prop.pk)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], prop.pk)
        self.assertEqual(
            response.data["results"][0]["video_processing_status"],
            VIDEO_PROCESSING,
        )

    def test_owner_cannot_see_other_users_property(self):
        prop = self._property("other-processing", self.owner)
        self._auth(self.other)
        response = self.client.get(STATUS_URL, {"ids": str(prop.pk)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"], [])

    def test_staff_can_poll_any_property(self):
        prop = self._property("staff-view", self.owner)
        self._auth(self.staff)
        response = self.client.get(STATUS_URL, {"ids": str(prop.pk)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], prop.pk)

    def test_empty_ids_returns_empty_results(self):
        self._auth(self.owner)
        response = self.client.get(STATUS_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"], [])

    def test_batch_poll_multiple_ids(self):
        prop1 = self._property("batch-one", self.owner)
        prop2 = self._property(
            "batch-two",
            self.owner,
            video_processing_status=VIDEO_READY,
        )
        self._auth(self.owner)
        response = self.client.get(
            STATUS_URL,
            {"ids": f"{prop1.pk},{prop2.pk}"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {item["id"] for item in response.data["results"]}
        self.assertEqual(returned_ids, {prop1.pk, prop2.pk})
