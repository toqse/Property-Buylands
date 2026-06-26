from django.contrib.auth.models import User
from django.core import mail
from rest_framework import status
from rest_framework.test import APITestCase

from properties.models import City, District, Property, PropertyType, State


class ContactEnquiryEmailTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_user(
            username="owner_enquiry",
            email="owner_enquiry@test.com",
            password="testpass123",
        )
        cls.state = State.objects.create(name="EnquiryState")
        cls.district = District.objects.create(name="EnquiryDistrict", state=cls.state)
        cls.city = City.objects.create(name="EnquiryCity", district=cls.district)
        cls.property_type = PropertyType.objects.create(name="House")

    def _approved_property(self, **overrides):
        data = {
            "property_for": "sell",
            "property_ownership": "direct_owner",
            "contact_name": "Seller",
            "whatsapp_number": "9999999999",
            "phone_number": "9999999999",
            "email": "seller_listing@test.com",
            "state": self.state,
            "district": self.district,
            "city": self.city,
            "title": "Test Property",
            "slug": "test-property-enquiry",
            "price": "50 Lakh",
            "property_type": self.property_type,
            "area": 1200,
            "area_unit": "sqft",
            "moderation_status": Property.MODERATION_APPROVED,
            "created_by": self.owner,
        }
        data.update(overrides)
        return Property.objects.create(**data)

    def test_property_enquiry_emails_listing_contact(self):
        prop = self._approved_property()
        mail.outbox.clear()

        response = self.client.post(
            "/api/properties/contacts/",
            {
                "name": "Buyer",
                "email": "buyer@test.com",
                "phone_number": "8888888888",
                "subject": 'Enquiry about "Test Property"',
                "message": "I am interested.",
                "property": prop.pk,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["seller_listing@test.com"])
        self.assertEqual(mail.outbox[0].reply_to, ["buyer@test.com"])
        self.assertIn("Buyer", mail.outbox[0].body)

    def test_property_enquiry_falls_back_to_owner_account_email(self):
        prop = self._approved_property(email="")
        mail.outbox.clear()

        response = self.client.post(
            "/api/properties/contacts/",
            {
                "name": "Buyer",
                "email": "buyer@test.com",
                "phone_number": "8888888888",
                "subject": "Enquiry",
                "message": "Hello",
                "property": prop.pk,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["owner_enquiry@test.com"])
