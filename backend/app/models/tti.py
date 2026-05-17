from sqlalchemy import JSON, Enum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class TtiQuestion(Base):
    __tablename__ = "tti_questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    axis: Mapped[str] = mapped_column(Enum("PW", "NC", "FA", "HS"), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    left_label: Mapped[str] = mapped_column(String(200), nullable=False)
    right_label: Mapped[str] = mapped_column(String(200), nullable=False)
    left_letter: Mapped[str] = mapped_column(String(1), nullable=False)
    right_letter: Mapped[str] = mapped_column(String(1), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class TravelType(Base):
    __tablename__ = "travel_types"

    code: Mapped[str] = mapped_column(String(4), primary_key=True)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    keywords_json: Mapped[list] = mapped_column(JSON, default=list)
