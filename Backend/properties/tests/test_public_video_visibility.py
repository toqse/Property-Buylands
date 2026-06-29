from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.test import override_settings
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from properties.models import City, District, Property, PropertyType, State
from property_listing.video_constants import VIDEO_FAILED, VIDEO_PROCESSING, VIDEO_READY

TEST_STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}


@override_settings(STORAGES=TEST_STORAGES)
class PublicVideoVisibilityTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_user(
            username="owner_vis",
            email="owner_vis@test.com",
            password="testpass123",
        )
        cls.other = User.objects.create_user(
            username="other_vis",
            email="other_vis@test.com",
            password="testpass123",
        )
        cls.staff = User.objects.create_user(
            username="staff_vis",
            email="staff_vis@test.com",
            password="testpass123",
            is_staff=True,
        )
        cls.state = State.objects.create(name="VisState")
        cls.district = District.objects.create(name="VisDistrict", state=cls.state)
        cls.city = City.objects.create(name="VisCity", district=cls.district)
        cls.property_type = PropertyType.objects.create(name="Villa")

    def _property(self, slug, **overrides):
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
            "moderation_status": Property.MODERATION_APPROVED,
            "created_by": self.owner,
        }
        data.update(overrides)
        return Property.objects.create(**data)

    def _list_ids(self, auth=False, staff=False):
        user = self.staff if staff else (self.owner if auth else None)
        if user:
            token = Token.objects.get_or_create(user=user)[0]
            self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        else:
            self.client.credentials()
        response = self.client.get("/api/properties/properties/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return {item["id"] for item in response.data["results"]}

    def test_approved_no_video_is_public(self):
        prop = self._property("no-video-public")
        ids = self._list_ids()
        self.assertIn(prop.id, ids)

    def test_approved_processing_video_hidden_from_public(self):
        prop = self._property(
            "processing-hidden",
            property_video=ContentFile(b"x", name="clip.mp4"),
            video_processing_status=VIDEO_PROCESSING,
        )
        ids = self._list_ids()
        self.assertNotIn(prop.id, ids)

    def test_approved_failed_video_hidden_from_public(self):
        prop = self._property(
            "failed-hidden",
            property_video=ContentFile(b"x", name="clip.mp4"),
            video_processing_status=VIDEO_FAILED,
        )
        ids = self._list_ids()
        self.assertNotIn(prop.id, ids)

    def test_approved_ready_video_is_public(self):
        prop = self._property(
            "ready-public",
            property_video=ContentFile(b"x", name="clip.mp4"),
            video_processing_status=VIDEO_READY,
        )
        ids = self._list_ids()
        self.assertIn(prop.id, ids)

    def test_processing_visible_in_owner_mine(self):
        prop = self._property(
            "processing-mine",
            property_video=ContentFile(b"x", name="clip.mp4"),
            video_processing_status=VIDEO_PROCESSING,
        )
        token = Token.objects.get_or_create(user=self.owner)[0]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        response = self.client.get("/api/properties/properties/mine/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {item["id"] for item in response.data["results"]}
        self.assertIn(prop.id, ids)

    def test_staff_list_includes_processing(self):
        prop = self._property(
            "processing-staff",
            property_video=ContentFile(b"x", name="clip.mp4"),
            video_processing_status=VIDEO_PROCESSING,
        )
        ids = self._list_ids(staff=True)
        self.assertIn(prop.id, ids)

    def test_non_owner_cannot_retrieve_processing_approved_property(self):
        prop = self._property(
            "processing-detail",
            property_video=ContentFile(b"x", name="clip.mp4"),
            video_processing_status=VIDEO_PROCESSING,
        )
        token = Token.objects.get_or_create(user=self.other)[0]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        response = self.client.get(f"/api/properties/properties/{prop.slug}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_can_retrieve_processing_property(self):
        prop = self._property(
            "processing-owner-detail",
            property_video=ContentFile(b"x", name="clip.mp4"),
            video_processing_status=VIDEO_PROCESSING,
        )
        token = Token.objects.get_or_create(user=self.owner)[0]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        response = self.client.get(f"/api/properties/properties/{prop.slug}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_owner_can_retrieve_pending_property(self):
        prop = self._property(
            "pending-owner-detail",
            moderation_status=Property.MODERATION_PENDING,
        )
        token = Token.objects.get_or_create(user=self.owner)[0]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        response = self.client.get(f"/api/properties/properties/{prop.slug}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_anonymous_cannot_retrieve_pending_property(self):
        prop = self._property(
            "pending-anon-detail",
            moderation_status=Property.MODERATION_PENDING,
        )
        self.client.credentials()
        response = self.client.get(f"/api/properties/properties/{prop.slug}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


@override_settings(STORAGES=TEST_STORAGES)
class RetryVideoProcessingTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_user(
            username="owner_retry",
            email="owner_retry@test.com",
            password="testpass123",
        )
        cls.other = User.objects.create_user(
            username="other_retry",
            email="other_retry@test.com",
            password="testpass123",
        )
        cls.staff = User.objects.create_user(
            username="staff_retry",
            email="staff_retry@test.com",
            password="testpass123",
            is_staff=True,
        )
        cls.state = State.objects.create(name="RetryState")
        cls.district = District.objects.create(name="RetryDistrict", state=cls.state)
        cls.city = City.objects.create(name="RetryCity", district=cls.district)
        cls.property_type = PropertyType.objects.create(name="Apartment")

    def _failed_property(self):
        return Property.objects.create(
            property_for="sell",
            property_ownership="direct_owner",
            contact_name="Seller",
            whatsapp_number="+919999999999",
            phone_number="+919999999999",
            email="seller@test.com",
            state=self.state,
            district=self.district,
            city=self.city,
            title="Failed Video Property",
            slug="failed-video-property",
            price="500000",
            property_type=self.property_type,
            area=900,
            area_unit="sqft",
            moderation_status=Property.MODERATION_APPROVED,
            created_by=self.owner,
            property_video=ContentFile(b"video-bytes", name="tour.mp4"),
            video_processing_status=VIDEO_FAILED,
        )

    def _auth(self, user):
        token = Token.objects.get_or_create(user=user)[0]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    @patch("property_listing.video_services.queue_video_processing")
    def test_owner_can_retry_failed_video(self, mock_queue):
        prop = self._failed_property()
        self._auth(self.owner)
        response = self.client.post(
            f"/api/properties/properties/{prop.pk}/retry-video-processing/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["video_processing_status"], VIDEO_PROCESSING)
        prop.refresh_from_db()
        self.assertEqual(prop.video_processing_status, VIDEO_PROCESSING)
        mock_queue.assert_called_once_with("property", prop.pk)

    @patch("property_listing.video_services.queue_video_processing")
    def test_staff_can_retry_failed_video(self, mock_queue):
        prop = self._failed_property()
        self._auth(self.staff)
        response = self.client.post(
            f"/api/properties/properties/{prop.pk}/retry-video-processing/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_queue.assert_called_once()

    def test_non_owner_cannot_retry(self):
        prop = self._failed_property()
        self._auth(self.other)
        response = self.client.post(
            f"/api/properties/properties/{prop.pk}/retry-video-processing/"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_retry_rejected_when_not_failed(self):
        prop = self._failed_property()
        prop.video_processing_status = VIDEO_READY
        prop.save(update_fields=["video_processing_status"])
        self._auth(self.owner)
        response = self.client.post(
            f"/api/properties/properties/{prop.pk}/retry-video-processing/"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
