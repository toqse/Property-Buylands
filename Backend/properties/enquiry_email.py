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


def _build_enquiry_email(contact: Contact, recipients: list[str]) -> EmailMessage:
    property_title = contact.property.title if contact.property_id else ""
    subject = (contact.subject or "").strip() or (
        f'Enquiry about "{property_title}"' if property_title else "New enquiry on Buylands India"
    )

    lines = ["You have received a new enquiry on Buylands India.", ""]
    if property_title:
        lines.append(f"Property: {property_title}")
    lines.extend(
        [
            f"From: {contact.name}",
            f"Email: {contact.email}",
            f"Phone: {contact.phone_number}",
        ]
    )
    if contact.budget_range:
        lines.append(f"Budget: {contact.budget_range}")
    lines.extend(["", "Message:", contact.message, "", f"Reply to the buyer at {contact.email}."])

    buyer_email = (contact.email or "").strip()
    return EmailMessage(
        subject=subject,
        body="\n".join(lines),
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
