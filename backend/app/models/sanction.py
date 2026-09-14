import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Sanction(Base):
    """부과된 제재 한 건.

    약관 제23조①의 조치 목록을 그대로 유형으로 둔다. 행은 지우지 않고 해제는
    ``released_at``으로 남긴다. 제23조⑤·⑥이 이의제기와 그 결과(유지·변경·해제)를
    보장하므로, 무엇을 언제 왜 부과했고 어떻게 뒤집었는지가 전부 남아야 한다.

    현재 상태는 ``users``의 ``suspended_until`` 등에 따로 반영한다. 여기만 두면
    요청마다 이 표를 뒤져야 하는데, 그 자리가 ``get_current_user``라 전체 요청이
    느려진다.
    """

    __tablename__ = "sanctions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # "warning" | "matching_restriction" | "suspension" | "ban" | "withdrawal"
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    # 약관·운영정책상 위반 항목. 신고 사유와 같은 어휘를 쓴다.
    reason: Mapped[str] = mapped_column(String(30), nullable=False)
    # 당사자에게 전달되는 사유. 제23조③이 사유 고지를 요구한다.
    note: Mapped[str | None] = mapped_column(Text)
    # 기간제 제재의 만료 시각. 경고·영구정지·탈퇴는 비어 있다.
    expires_at: Mapped[datetime | None] = mapped_column(DateTime)
    # 이의제기가 받아들여져 해제된 경우.
    released_at: Mapped[datetime | None] = mapped_column(DateTime)
    released_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL")
    )
    # 어느 신고에서 비롯됐는지. 신고 없이 직접 부과할 수도 있어 비어 있을 수 있다.
    report_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("reports.id", ondelete="SET NULL"), index=True
    )
    issued_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        # 한 사람의 제재 이력을 최신순으로 읽는 것이 유일한 조회 형태다.
        Index("ix_sanctions_user_created", "user_id", "created_at"),
    )
