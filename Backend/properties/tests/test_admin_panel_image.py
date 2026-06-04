import json

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from properties.models import AdminPanelImage


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


class AdminPanelImageAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(
            username="gallery_admin",
            email="gallery_admin@test.com",
            password="testpass123",
            is_staff=True,
        )
        cls.admin_token = Token.objects.create(user=cls.admin)
        cls.user = User.objects.create_user(
            username="gallery_user",
            email="gallery_user@test.com",
            password="testpass123",
        )
        cls.user_token = Token.objects.create(user=cls.user)

    def setUp(self):
        self.url = "/api/properties/admin-images/"

    def test_public_list_success(self):
        AdminPanelImage.objects.create(title="Public Slide", image=_png_file())
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["max_allowed"], 5)
        self.assertEqual(len(response.data["results"]), 1)

    def test_create_single_requires_admin(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.user_token.key}")
        response = self.client.post(
            self.url,
            {"title": "Denied", "image": _png_file()},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_single_success(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.admin_token.key}")
        response = self.client.post(
            self.url,
            {"title": "Slide One", "image": _png_file()},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["title"], "Slide One")
        self.assertIn("admin_panel/images/", response.data["data"]["image_url"])

    def test_create_bulk_success(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.admin_token.key}")
        response = self.client.post(
            self.url,
            {
                "titles": json.dumps(["Bulk A", "Bulk B"]),
                "image_0": _png_file("a.png"),
                "image_1": _png_file("b.png"),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(AdminPanelImage.objects.count(), 2)

    def test_create_exceeds_max_five(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.admin_token.key}")
        for i in range(5):
            AdminPanelImage.objects.create(title=f"Existing {i}", image=_png_file(f"e{i}.png"))
        response = self.client.post(
            self.url,
            {"title": "Too Many", "image": _png_file("extra.png")},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])

    def test_title_max_length(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.admin_token.key}")
        response = self.client.post(
            self.url,
            {"title": "x" * 51, "image": _png_file()},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_and_delete(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.admin_token.key}")
        obj = AdminPanelImage.objects.create(title="Old", image=_png_file("old.png"))

        patch_resp = self.client.patch(
            f"{self.url}{obj.pk}/",
            {"title": "New Title"},
            format="multipart",
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data["data"]["title"], "New Title")

        del_resp = self.client.delete(f"{self.url}{obj.pk}/")
        self.assertEqual(del_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(del_resp.data["success"])
        self.assertEqual(AdminPanelImage.objects.count(), 0)
