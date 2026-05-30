import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    match_id: Mapped[str] = mapped_column(String(36), ForeignKey("matches.id"), nullable=False)
    preferences_json: Mapped[dict | None] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(20), default="planning")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class Attraction(Base):
    __tablename__ = "attractions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trip_id: Mapped[str] = mapped_column(String(36), ForeignKey("trips.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    reason: Mapped[str | None] = mapped_column(Text)
    tags_json: Mapped[list | None] = mapped_column(JSON)
    indoor: Mapped[bool] = mapped_column(Boolean, default=False)
    active: Mapped[bool] = mapped_column(Boolean, default=False)
    famous: Mapped[bool] = mapped_column(Boolean, default=False)
    saved: Mapped[bool] = mapped_column(Boolean, default=False)
    excluded: Mapped[bool] = mapped_column(Boolean, default=False)
    content_id: Mapped[str | None] = mapped_column(String(50))
    content_type_id: Mapped[str | None] = mapped_column(String(20))
    source: Mapped[str | None] = mapped_column(String(50))
    addr1: Mapped[str | None] = mapped_column(String(500))
    addr2: Mapped[str | None] = mapped_column(String(500))
    map_x: Mapped[str | None] = mapped_column(String(50))
    map_y: Mapped[str | None] = mapped_column(String(50))
    area_code: Mapped[str | None] = mapped_column(String(20))
    sigungu_code: Mapped[str | None] = mapped_column(String(20))
    tel: Mapped[str | None] = mapped_column(String(100))
    homepage: Mapped[str | None] = mapped_column(Text)
    opening_hours_json: Mapped[dict | None] = mapped_column(JSON)
    closed_days_json: Mapped[list | None] = mapped_column(JSON)
    congestion_score: Mapped[int | None] = mapped_column(Integer)
    hidden_score: Mapped[int | None] = mapped_column(Integer)
    related_rank: Mapped[int | None] = mapped_column(Integer)
    raw_json: Mapped[dict | None] = mapped_column(JSON)


class ItineraryItem(Base):
    __tablename__ = "itinerary_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trip_id: Mapped[str] = mapped_column(String(36), ForeignKey("trips.id"), nullable=False)
    day: Mapped[int] = mapped_column(Integer, nullable=False)
    day_title: Mapped[str | None] = mapped_column(String(200))
    day_weather: Mapped[str | None] = mapped_column(String(200))
    day_caution: Mapped[str | None] = mapped_column(Text)
    time: Mapped[str | None] = mapped_column(String(10))
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    location: Mapped[str | None] = mapped_column(String(200))
    duration: Mapped[str | None] = mapped_column(String(50))
    move_time: Mapped[str | None] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(Text)
    ai_reason: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class SafetyAlert(Base):
    __tablename__ = "safety_alerts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trip_id: Mapped[str] = mapped_column(String(36), ForeignKey("trips.id"), nullable=False)
    level: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str | None] = mapped_column(Text)
    action: Mapped[str | None] = mapped_column(Text)
    time: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
