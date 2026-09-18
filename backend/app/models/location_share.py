import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class LocationShare(Base):
    """가족·친구에게 내 위치를 보여 주는 링크 한 건.

    좌표는 여기 없다. 좌표는 메모리 캐시에만 두고 이 표에는 "누가, 언제까지,
    누구에게 열어 두었는가"만 남는다. 위치 이력을 쌓지 않는 것이 이 기능의
    전제이고, 남는 것은 동의와 공유 사실에 대한 기록이다.
    """

    __tablename__ = "location_shares"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # 어느 여행에서 켰는지. 여행 화면에서만 켤 수 있지만, 여행이 지워져도 링크는
    # 살아 있어야 하므로(공유 중에 여행을 정리하는 경우) 끊어질 수 있게 둔다.
    trip_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("trips.id", ondelete="SET NULL"), index=True
    )
    # 링크의 열쇠. 해시로 저장하지 않는 이유는 소유자가 링크를 다시 봐야 하기
    # 때문이다. 새로고침한 뒤에도 "링크 복사"가 되어야 하고, 해시만 두면 원래
    # 주소를 되살릴 수 없다. 대신 수명을 짧게(최대 3일) 강제한다.
    token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    # 링크를 받은 사람에게 보이는 이름. 닉네임을 그대로 쓰되, 계정이 바뀌어도
    # 공유 중인 링크의 표시가 흔들리지 않도록 켤 때의 값을 복사해 둔다.
    display_name: Mapped[str] = mapped_column(String(50), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    # 위치정보 수집·제공에 동의한 시각. 공유마다 새로 받는다.
    consented_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    # 사용자가 직접 끈 시각. 만료와 구분해 남긴다.
    stopped_at: Mapped[datetime | None] = mapped_column(DateTime)
    # 링크가 실제로 열린 횟수와 마지막 시각. 링크가 어디까지 퍼졌는지 가늠할
    # 유일한 단서라 소유자 화면에 그대로 보여 준다.
    view_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    last_viewed_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        # "이 사람의 지금 살아 있는 공유"를 매번 찾는다.
        Index("ix_location_shares_user_expires", "user_id", "expires_at"),
    )
