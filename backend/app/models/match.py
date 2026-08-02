import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Match(Base):
    __tablename__ = "matches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    matched_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    match_level: Mapped[str] = mapped_column(String(20), nullable=False)
    recommendation_score: Mapped[int] = mapped_column(Integer, default=0)
    compatibility: Mapped[str | None] = mapped_column(Text)
    differences_json: Mapped[list | None] = mapped_column(JSON)
    complements_json: Mapped[list | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# A pair may only be matched once, in either direction. Ordering the two ids
# makes (A,B) and (B,A) collide on the same index entry, so concurrent accepts
# can no longer slip a duplicate past the check in the accept_match router.
Index(
    "uq_matches_pair",
    func.least(Match.user_id, Match.matched_user_id),
    func.greatest(Match.user_id, Match.matched_user_id),
    unique=True,
)
