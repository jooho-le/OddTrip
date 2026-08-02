from datetime import date

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

# The weather and disaster lookups run once per day of the trip, so an
# unbounded range would fan out into hundreds of sequential HTTP calls.
MAX_TRIP_DAYS = 30


class JointPreferenceIn(BaseModel):
    places: list[str] = Field(default_factory=list)
    activities: list[str] = Field(default_factory=list)
    foods: list[str] = Field(default_factory=list)
    pace: int = 50
    budget: int = 50
    indoor_preferred: bool = False
    hidden_spots: bool = False

    # Optional so existing clients that omit them keep working.
    title: str | None = None
    region: str | None = None
    date_from: date | None = None
    date_to: date | None = None

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    @model_validator(mode="after")
    def check_date_range(self) -> "JointPreferenceIn":
        if self.date_from and self.date_to:
            if self.date_to < self.date_from:
                raise ValueError("여행 종료일이 시작일보다 빠를 수 없습니다.")
            span = (self.date_to - self.date_from).days + 1
            if span > MAX_TRIP_DAYS:
                raise ValueError(f"여행 기간은 최대 {MAX_TRIP_DAYS}일까지 가능합니다. (현재 {span}일)")
        return self


class JointPreferenceOut(JointPreferenceIn):
    pass


class ConflictRequest(BaseModel):
    conflicts: list[str] = Field(default_factory=list)


class ConflictResponse(BaseModel):
    suggestion: str
