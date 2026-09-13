from datetime import date, datetime

from pydantic import BaseModel, ConfigDict
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
