from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class ItineraryItemOut(BaseModel):
    id: str
    day: int
    # Carried straight from the linked place so the client never has to match a
    # slot back to an attraction by name. NULL for move/meal/rest slots.
    place_id: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    address: str | None = None
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
    items: list[ItineraryItemOut] = Field(default_factory=list)

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
