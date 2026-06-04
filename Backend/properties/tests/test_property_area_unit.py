from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from properties.models import City, District, Property, PropertyType, State


class PropertyAreaUnitValidationTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.staff = User.objects.create_user(
            username="staff_area_unit",
            email="staff_area_unit@test.com",
            password="testpass123",
            is_staff=True,
        )
        cls.token = Token.objects.create(user=cls.staff)
        cls.state = State.objects.create(name="AreaUnitState")
        cls.district = District.objects.create(name="AreaUnitDistrict", state=cls.state)
        cls.city = City.objects.create(name="AreaUnitCity", district=cls.district)
        cls.property_type = PropertyType.objects.create(name="Plot")

    def setUp(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        self.url = "/api/properties/properties/"

    def _base_payload(self, **overrides):
        data = {
            "property_for": "sell",
            "property_ownership": "direct_owner",
            "contact_name": "Agent",
            "whatsapp_number": "9999999999",
            "phone_number": "9999999999",
            "email": "agent_area_unit@test.com",
            "state": str(self.state.pk),
            "district": str(self.district.pk),
            "city": str(self.city.pk),
            "title": "Area Unit Test Listing",
            "price": "1000000",
            "property_type": self.property_type.pk,
            "area": 100,
            "description": "Test description",
        }
        data.update(overrides)
        return data

    def _built_fields(self):
        return {
            "bedrooms": 2,
            "bathrooms": 1,
            "built_year": 2020,
            "furnishing": "furnished",
        }

    def test_create_cent_without_built_fields_succeeds(self):
        response = self.client.post(
            self.url,
            self._base_payload(area_unit="cent", title="Cent Plot"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["area_unit"], "cent")
        self.assertIsNone(response.data["bedrooms"])
        self.assertIsNone(response.data["bathrooms"])
        self.assertIsNone(response.data["built_year"])
        self.assertIsNone(response.data["furnishing"])

    def test_create_sqft_without_built_fields_fails(self):
        response = self.client.post(
            self.url,
            self._base_payload(area_unit="sqft", title="Sqft Home"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # built_year is optional on every area_unit, so it must not be flagged here.
        for field in ("bedrooms", "bathrooms", "furnishing"):
            self.assertIn(field, response.data)
        self.assertNotIn("built_year", response.data)

    def test_create_sqft_without_built_year_succeeds(self):
        payload = self._base_payload(
            area_unit="sqft",
            title="Sqft Home Without Built Year",
            bedrooms=2,
            bathrooms=1,
            furnishing="furnished",
        )
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data["built_year"])

    def test_create_default_sqft_without_built_fields_fails(self):
        response = self.client.post(
            self.url,
            self._base_payload(title="Default Sqft Home"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("bedrooms", response.data)

    def test_create_sqft_with_built_fields_succeeds(self):
        response = self.client.post(
            self.url,
            self._base_payload(
                area_unit="sqft",
                title="Sqft Home Complete",
                **self._built_fields(),
            ),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["bedrooms"], 2)

    def test_patch_cent_to_sqft_without_built_fields_fails(self):
        create_resp = self.client.post(
            self.url,
            self._base_payload(area_unit="cent", title="Cent To Sqft"),
            format="json",
        )
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        prop_id = create_resp.data["id"]

        patch_resp = self.client.patch(
            f"{self.url}{prop_id}/",
            {"area_unit": "sqft"},
            format="json",
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("bedrooms", patch_resp.data)
        # built_year is optional and must never be flagged as required.
        self.assertNotIn("built_year", patch_resp.data)

    def test_patch_sqft_to_cent_clears_built_fields(self):
        create_resp = self.client.post(
            self.url,
            self._base_payload(
                area_unit="sqft",
                title="Sqft To Cent",
                **self._built_fields(),
            ),
            format="json",
        )
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        prop_id = create_resp.data["id"]

        patch_resp = self.client.patch(
            f"{self.url}{prop_id}/",
            {"area_unit": "cent"},
            format="json",
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data["area_unit"], "cent")
        self.assertIsNone(patch_resp.data["bedrooms"])
        self.assertIsNone(patch_resp.data["bathrooms"])
        self.assertIsNone(patch_resp.data["built_year"])
        self.assertIsNone(patch_resp.data["furnishing"])

        prop = Property.objects.get(pk=prop_id)
        self.assertIsNone(prop.bedrooms)
        self.assertIsNone(prop.bathrooms)
