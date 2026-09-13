import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class UserConsent(Base):
    """One consent decision, stored as history rather than as current state.

    Rows are never updated and never soft-deleted. Withdrawing marketing
    consent appends a row with ``accepted`` false instead of editing the
    earlier one, so the record keeps both the moment consent was given and the
    moment it was taken back -- which is what the marketing-consent rules
    require us to be able to produce. The current answer for a
    (user, consent_type) pair is simply the newest row.

    Note the absence of ``deleted_at``: every other table here soft-deletes,
    but a consent ledger with a delete path is not a ledger. Rows go away only
    with the user, via the cascade.
    """

    __tablename__ = "user_consents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # One of the constants in app.legal.
    consent_type: Mapped[str] = mapped_column(String(30), nullable=False)
    # The document version the user was shown, validated against
    # legal.CURRENT_VERSIONS before the row is written.
    version: Mapped[str] = mapped_column(String(40), nullable=False)
    accepted: Mapped[bool] = mapped_column(Boolean, nullable=False)
    # "signup" | "matching_gate" | "settings".
    source: Mapped[str] = mapped_column(String(20), nullable=False)
    # Set from the server clock. A client-supplied timestamp would be the one
    # field of the record worth forging.
    accepted_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    __table_args__ = (
        # Every read is "this user's rows for this type, newest first".
        Index("ix_user_consents_user_type_time", "user_id", "consent_type", "accepted_at"),
    )
