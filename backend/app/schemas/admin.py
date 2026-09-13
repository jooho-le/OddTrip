from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class AdminModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class AdminUserOut(AdminModel):
    """운영 화면의 회원 한 줄.

    일반 사용자용 UserOut을 재사용하지 않습니다. 운영 화면에만 필요한
    집계(매칭 수, 여행 수)와 상태가 붙는데, 그것을 공용 스키마에 넣으면
    사용자 응답에도 따라 나가게 됩니다.
    """

    id: str
    nickname: str
    email: str | None = None
    region: str | None = None
    tti_code: str | None = None
    joined_at: datetime
    # "active" | "withdrawn". 제재가 붙으면 "suspended"가 추가됩니다.
    status: str
    role: str
    matches: int = 0
    trips: int = 0


class AdminUserDetailOut(AdminUserOut):
    withdrawn_at: datetime | None = None
    # 동의 항목별 현행 동의 여부. 성인 확인 등을 운영 화면에서 보기 위한 것으로,
    # 동의 원장을 그대로 노출하지 않고 요약만 전달합니다.
    consents: dict[str, bool] = {}


class AdminTripOut(AdminModel):
    id: str
    title: str | None = None
    region: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str
    travelers: list[str] = []
    attractions: int = 0
    itinerary_items: int = 0
    created_at: datetime


class AdminUserPageOut(AdminModel):
    items: list[AdminUserOut]
    total: int


class AdminTripPageOut(AdminModel):
    items: list[AdminTripOut]
    total: int


class AdminStatsOut(AdminModel):
    total_users: int
    active_users: int
    withdrawn_users: int
    total_trips: int
    active_trips: int
    total_matches: int
    # 매칭 요청 중 수락된 비율. 요청이 없으면 0.
    match_acceptance_rate: float
    # 가입자 중 TTI를 끝낸 비율.
    tti_completion_rate: float
    tti_distribution: list[dict]


# --- 신고 처리 -------------------------------------------------------------
#
# 상태 흐름: pending(접수) -> reviewing(검토 중) -> resolved(조치함) | dismissed(조치 없음)

REPORT_STATUSES = ("pending", "reviewing", "resolved", "dismissed")
REPORT_CLOSED_STATUSES = ("resolved", "dismissed")


class AdminReportPersonOut(AdminModel):
    """신고 화면에 필요한 만큼만 담은 사람 정보."""

    id: str
    nickname: str
    email: str | None = None
    status: str


class AdminReportOut(AdminModel):
    id: str
    reason: str
    details: str | None = None
    status: str
    reporter: AdminReportPersonOut
    reported_user: AdminReportPersonOut
    room_id: str | None = None
    message_id: str | None = None
    # 같은 사람이 지금까지 받은 신고 수. 제재 수위는 반복성을 함께 보고
    # 정하므로 목록에서 바로 보여야 한다.
    reported_user_report_count: int = 0
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    review_note: str | None = None
    created_at: datetime


class AdminReportDetailOut(AdminReportOut):
    # 신고된 메시지 원문. 지워진 메시지면 None이다.
    message_content: str | None = None
    # 같은 피신고자에 대한 다른 신고들. 처리 기준을 맞추기 위한 참고.
    related_reports: list[AdminReportOut] = []


class AdminReportPageOut(AdminModel):
    items: list[AdminReportOut]
    total: int
    pending: int


class AdminReportReviewIn(AdminModel):
    """검토 결과 기록.

    조치 자체(경고·정지·탈퇴)는 별도 동작이고, 여기서는 판단과 근거만 남긴다.
    """

    status: Literal["reviewing", "resolved", "dismissed"]
    note: str | None = Field(default=None, max_length=2000)


# --- 제재 ---------------------------------------------------------------


class AdminSanctionIn(AdminModel):
    """제재 부과.

    ``days``는 기간제 제재(매칭 제한·일시 정지)에만 쓴다. 경고·영구정지·탈퇴는
    기간 개념이 없다.
    """

    type: Literal["warning", "matching_restriction", "suspension", "ban", "withdrawal"]
    reason: str = Field(max_length=30)
    note: str | None = Field(default=None, max_length=2000)
    days: int | None = Field(default=None, ge=1, le=3650)
    report_id: str | None = Field(default=None, max_length=36)


class AdminSanctionOut(AdminModel):
    id: str
    user_id: str
    type: str
    reason: str
    note: str | None = None
    expires_at: datetime | None = None
    released_at: datetime | None = None
    released_by: str | None = None
    report_id: str | None = None
    issued_by: str | None = None
    created_at: datetime
    # 지금 효력이 있는지. 만료됐거나 해제된 제재와 구분한다.
    active: bool = False
