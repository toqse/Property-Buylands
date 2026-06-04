from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from properties.models import PropertyType


def _icon_file(name="icon.png", content=None):
    return SimpleUploadedFile(
        name,
        content or (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
            b"\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
            b"\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4"
            b"\x00\x00\x00\x00IEND\xaeB`\x82"
        ),
        content_type="image/png",
    )


class PropertyTypeImageTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username="ptype_staff",
            email="ptype_staff@test.com",
            password="testpass123",
            is_staff=True,
        )
        cls.token = Token.objects.create(user=cls.user)

    def setUp(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        self.url = "/api/properties/property-types/"

    def test_create_without_image_fails(self):
        response = self.client.post(self.url, {"name": "Villa"}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("image", response.data)

    def test_create_with_image_succeeds(self):
        response = self.client.post(
            self.url,
            {"name": "Apartment", "image": _icon_file()},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Apartment")
        self.assertIsNotNone(response.data["image"])
        self.assertIn("property_types/icons/", response.data["image"])

    def test_patch_without_image_when_missing_fails(self):
        ptype = PropertyType.objects.create(name="Legacy Type")
        response = self.client.patch(
            f"{self.url}{ptype.pk}/",
            {"name": "Renamed"},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("image", response.data)

    def test_patch_with_image_succeeds(self):
        ptype = PropertyType.objects.create(name="Legacy Type")
        response = self.client.patch(
            f"{self.url}{ptype.pk}/",
            {"image": _icon_file("updated.png")},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data["image"])

    def test_patch_name_only_when_image_exists_succeeds(self):
        ptype = PropertyType.objects.create(name="With Icon")
        ptype.image = _icon_file()
        ptype.save()

        response = self.client.patch(
            f"{self.url}{ptype.pk}/",
            {"name": "Renamed Icon Type"},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Renamed Icon Type")
        self.assertIsNotNone(response.data["image"])
