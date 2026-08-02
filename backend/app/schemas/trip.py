from datetime import date, datetime

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


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

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
