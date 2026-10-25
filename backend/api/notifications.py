"""
Plain-text emails about consultations and contact messages.

Emails go through Django's mail settings, so without SMTP they are printed in
the runserver terminal. A failed send never blocks the booking or message.
"""

import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail

from .models import Consultation, ContactLead

logger = logging.getLogger(__name__)

SIGN_OFF = "\n\nThe INTERIO studio"


def send(subject: str, body: str, recipients: list[str]) -> None:
    recipients = [email for email in recipients if email]
    if not recipients:
        return
    try:
        send_mail(f"INTERIO: {subject}", body, settings.DEFAULT_FROM_EMAIL, recipients)
    except Exception:  # SMTP errors, bad credentials, timeouts...
        logger.exception("Could not send %r to %s", subject, recipients)


def staff_recipients() -> list[str]:
    """STAFF_NOTIFICATION_EMAILS if set, otherwise every active staff user."""
    if settings.STAFF_NOTIFICATION_EMAILS:
        return settings.STAFF_NOTIFICATION_EMAILS
    staff = get_user_model().objects.filter(is_staff=True, is_active=True).exclude(email="")
    return list(staff.values_list("email", flat=True))


def when(consultation: Consultation) -> str:
    time = consultation.time_slot.strftime("%I:%M %p").lstrip("0")
    return f"{consultation.date:%A, %d %B %Y} at {time}"


def customer_name(consultation: Consultation) -> str:
    return consultation.user.first_name or consultation.user.email


def details(consultation: Consultation) -> str:
    lines = [f"When: {when(consultation)}", f"Type: {consultation.get_mode_display()}"]
    if consultation.address:
        lines.append(f"Address: {consultation.address}")
    if consultation.estimate:
        lines.append(f"Estimate: {consultation.estimate.reference} {consultation.estimate.title}")
    if consultation.notes:
        lines.append(f"Notes: {consultation.notes}")
    return "\n".join(lines)


def consultation_booked(consultation: Consultation) -> None:
    send(
        "We've received your consultation request",
        f"Hi {customer_name(consultation)},\n\n"
        "Thanks for booking a consultation. We'll confirm it shortly.\n\n"
        f"{details(consultation)}\n\n"
        f"See your bookings: {settings.FRONTEND_URL}/dashboard/consultations{SIGN_OFF}",
        [consultation.user.email],
    )
    send(
        f"New consultation request from {customer_name(consultation)}",
        f"{customer_name(consultation)} <{consultation.user.email}> asked for a consultation.\n\n"
        f"{details(consultation)}\n\n"
        f"Confirm it in the staff panel: {settings.FRONTEND_URL}/staff/consultations",
        staff_recipients(),
    )


def consultation_rescheduled(consultation: Consultation) -> None:
    send(
        f"{customer_name(consultation)} moved their consultation",
        f"{customer_name(consultation)} <{consultation.user.email}> picked a new time. It needs confirming again.\n\n"
        f"{details(consultation)}\n\n"
        f"Staff panel: {settings.FRONTEND_URL}/staff/consultations",
        staff_recipients(),
    )


def consultation_cancelled_by_customer(consultation: Consultation) -> None:
    send(
        f"{customer_name(consultation)} cancelled their consultation",
        f"{customer_name(consultation)} <{consultation.user.email}> cancelled this booking, "
        "so the slot is free again.\n\n"
        f"{details(consultation)}",
        staff_recipients(),
    )


STATUS_MESSAGES = {
    Consultation.Status.CONFIRMED: ("Your consultation is confirmed", "Your consultation is confirmed. See you then!"),
    Consultation.Status.COMPLETED: (
        "Thanks for meeting us",
        "Thanks for meeting us. Your designer will follow up with the next steps.",
    ),
    Consultation.Status.CANCELLED: (
        "Your consultation has been cancelled",
        "Unfortunately we had to cancel this consultation. Please book another time that suits you.",
    ),
    Consultation.Status.REQUESTED: ("Your consultation is pending again", "We've moved your booking back to pending."),
}


def consultation_updated_by_staff(consultation: Consultation, old_status: str, old_note: str) -> None:
    """Tell the customer when the studio changes the status or leaves a note."""
    status_changed = consultation.status != old_status
    note_changed = consultation.staff_note.strip() and consultation.staff_note != old_note
    if not status_changed and not note_changed:
        return

    if status_changed:
        subject, message = STATUS_MESSAGES[consultation.status]
    else:
        subject, message = "A note about your consultation", "The studio added a note to your booking."
    note = f"\n\nNote from the studio:\n{consultation.staff_note}" if consultation.staff_note.strip() else ""
    send(
        subject,
        f"Hi {customer_name(consultation)},\n\n{message}\n\n{details(consultation)}{note}\n\n"
        f"See your bookings: {settings.FRONTEND_URL}/dashboard/consultations{SIGN_OFF}",
        [consultation.user.email],
    )


def contact_received(lead: ContactLead) -> None:
    send(
        f"New message from {lead.name}",
        f"From: {lead.name} <{lead.email}>" + (f", {lead.phone}" if lead.phone else "") + "\n\n"
        f"{lead.message}\n\n"
        f"Reply by email, then mark it resolved: {settings.FRONTEND_URL}/staff/messages",
        staff_recipients(),
    )
