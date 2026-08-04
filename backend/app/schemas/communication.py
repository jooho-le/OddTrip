from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

from .user import UserOut


class CommunicationModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class MatchRequestCreate(CommunicationModel):
    receiver_id: str
    region: str = Field(min_length=1, max_length=100)
    start_date: date
    end_date: date
    greeting_message: str = Field(min_length=1, max_length=300)

    @field_validator("region", "greeting_message")
    @classmethod
    def strip_text(cls, value: str) -> str:
        result = value.strip()
        if not result:
            raise ValueError("빈 값을 입력할 수 없습니다.")
        return result

    @field_validator("end_date")
    @classmethod
    def validate_date_range(cls, value: date, info) -> date:
        start_date = info.data.get("start_date")
        if start_date and value < start_date:
            raise ValueError("여행 종료일은 시작일보다 빠를 수 없습니다.")
        return value


class MatchRequestOut(CommunicationModel):
    id: str
    requester_id: str
    receiver_id: str
    region: str
    start_date: date
    end_date: date
    greeting_message: str
    status: str
    expires_at: datetime | None = None
    responded_at: datetime | None = None
    created_at: datetime
    counterpart: UserOut | None = None


class MatchAcceptOut(CommunicationModel):
    request_id: str
    match_id: str
    room_id: str
    trip_id: str


class MatchEndOut(CommunicationModel):
    match_id: str
    room_id: str | None = None
    status: str
    ended_at: datetime


class BlockOut(CommunicationModel):
    id: str
    blocker_id: str
    blocked_user_id: str
    created_at: datetime
    released_at: datetime | None = None
