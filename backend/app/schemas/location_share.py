from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

# 화면이 고르게 하는 공유 시간. 무기한은 두지 않는다. 링크는 한 번 나가면
# 회수할 수 없으므로 사용자가 잊어도 스스로 닫히는 것이 안전하다.
DURATION_CHOICES = (6, 24, 72)
DURATION_MAX_HOURS = 72


class LocationShareModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class LocationShareCreate(LocationShareModel):
    trip_id: str | None = Field(default=None, max_length=36)
    duration_hours: int = Field(ge=1, le=DURATION_MAX_HOURS)
    # 위치정보 수집·제공 동의. 없으면 공유를 시작하지 않는다.
    consent: bool


class LocationShareExtend(LocationShareModel):
    duration_hours: int = Field(ge=1, le=DURATION_MAX_HOURS)


class LocationPing(LocationShareModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy: float | None = Field(default=None, ge=0)


class LocationShareOut(LocationShareModel):
    """소유자에게 보이는 내 공유 상태."""

    id: str
    trip_id: str | None = None
    # 링크 주소를 만들 조각. 서버는 배포 주소를 모르므로 화면이 조립한다.
    token: str
    display_name: str
    expires_at: datetime
    created_at: datetime
    view_count: int
    last_viewed_at: datetime | None = None
    # 마지막으로 좌표가 들어온 시각. 없으면 아직 한 번도 보내지 않은 것이다.
    last_position_at: datetime | None = None


class LocationViewOut(LocationShareModel):
    """링크를 받은 사람에게 보이는 화면. 위치 말고는 아무것도 담지 않는다.

    여행 일정, 동행, 프로필은 여기에 절대 들어가지 않는다. 링크는 전달될 수
    있고, 받는 사람은 우리 회원도 아니다.
    """

    display_name: str
    # live: 방금 갱신됨 / stale: 갱신이 멈췄지만 마지막 위치는 남아 있음 /
    # lost: 오래 멈춰 마지막 위치도 버렸음 / waiting: 아직 첫 좌표 전 /
    # ended: 만료되었거나 공유자가 껐다.
    status: Literal["live", "stale", "lost", "waiting", "ended"]
    latitude: float | None = None
    longitude: float | None = None
    accuracy: float | None = None
    updated_at: datetime | None = None
    expires_at: datetime | None = None
