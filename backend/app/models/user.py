import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    nickname: Mapped[str] = mapped_column(String(50), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    home_region: Mapped[str | None] = mapped_column(String(100))
    # "user" | "admin". Promotion is a manual DB operation for now; there is no
    # endpoint that grants it, so it cannot be escalated through the API.
    role: Mapped[str] = mapped_column(
        String(20), nullable=False, default="user", server_default="user"
    )
    tti_code: Mapped[str | None] = mapped_column(String(4))
    tti_scores_json: Mapped[list | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    # 제재의 현재 상태. 원장은 sanctions 표이고 여기는 그 결과만 들고 있다.
    # get_current_user가 요청마다 도는 자리라, 제재 확인에 질의를 하나 더
    # 붙이면 모든 요청이 느려진다. 이미 읽어 온 이 행으로 판단한다.
    suspended_until: Mapped[datetime | None] = mapped_column(DateTime)
    matching_restricted_until: Mapped[datetime | None] = mapped_column(DateTime)
    # 영구 이용정지. 기간이 없으므로 만료 시각 대신 시점만 남긴다.
    banned_at: Mapped[datetime | None] = mapped_column(DateTime)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)
    deleted_by: Mapped[str | None] = mapped_column(String(36))
