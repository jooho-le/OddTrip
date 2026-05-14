import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Match(Base):
    __tablename__ = "matches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    matched_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    match_level: Mapped[str] = mapped_column(
        Enum("완전 반대", "부분 반대", "추천"), nullable=False
    )
    recommendation_score: Mapped[int] = mapped_column(Integer, default=0)
    compatibility: Mapped[str | None] = mapped_column(Text)
    differences_json: Mapped[list | None] = mapped_column(JSON)
    complements_json: Mapped[list | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
