from django.contrib.auth.models import User
from decimal import Decimal
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from properties.models import City, District, Feature, Property, PropertyType, State


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
            "built_year": "2020",
            "furnishing": "furnished",
        }

    def _assert_empty_built_year(self, value):
        self.assertIn(value, ("", None))

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
        self._assert_empty_built_year(response.data["built_year"])
        self.assertIsNone(response.data["furnishing"])

    def test_create_sqft_without_built_fields_succeeds(self):
        response = self.client.post(
            self.url,
            self._base_payload(area_unit="sqft", title="Sqft Home"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["area_unit"], "sqft")
        self.assertIsNone(response.data["bedrooms"])
        self.assertIsNone(response.data["bathrooms"])
        self._assert_empty_built_year(response.data["built_year"])
        self.assertIsNone(response.data["furnishing"])

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
        self._assert_empty_built_year(response.data["built_year"])

    def test_create_default_sqft_without_built_fields_succeeds(self):
        response = self.client.post(
            self.url,
            self._base_payload(title="Default Sqft Home"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["area_unit"], "sqft")
        self.assertIsNone(response.data["bedrooms"])

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
        self.assertEqual(response.data["built_year"], "2020")

    def test_patch_cent_to_sqft_without_built_fields_succeeds(self):
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
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data["area_unit"], "sqft")
        self.assertIsNone(patch_resp.data["bedrooms"])
        self.assertIsNone(patch_resp.data["bathrooms"])
        self._assert_empty_built_year(patch_resp.data["built_year"])
        self.assertIsNone(patch_resp.data["furnishing"])

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
        self.assertEqual(patch_resp.data["built_year"], "2020")
        self.assertIsNone(patch_resp.data["furnishing"])

        prop = Property.objects.get(pk=prop_id)
        self.assertIsNone(prop.bedrooms)
        self.assertIsNone(prop.bathrooms)
        self.assertEqual(prop.built_year, "2020")

    def test_patch_explicit_zero_clears_bedrooms(self):
        create_resp = self.client.post(
            self.url,
            self._base_payload(
                area_unit="sqft",
                title="Clear Bedrooms On Patch",
                **self._built_fields(),
            ),
            format="json",
        )
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        prop_id = create_resp.data["id"]

        patch_resp = self.client.patch(
            f"{self.url}{prop_id}/",
            {"bedrooms": "0"},
            format="multipart",
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertIsNone(patch_resp.data["bedrooms"])
        self.assertEqual(patch_resp.data["bathrooms"], 1)

        prop = Property.objects.get(pk=prop_id)
        self.assertIsNone(prop.bedrooms)
        self.assertEqual(prop.bathrooms, 1)

    def test_create_without_description_succeeds(self):
        payload = self._base_payload(title="No Description Listing")
        payload.pop("description", None)
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["description"], "")

    def test_patch_empty_description_and_built_year(self):
        create_resp = self.client.post(
            self.url,
            self._base_payload(
                area_unit="sqft",
                title="Clear Description And Year",
                description="Has text",
                **self._built_fields(),
            ),
            format="json",
        )
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        prop_id = create_resp.data["id"]

        patch_resp = self.client.patch(
            f"{self.url}{prop_id}/",
            {"description": "", "built_year": ""},
            format="multipart",
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data["description"], "")
        self.assertEqual(patch_resp.data["built_year"], "")

        prop = Property.objects.get(pk=prop_id)
        self.assertEqual(prop.description, "")
        self.assertEqual(prop.built_year, "")

    def test_patch_clear_all_features(self):
        pool = Feature.objects.create(name="Pool")
        gym = Feature.objects.create(name="Gym")
        create_resp = self.client.post(
            self.url,
            self._base_payload(
                area_unit="sqft",
                title="Features Listing",
                features=[pool.pk, gym.pk],
            ),
            format="json",
        )
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        prop_id = create_resp.data["id"]
        self.assertEqual(len(create_resp.data.get("feature_details", [])), 2)

        patch_resp = self.client.patch(
            f"{self.url}{prop_id}/",
            {"features": "[]"},
            format="multipart",
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data.get("feature_details", []), [])

        prop = Property.objects.get(pk=prop_id)
        self.assertEqual(list(prop.features.values_list("pk", flat=True)), [])

    def test_create_with_decimal_area_sqft(self):
        response = self.client.post(
            self.url,
            self._base_payload(area="1250.50", title="Decimal Sqft"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["area"], [1250.5])

        prop = Property.objects.get(pk=response.data["id"])
        self.assertEqual(prop.area, ["1250.5"])

    def test_create_with_decimal_area_cent_unit(self):
        response = self.client.post(
            self.url,
            self._base_payload(area="5.75", area_unit="cent", title="Decimal Cent"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["area"], [5.75])
        self.assertEqual(response.data["area_unit"], "cent")

    def test_create_with_decimal_area_and_area_cent(self):
        both_type = PropertyType.objects.create(
            name="Plot Both Units",
            has_area_both=True,
        )
        response = self.client.post(
            self.url,
            self._base_payload(
                area="3200.25",
                area_cent="5.75",
                area_unit="sqft",
                property_type=both_type.pk,
                title="Decimal Both",
            ),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["area"], [3200.25])
        self.assertEqual(response.data["area_cent"], [5.75])

    def test_create_with_zero_area(self):
        response = self.client.post(
            self.url,
            self._base_payload(area="0", title="Zero Area"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["area"], [0.0])

        prop = Property.objects.get(pk=response.data["id"])
        self.assertEqual(prop.area, ["0"])

    def test_create_with_zero_area_cent(self):
        both_type = PropertyType.objects.create(
            name="Plot Both Zero Cent",
            has_area_both=True,
        )
        response = self.client.post(
            self.url,
            self._base_payload(
                area="3200.25",
                area_cent="0",
                area_unit="sqft",
                property_type=both_type.pk,
                title="Zero Cent Both",
            ),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["area_cent"], [0.0])

        prop = Property.objects.get(pk=response.data["id"])
        self.assertEqual(prop.area_cent, ["0"])

    def test_patch_area_cent_to_zero(self):
        both_type = PropertyType.objects.create(
            name="Plot Patch Zero Cent",
            has_area_both=True,
        )
        create_resp = self.client.post(
            self.url,
            self._base_payload(
                area="3200.25",
                area_cent="5.75",
                area_unit="sqft",
                property_type=both_type.pk,
                title="Patch Zero Cent",
            ),
            format="json",
        )
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        prop_id = create_resp.data["id"]

        patch_resp = self.client.patch(
            f"{self.url}{prop_id}/",
            {"area_cent": "0"},
            format="json",
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data["area_cent"], [0.0])

        prop = Property.objects.get(pk=prop_id)
        self.assertEqual(prop.area_cent, ["0"])

    def test_patch_decimal_area(self):
        create_resp = self.client.post(
            self.url,
            self._base_payload(area=100, title="Patch Decimal Area"),
            format="json",
        )
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        prop_id = create_resp.data["id"]

        patch_resp = self.client.patch(
            f"{self.url}{prop_id}/",
            {"area": "1250.50"},
            format="json",
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data["area"], [1250.5])

    def test_create_with_comma_separated_area_values(self):
        response = self.client.post(
            self.url,
            self._base_payload(area="23.56, 56.677, 4.56", title="Multi Area Sqft"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["area"], [23.56, 56.677, 4.56])

        prop = Property.objects.get(pk=response.data["id"])
        self.assertEqual(prop.area, ["23.56", "56.677", "4.56"])
        self.assertEqual(prop.area_range_min, Decimal("4.56"))
        self.assertEqual(prop.area_range_max, Decimal("56.677"))

    def test_create_with_comma_separated_area_cent_values(self):
        both_type = PropertyType.objects.create(
            name="Plot Multi Cent",
            has_area_both=True,
        )
        response = self.client.post(
            self.url,
            self._base_payload(
                area="3200.25",
                area_cent="5.75, 2.1",
                area_unit="sqft",
                property_type=both_type.pk,
                title="Multi Cent Both",
            ),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["area_cent"], [5.75, 2.1])

    def test_filter_area_min_matches_any_value(self):
        self.client.post(
            self.url,
            self._base_payload(
                area="10, 60",
                title="Filter Match Multi",
            ),
            format="json",
        )
        response = self.client.get(self.url, {"area_min": "50", "area_unit": "sqft"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [item["title"] for item in response.data.get("results", response.data)]
        self.assertIn("Filter Match Multi", titles)

    def test_filter_area_min_excludes_when_no_value_qualifies(self):
        self.client.post(
            self.url,
            self._base_payload(
                area="10, 30",
                title="Filter Exclude Multi",
            ),
            format="json",
        )
        response = self.client.get(self.url, {"area_min": "50", "area_unit": "sqft"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [item["title"] for item in response.data.get("results", response.data)]
        self.assertNotIn("Filter Exclude Multi", titles)
