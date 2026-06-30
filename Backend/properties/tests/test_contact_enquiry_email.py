from django.contrib.auth.models import User
from django.core import mail
from rest_framework import status
from rest_framework.test import APITestCase

from properties.models import City, District, Property, PropertyType, SiteSettings, State


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

    def _assert_template_body(self, body: str, *, email: str, phone: str = ""):
        self.assertIn("Dear Team,", body)
        self.assertIn("A new property enquiry has been submitted on Buylands India.", body)
        self.assertIn("Enquiry Details", body)
        self.assertIn("Action Required:", body)
        self.assertIn(f"📧 {email}", body)
        self.assertIn("Regards,", body)
        self.assertIn("Buylands India", body)
        self.assertIn("Automated Enquiry Notification", body)
        self.assertIn("https://buylandsindia.com", body)
        self.assertIn("This is an automated email. Please do not reply to this message.", body)
        if phone:
            self.assertIn(f"📞 {phone}", body)

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
        body = mail.outbox[0].body
        self.assertEqual(mail.outbox[0].to, ["seller_listing@test.com"])
        self.assertEqual(mail.outbox[0].reply_to, ["buyer@test.com"])
        self._assert_template_body(body, email="buyer@test.com", phone="8888888888")
        self.assertIn('Enquiry Type : Enquiry about "Test Property"', body)
        self.assertIn("Property     : Test Property", body)
        self.assertIn("Customer Name: Buyer", body)
        self.assertIn("I am interested.", body)

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

    def test_general_contact_enquiry_emails_company_inbox(self):
        settings = SiteSettings.get_settings()
        settings.company_email = "company@buylandsindia.com"
        settings.save(update_fields=["company_email"])
        mail.outbox.clear()

        response = self.client.post(
            "/api/properties/contacts/",
            {
                "name": "John Doe",
                "email": "abccompany@gmail.com",
                "phone_number": "07521366545",
                "subject": "Rent enquiry",
                "message": "Looking for a rental property.",
                "budget_range": "₹1,500,000 – ₹3,000,000",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 1)
        body = mail.outbox[0].body
        self.assertEqual(mail.outbox[0].to, ["company@buylandsindia.com"])
        self.assertEqual(mail.outbox[0].reply_to, ["abccompany@gmail.com"])
        self._assert_template_body(body, email="abccompany@gmail.com", phone="07521366545")
        self.assertIn("Enquiry Type : Rent Enquiry", body)
        self.assertNotIn("Property     :", body)
        self.assertIn("Customer Name: John Doe", body)
        self.assertIn("Budget Range : ₹1,500,000 – ₹3,000,000", body)
        self.assertIn("Looking for a rental property.", body)
