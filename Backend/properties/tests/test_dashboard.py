from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from properties.models import City, District, HeroBanner, Property, PropertyType, SiteSettings, State
from property_listing.video_constants import VIDEO_PROCESSING

TEST_STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}


def _png_file(name="test.png"):
    return SimpleUploadedFile(
        name,
        (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
            b"\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
            b"\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4"
            b"\x00\x00\x00\x00IEND\xaeB`\x82"
        ),
        content_type="image/png",
    )


@override_settings(STORAGES=TEST_STORAGES)
class DashboardAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_user(
            username="dash_owner",
            email="dash_owner@test.com",
            password="testpass123",
        )
        cls.state = State.objects.create(name="DashState")
        cls.district = District.objects.create(name="DashDistrict", state=cls.state)
        cls.city = City.objects.create(name="DashCity", district=cls.district)
        cls.property_type = PropertyType.objects.create(
            name="DashVilla",
            image=_png_file("type.png"),
            has_bedrooms=True,
            has_project_status=True,
        )

    def setUp(self):
        self.url = "/api/properties/dashboard/"
        self.client.credentials()

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

    def test_anonymous_get_returns_200_with_expected_keys(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            set(response.data.keys()),
            {"property_types", "featured_properties", "new_properties", "banner"},
        )

    def test_property_types_include_full_fields(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data["property_types"]), 1)
        pt = next(item for item in response.data["property_types"] if item["name"] == "DashVilla")
        self.assertIn("has_bedrooms", pt)
        self.assertIn("has_project_status", pt)
        self.assertTrue(pt["has_project_status"])
        self.assertIn("image", pt)

    def test_featured_properties_limited_and_filtered(self):
        featured = [
            self._property(f"feat-{i}", is_featured=True) for i in range(6)
        ]
        self._property("not-featured", is_featured=False)
        self._property(
            "pending-featured",
            is_featured=True,
            moderation_status=Property.MODERATION_PENDING,
        )

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        featured_ids = {item["id"] for item in response.data["featured_properties"]}
        self.assertEqual(len(response.data["featured_properties"]), 5)
        approved_featured_ids = {p.id for p in featured}
        self.assertTrue(featured_ids.issubset(approved_featured_ids))
        self.assertNotIn(
            Property.objects.get(slug="not-featured").id,
            featured_ids,
        )
        self.assertNotIn(
            Property.objects.get(slug="pending-featured").id,
            featured_ids,
        )

    def test_new_properties_limited_to_five_newest_approved(self):
        created = []
        for i in range(6):
            created.append(self._property(f"new-{i}"))
        self._property(
            "new-pending",
            moderation_status=Property.MODERATION_PENDING,
        )

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        new_ids = [item["id"] for item in response.data["new_properties"]]
        self.assertEqual(len(new_ids), 5)
        expected_ids = [p.id for p in reversed(created[-5:])]
        self.assertEqual(new_ids, expected_ids)
        self.assertNotIn(Property.objects.get(slug="new-pending").id, new_ids)

    def test_video_processing_properties_excluded(self):
        self._property(
            "processing-video",
            property_video=ContentFile(b"x", name="clip.mp4"),
            video_processing_status=VIDEO_PROCESSING,
        )
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        all_property_ids = {
            item["id"]
            for item in response.data["featured_properties"] + response.data["new_properties"]
        }
        self.assertNotIn(Property.objects.get(slug="processing-video").id, all_property_ids)

    def test_banner_returns_latest_hero_or_null(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["banner"])

        banner = HeroBanner.objects.create(image=_png_file("hero.png"))
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data["banner"])
        self.assertEqual(response.data["banner"]["id"], banner.id)
        self.assertIn("image", response.data["banner"])
        self.assertIn("created_at", response.data["banner"])

    def test_lat_lng_filters_only_new_properties(self):
        SiteSettings.get_settings()
        SiteSettings.objects.update(filter_radius=50)

        nearby = self._property(
            "nearby-new",
            latitude="9.931233",
            longitude="76.267303",
        )
        far = self._property(
            "far-new",
            latitude="28.613939",
            longitude="77.209021",
        )
        far_featured = self._property(
            "far-featured",
            is_featured=True,
            latitude="28.613939",
            longitude="77.209021",
        )

        response = self.client.get(
            self.url,
            {"latitude": "9.931233", "longitude": "76.267303"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            set(response.data.keys()),
            {"property_types", "featured_properties", "new_properties", "banner"},
        )

        new_ids = {item["id"] for item in response.data["new_properties"]}
        featured_ids = {item["id"] for item in response.data["featured_properties"]}

        self.assertIn(nearby.id, new_ids)
        self.assertNotIn(far.id, new_ids)
        self.assertIn(far_featured.id, featured_ids)

    def test_without_lat_lng_new_properties_unfiltered(self):
        nearby = self._property(
            "nearby-unfiltered",
            latitude="9.931233",
            longitude="76.267303",
        )
        far = self._property(
            "far-unfiltered",
            latitude="28.613939",
            longitude="77.209021",
        )

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        new_ids = {item["id"] for item in response.data["new_properties"]}
        self.assertIn(nearby.id, new_ids)
        self.assertIn(far.id, new_ids)
