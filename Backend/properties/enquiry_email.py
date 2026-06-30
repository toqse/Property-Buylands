import logging

from django.conf import settings
from django.core.mail import EmailMessage

from .models import Contact, Property, SiteSettings

logger = logging.getLogger(__name__)


def _from_email() -> str:
    return getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@buylandsindia.com")


def enquiry_recipients(contact: Contact) -> list[str]:
    """Resolve who should receive this enquiry (property owner or company inbox)."""
    recipients: list[str] = []

    if contact.property_id:
        prop = (
            Property.objects.select_related("created_by")
            .filter(pk=contact.property_id)
            .first()
        )
        if prop:
            listing_email = (prop.email or "").strip()
            if listing_email:
                recipients.append(listing_email)
            elif prop.created_by_id:
                owner_email = (prop.created_by.email or "").strip()
                if owner_email:
                    recipients.append(owner_email)

    if not recipients:
        company_email = (SiteSettings.get_settings().company_email or "").strip()
        if company_email:
            recipients.append(company_email)

    # Preserve order, drop duplicates.
    seen: set[str] = set()
    unique: list[str] = []
    for addr in recipients:
        key = addr.lower()
        if key not in seen:
            seen.add(key)
            unique.append(addr)
    return unique


def _format_enquiry_type(subject: str) -> str:
    """Normalize enquiry subject for display, e.g. 'Rent enquiry' -> 'Rent Enquiry'."""
    subject = (subject or "").strip()
    if not subject:
        return "General Enquiry"
    lower = subject.lower()
    if lower.endswith(" enquiry"):
        prefix = subject[: -len(" enquiry")].strip()
        if prefix:
            return f"{prefix} Enquiry"
        return "General Enquiry"
    return subject


def _build_enquiry_email_body(contact: Contact) -> str:
    property_title = ""
    if contact.property_id:
        prop = contact.property
        property_title = (prop.title if prop else "").strip()

    enquiry_type = _format_enquiry_type(contact.subject)
    name = (contact.name or "").strip()
    email = (contact.email or "").strip()
    phone = (contact.phone_number or "").strip()
    budget = (contact.budget_range or "").strip()
    message = contact.message or ""

    lines = [
        "Dear Team,",
        "",
        "A new property enquiry has been submitted on Buylands India.",
        "",
        "Enquiry Details",
        "-------------------------",
        f"Enquiry Type : {enquiry_type}",
    ]
    if property_title:
        lines.append(f"Property     : {property_title}")
    lines.extend(
        [
            f"Customer Name: {name}",
            f"Email Address: {email}",
            f"Phone Number : {phone}",
        ]
    )
    if budget:
        lines.append(f"Budget Range : {budget}")
    lines.extend(
        [
            "",
            "Customer Message:",
            message,
            "",
            "Action Required:",
            (
                "Please review the customer's requirements and contact them at your "
                "earliest convenience to provide suitable property options and assistance."
            ),
            "",
            "You may reach the customer via:",
            f"📧 {email}",
        ]
    )
    if phone:
        lines.append(f"📞 {phone}")
    lines.extend(
        [
            "",
            "Regards,",
            "Buylands India",
            "Automated Enquiry Notification",
            "https://buylandsindia.com",
            "",
            "This is an automated email. Please do not reply to this message.",
        ]
    )
    return "\n".join(lines)


def _build_enquiry_email(contact: Contact, recipients: list[str]) -> EmailMessage:
    property_title = ""
    if contact.property_id:
        prop = contact.property
        property_title = (prop.title if prop else "").strip()

    subject = (contact.subject or "").strip() or (
        f'Enquiry about "{property_title}"' if property_title else "New enquiry on Buylands India"
    )

    buyer_email = (contact.email or "").strip()
    return EmailMessage(
        subject=subject,
        body=_build_enquiry_email_body(contact),
        from_email=_from_email(),
        to=recipients,
        reply_to=[buyer_email] if buyer_email else None,
    )


def send_enquiry_notification(contact: Contact) -> tuple[bool, list[str]]:
    """
    Email the property owner (or company inbox for general enquiries).
    Returns (sent, recipient_addresses).
    """
    recipients = enquiry_recipients(contact)
    if not recipients:
        logger.warning("Enquiry %s saved but no recipient email is configured.", contact.pk)
        return False, []

    try:
        _build_enquiry_email(contact, recipients).send(fail_silently=False)
        logger.info("Enquiry %s emailed to %s", contact.pk, ", ".join(recipients))
        return True, recipients
    except Exception:
        logger.exception("Failed to send enquiry %s notification.", contact.pk)
        return False, recipients
