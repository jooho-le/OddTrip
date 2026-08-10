from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel


class ChatModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class ChatCounterpartOut(ChatModel):
    id: str
    nickname: str
    avatar_url: str | None = None
    tti_code: str | None = None


class ChatTripOut(ChatModel):
    id: str
    title: str | None = None
    region: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str


class ChatMessageCreate(ChatModel):
    client_message_id: str = Field(min_length=1, max_length=36)
    type: Literal["text"] = "text"
    content: str = Field(min_length=1, max_length=1000)

    @field_validator("content")
    @classmethod
    def strip_and_validate_content(cls, value: str) -> str:
        content = value.strip()
        if not content:
            raise ValueError("메시지를 입력해주세요.")
        return content

    @field_validator("client_message_id")
    @classmethod
    def validate_client_message_id(cls, value: str) -> str:
        try:
            return str(UUID(value))
        except ValueError as exc:
            raise ValueError("clientMessageId는 UUID 형식이어야 합니다.") from exc


class ChatMessageOut(ChatModel):
    id: str
    room_id: str
    sender_id: str | None = None
    sequence: int
    client_message_id: str
    type: str
    content: str | None = None
    payload: dict | None = None
    created_at: datetime
    deleted_at: datetime | None = None
    deleted: bool = False
    display_text: str | None = None


class ChatRoomOut(ChatModel):
    id: str
    match_id: str
    status: str
    counterpart: ChatCounterpartOut
    trip: ChatTripOut | None = None
    match_level: str
    recommendation_score: int
    current_step: str | None = None
    last_message: ChatMessageOut | None = None
    unread_count: int = 0
    created_at: datetime
    updated_at: datetime


class ChatMessagePageOut(ChatModel):
    items: list[ChatMessageOut]
    next_before_sequence: int | None = None


class ChatRoomPageOut(ChatModel):
    items: list[ChatRoomOut]
    next_before: datetime | None = None


class ChatReadIn(ChatModel):
    last_read_sequence: int = Field(ge=0)


class ChatReadOut(ChatModel):
    room_id: str
    user_id: str
    last_read_sequence: int
    updated_at: datetime


class ChatUnreadCountOut(ChatModel):
    count: int


class ChatSystemMessageIn(ChatModel):
    event: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=1000)
    payload: dict | None = None


class ChatRoomMemberOut(ChatModel):
    room_id: str
    user_id: str
    last_read_sequence: int
    hidden_at: datetime | None = None
    left_at: datetime | None = None


class ChatReportIn(ChatModel):
    reason: Literal[
        "spam",
        "harassment",
        "sexual_content",
        "hate",
        "fraud",
        "personal_information",
        "other",
    ]
    details: str | None = Field(default=None, max_length=2000)


class ChatReportOut(ChatModel):
    id: str
    reporter_id: str
    reported_user_id: str
    room_id: str | None = None
    message_id: str | None = None
    reason: str
    details: str | None = None
    status: str
    created_at: datetime
