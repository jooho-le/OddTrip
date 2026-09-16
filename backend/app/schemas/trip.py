from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic.alias_generators import to_camel


MAX_TRIP_DAYS = 30


class TripModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class TripCreateIn(TripModel):
    match_id: str
    title: str | None = Field(default=None, max_length=200)
    region: str = Field(min_length=1, max_length=100)
    start_date: date
    end_date: date

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None

    @field_validator("region")
    @classmethod
    def strip_region(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("여행 지역을 입력해주세요.")
        return value.strip()

    @model_validator(mode="after")
    def validate_dates(self) -> "TripCreateIn":
        validate_trip_dates(self.start_date, self.end_date)
        return self


class TripUpdateIn(TripModel):
    title: str | None = Field(default=None, max_length=200)
    region: str | None = Field(default=None, min_length=1, max_length=100)
    start_date: date | None = None
    end_date: date | None = None

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None

    @field_validator("region")
    @classmethod
    def strip_region(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("여행 지역을 입력해주세요.")
        return value.strip() if value is not None else None

    @model_validator(mode="after")
    def require_a_field(self) -> "TripUpdateIn":
        if not self.model_fields_set:
            raise ValueError("수정할 여행 정보를 하나 이상 입력해주세요.")
        if "region" in self.model_fields_set and self.region is None:
            raise ValueError("여행 지역은 비울 수 없습니다.")
        if "start_date" in self.model_fields_set and self.start_date is None:
            raise ValueError("여행 시작일은 비울 수 없습니다.")
        if "end_date" in self.model_fields_set and self.end_date is None:
            raise ValueError("여행 종료일은 비울 수 없습니다.")
        return self


class TripCancelOut(TripModel):
    trip_id: str
    status: str
    cancelled_at: datetime
    cancelled_by: str


def validate_trip_dates(start_date: date, end_date: date) -> None:
    if end_date < start_date:
        raise ValueError("여행 종료일은 시작일보다 빠를 수 없습니다.")
    span = (end_date - start_date).days + 1
    if span > MAX_TRIP_DAYS:
        raise ValueError(f"여행 기간은 최대 {MAX_TRIP_DAYS}일까지 가능합니다. (현재 {span}일)")


class TripPartnerOut(BaseModel):
    id: str
    nickname: str
    avatar_url: str | None = None
    tti_code: str | None = None

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class TripSummaryOut(BaseModel):
    """One past or ongoing trip, for the archive on the My page.

    The client resets its working state on every login, so this is how a
    traveller gets back to something they started earlier.
    """

    trip_id: str
    match_id: str
    partner: TripPartnerOut | None = None

    title: str | None = None
    region: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str = "planning"

    attraction_count: int = 0
    saved_count: int = 0
    itinerary_day_count: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None
    cancelled_at: datetime | None = None
    cancelled_by: str | None = None

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
