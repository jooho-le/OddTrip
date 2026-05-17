from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ItineraryItemOut(BaseModel):
    id: str
    day: int
    time: str | None = None
    type: str
    title: str
    location: str | None = None
    duration: str | None = None
    move_time: str | None = None
    description: str | None = None
    ai_reason: str | None = None

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ItineraryDayOut(BaseModel):
    day: int
    title: str
    weather: str
    caution: str
    items: list[ItineraryItemOut]

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
