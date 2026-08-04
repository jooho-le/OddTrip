import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class RefreshToken(Base):
    """A refresh token that can be revoked.

    Access tokens stay stateless, so nothing can invalidate one before it
    expires. Keeping refresh tokens here is what makes logout and forced
    sign-out actually take effect: the access token is short lived, and a
    revoked refresh token cannot mint a new one.

    Only the SHA-256 of the token is stored. The value is high-entropy random
    rather than a password, so a plain digest is enough — a leaked table gives
    an attacker nothing usable.
    """

    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
