import asyncio
import logging
import smtplib
from email.message import EmailMessage
from urllib.parse import quote

from fastapi import HTTPException

from ..config import settings

logger = logging.getLogger(__name__)


def ensure_password_reset_delivery() -> None:
    if settings.password_reset_debug:
        return
    if not settings.smtp_host or not settings.smtp_from_email:
        raise HTTPException(
            status_code=503,
            detail="비밀번호 재설정 메일 발송 설정이 필요합니다.",
        )


async def send_password_reset(email: str, token: str) -> None:
    link = f"{settings.frontend_base_url.rstrip('/')}/password-reset?token={quote(token)}"
    if settings.password_reset_debug:
        logger.warning("PASSWORD_RESET_DEBUG reset link for %s: %s", email, link)
        return
    try:
        await asyncio.to_thread(_send_smtp, email, link)
    except (OSError, smtplib.SMTPException) as exc:
        logger.exception("Failed to send password reset email")
        raise HTTPException(
            status_code=503,
            detail="비밀번호 재설정 메일을 보내지 못했습니다. 잠시 후 다시 시도해주세요.",
        ) from exc


def _send_smtp(email: str, link: str) -> None:
    message = EmailMessage()
    message["Subject"] = "[OddTrip] 비밀번호 재설정"
    message["From"] = settings.smtp_from_email
    message["To"] = email
    message.set_content(
        "OddTrip 비밀번호를 재설정하려면 아래 링크를 열어주세요.\n\n"
        f"{link}\n\n"
        f"링크는 {settings.password_reset_token_expire_minutes}분 동안 한 번만 사용할 수 있습니다.\n"
        "직접 요청하지 않았다면 이 메일을 무시하세요."
    )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as client:
        if settings.smtp_starttls:
            client.starttls()
        if settings.smtp_username:
            client.login(settings.smtp_username, settings.smtp_password)
        client.send_message(message)
