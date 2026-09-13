import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    match_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("matches.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # When and where the trip happens. These used to live inside
    # preferences_json, but the normalizer dropped every key it did not know,
    # so nothing could ever set them and the planner silently fell back to
    # "today, for three days, in 서울특별시".
    title: Mapped[str | None] = mapped_column(String(200))
    region: Mapped[str | None] = mapped_column(String(100))
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)

    preferences_json: Mapped[dict | None] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(20), default="planning")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class TripUserPreference(Base):
    """One traveller's private input before the pair agrees on joint preferences."""

    __tablename__ = "trip_user_preferences"
    __table_args__ = (
        UniqueConstraint("trip_id", "user_id", name="uq_trip_user_preferences_trip_user"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trip_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    preferences_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class TripPreferenceProposal(Base):
    """A joint-preference proposal that must be accepted by the other traveller."""

    __tablename__ = "trip_preference_proposals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trip_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True
    )
    proposed_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    responded_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    preferences_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", server_default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    responded_at: Mapped[datetime | None] = mapped_column(DateTime)


class Place(Base):
    """A real-world place, stored once and shared across trips.

    TourAPI places are deduplicated on ``content_id``. OpenAI-generated places
    have no stable identifier, so ``content_id`` stays NULL for them and
    duplicates are tolerated.

    ``indoor``/``active`` are derived from ``content_type_id`` for TourAPI rows
    but come straight from the model for OpenAI rows, which carry no
    ``content_type_id`` — so they are stored rather than computed on read.

    ``famous`` is NOT here: for TourAPI it depends on the hub lookup made at
    recommendation time, which changes between runs, so it belongs to
    TripAttraction.
    """

    __tablename__ = "places"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    content_id: Mapped[str | None] = mapped_column(String(50), unique=True)
    content_type_id: Mapped[str | None] = mapped_column(String(20))
    source: Mapped[str | None] = mapped_column(String(50))

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)

    addr1: Mapped[str | None] = mapped_column(String(500))
    addr2: Mapped[str | None] = mapped_column(String(500))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    area_code: Mapped[str | None] = mapped_column(String(20))
    sigungu_code: Mapped[str | None] = mapped_column(String(20))

    tel: Mapped[str | None] = mapped_column(String(100))
    homepage: Mapped[str | None] = mapped_column(Text)

    opening_hours_json: Mapped[dict | None] = mapped_column(JSON)
    closed_days_json: Mapped[list | None] = mapped_column(JSON)

    indoor: Mapped[bool] = mapped_column(Boolean, default=False)
    active: Mapped[bool] = mapped_column(Boolean, default=False)

    raw_json: Mapped[dict | None] = mapped_column(JSON)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class TripAttraction(Base):
    """A place recommended for one trip, plus that trip's state for it.

    Every column here varies per trip even when the place does not: the scores
    are computed against this pair's TTI midpoint and the congestion data of the
    moment, and saved/excluded are the travellers' own choices.
    """

    __tablename__ = "trip_attractions"
    __table_args__ = (
        UniqueConstraint("trip_id", "place_id", name="uq_trip_attractions_trip_place"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trip_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True
    )
    place_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("places.id", ondelete="CASCADE"), nullable=False, index=True
    )

    saved: Mapped[bool] = mapped_column(Boolean, default=False)
    excluded: Mapped[bool] = mapped_column(Boolean, default=False)

    famous: Mapped[bool] = mapped_column(Boolean, default=False)
    reason: Mapped[str | None] = mapped_column(Text)
    tags_json: Mapped[list | None] = mapped_column(JSON)

    score: Mapped[int | None] = mapped_column(Integer)
    congestion_score: Mapped[int | None] = mapped_column(Integer)
    hidden_score: Mapped[int | None] = mapped_column(Integer)
    related_rank: Mapped[int | None] = mapped_column(Integer)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ItineraryDay(Base):
    """One day of a trip's itinerary.

    Title, weather and caution describe the whole day. They used to be repeated
    on every slot row, which meant a five-slot day stored each value five times
    and reads had to regroup them afterwards.
    """

    __tablename__ = "itinerary_days"
    __table_args__ = (
        UniqueConstraint("trip_id", "day_number", name="uq_itinerary_days_trip_day"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trip_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True
    )
    day_number: Mapped[int] = mapped_column(Integer, nullable=False)
    target_date: Mapped[date | None] = mapped_column(Date)
    title: Mapped[str | None] = mapped_column(String(200))
    weather: Mapped[str | None] = mapped_column(String(200))
    caution: Mapped[str | None] = mapped_column(Text)


class ItineraryItem(Base):
    """One slot within a day: a place visit, a move, a meal or a rest.

    ``place_id`` is NULL for move/meal/rest slots and for itineraries produced
    by the OpenAI fallback, which returns place names rather than identifiers.
    """

    __tablename__ = "itinerary_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    day_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("itinerary_days.id", ondelete="CASCADE"), nullable=False, index=True
    )
    place_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("places.id", ondelete="SET NULL"), index=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    time: Mapped[str | None] = mapped_column(String(10))
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    location: Mapped[str | None] = mapped_column(String(200))
    duration: Mapped[str | None] = mapped_column(String(50))
    move_time: Mapped[str | None] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(Text)
    ai_reason: Mapped[str | None] = mapped_column(Text)


class SafetyAlert(Base):
    __tablename__ = "safety_alerts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trip_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True
    )
    level: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str | None] = mapped_column(Text)
    action: Mapped[str | None] = mapped_column(Text)
    time: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# Slots are always read as "one day's rows in order".
Index("ix_itinerary_items_day_order", ItineraryItem.day_id, ItineraryItem.sort_order)
