from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel


ApprovalAction = Literal["approve", "change_request"]
ApprovalStatus = Literal["pending", "approved", "change_requested"]


class ApprovalActionIn(BaseModel):
    action: ApprovalAction
    comment: str | None = Field(default=None, max_length=500)

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    @model_validator(mode="after")
    def require_change_reason(self) -> "ApprovalActionIn":
        if self.action == "change_request" and not (self.comment or "").strip():
            raise ValueError("수정 요청 사유를 입력해주세요.")
        if self.comment is not None:
            self.comment = self.comment.strip() or None
        return self


class ApprovalParticipantOut(BaseModel):
    user_id: str
    nickname: str
    avatar_url: str | None = None
    status: ApprovalStatus = "pending"
    comment: str | None = None
    approved_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ApprovalStateOut(BaseModel):
    trip_id: str
    itinerary_revision: int
    trip_status: str
    all_approved: bool
    mine: ApprovalParticipantOut
    counterpart: ApprovalParticipantOut

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
