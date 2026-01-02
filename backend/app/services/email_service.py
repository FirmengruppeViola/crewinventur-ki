import smtplib
import ssl
from email.message import EmailMessage

import anyio

from app.core.config import settings


def _send_email_sync(message: EmailMessage) -> None:
    context = ssl.create_default_context()
    if not settings.SMTP_VERIFY_CERT:
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
    if settings.SMTP_USE_SSL:
        with smtplib.SMTP_SSL(
            settings.SMTP_HOST,
            settings.SMTP_PORT,
            timeout=10,
            context=context,
        ) as smtp:
            if settings.SMTP_USER:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(message)
        return

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
        smtp.ehlo()
        if settings.SMTP_USE_TLS:
            smtp.starttls(context=context)
            smtp.ehlo()
        if settings.SMTP_USER:
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.send_message(message)


async def send_inventory_email(
    to_email: str,
    subject: str,
    body: str,
    pdf_attachment: bytes,
    csv_attachment: bytes,
    session_id: str,
) -> bool:
    """Sendet Inventur-Export per Email."""
    if not settings.SMTP_HOST or not settings.SMTP_FROM:
        return False

    message = EmailMessage()
    message["To"] = to_email
    message["From"] = settings.SMTP_FROM
    message["Subject"] = subject
    message.set_content("Bitte nutzen Sie einen HTML-faehigen Email-Client.")
    message.add_alternative(body, subtype="html")

    message.add_attachment(
        pdf_attachment,
        maintype="application",
        subtype="pdf",
        filename=f"inventur-{session_id}.pdf",
    )
    message.add_attachment(
        csv_attachment,
        maintype="text",
        subtype="csv",
        filename=f"inventur-zusammenfassung-{session_id}.csv",
    )

    try:
        await anyio.to_thread.run_sync(_send_email_sync, message)
        return True
    except Exception as exc:
        print(f"Email send failed: {exc}")
        return False
