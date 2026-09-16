"""Recording and reading the consent ledger.

Rows are append-only: see ``UserConsent``. The functions here never update or
delete, they only add and read back the newest entry per consent type.
"""
import uuid
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import legal
from ..models.consent import UserConsent
from ..schemas.consent import (
    ConsentDecisionIn,
    ConsentOut,
    ConsentStateOut,
    ConsentStatusOut,
)


def _now() -> datetime:
    return datetime.utcnow()


def build(
    *,
    user_id: str,
    decision: ConsentDecisionIn,
    source: str,
    at: datetime | None = None,
) -> UserConsent:
    """Create the row object without touching the session.

    Callers add it inside their own transaction, so registration can commit the
    account and its consents together or neither -- an account that exists
    without the consent that authorised it is the case worth designing out.
    """
    return UserConsent(
        id=str(uuid.uuid4()),
        user_id=user_id,
        consent_type=decision.type,
        # Recorded from the server's table, not from the payload. The payload
        # version has already been checked to equal it; storing the server's
        # copy means a validation gap can never write a bogus version.
        version=legal.CURRENT_VERSIONS[decision.type],
        accepted=decision.accepted,
        source=source,
        accepted_at=at or _now(),
    )


def validate(
    decisions: list[ConsentDecisionIn],
    *,
    source: str,
    allowed: tuple[str, ...] = legal.CONSENT_TYPES,
    required: tuple[str, ...] = (),
) -> None:
    """Reject a submission that must not become a legal record.

    Raises 400 rather than silently dropping entries: a consent screen that
    half-registers is worse than one that fails loudly.
    """
    if source not in legal.SOURCES:
        raise HTTPException(status_code=400, detail="동의 경로가 올바르지 않습니다.")

    seen: set[str] = set()
    for decision in decisions:
        if decision.type not in allowed:
            raise HTTPException(
                status_code=400, detail=f"처리할 수 없는 동의 항목입니다: {decision.type}"
            )
        if decision.type in seen:
            raise HTTPException(
                status_code=400, detail=f"동의 항목이 중복되었습니다: {decision.type}"
            )
        seen.add(decision.type)

        if decision.version != legal.CURRENT_VERSIONS[decision.type]:
            # The client rendered a different revision than the one in force.
            raise HTTPException(
                status_code=400,
                detail="약관이 갱신되었습니다. 화면을 새로고침한 뒤 다시 동의해주세요.",
            )
        if not decision.accepted and decision.type not in legal.REVOCABLE:
            raise HTTPException(
                status_code=400,
                detail="서비스 이용에 필요한 동의는 철회할 수 없습니다. 회원 탈퇴를 이용해주세요.",
            )

    missing = [
        consent_type
        for consent_type in required
        if not any(d.type == consent_type and d.accepted for d in decisions)
    ]
    if missing:
        raise HTTPException(status_code=400, detail="필수 항목에 모두 동의해야 합니다.")


async def record(
    db: AsyncSession,
    user_id: str,
    decisions: list[ConsentDecisionIn],
    source: str,
) -> list[ConsentOut]:
    """Append the decisions and commit them."""
    at = _now()
    rows = [
        build(user_id=user_id, decision=decision, source=source, at=at)
        for decision in decisions
    ]
    db.add_all(rows)
    await db.commit()
    return [_to_out(row) for row in rows]


async def latest_by_type(db: AsyncSession, user_id: str) -> dict[str, UserConsent]:
    """The newest row for each consent type this user has ever answered."""
    newest = await db.execute(
        select(UserConsent.consent_type, func.max(UserConsent.accepted_at))
        .where(UserConsent.user_id == user_id)
        .group_by(UserConsent.consent_type)
    )
    pairs = newest.all()
    if not pairs:
        return {}

    result = await db.execute(
        select(UserConsent).where(
            UserConsent.user_id == user_id,
            or_(
                *(
                    and_(
                        UserConsent.consent_type == consent_type,
                        UserConsent.accepted_at == accepted_at,
                    )
                    for consent_type, accepted_at in pairs
                )
            ),
        )
    )

    # Two rows for the same consent type can share a timestamp: the system
    # clock is coarse (about 15ms on Windows), so a quick toggle lands twice
    # inside one tick and "newest" stops being decidable. When that happens we
    # keep the withdrawal, because the safe reading of an ambiguous record is
    # the one that asks the user again rather than the one that assumes
    # consent.
    latest: dict[str, UserConsent] = {}
    for row in result.scalars():
        current = latest.get(row.consent_type)
        if current is None or (current.accepted and not row.accepted):
            latest[row.consent_type] = row
    return latest


async def status(db: AsyncSession, user_id: str) -> ConsentStatusOut:
    latest = await latest_by_type(db, user_id)
    items = [
        _to_state(consent_type, latest.get(consent_type))
        for consent_type in legal.CONSENT_TYPES
    ]
    return ConsentStatusOut(items=items, revocable=list(legal.REVOCABLE))


async def history(db: AsyncSession, user_id: str, limit: int = 100) -> list[ConsentOut]:
    result = await db.execute(
        select(UserConsent)
        .where(UserConsent.user_id == user_id)
        .order_by(UserConsent.accepted_at.desc(), UserConsent.id.desc())
        .limit(limit)
    )
    return [_to_out(row) for row in result.scalars()]


async def has_accepted(db: AsyncSession, user_id: str, consent_type: str) -> bool:
    """Whether the user has accepted this document at the version in force.

    Consent to a superseded revision is not consent to the current one, so a
    version bump closes the gate again until the user answers the new text.
    """
    # Goes through latest_by_type so the coarse-clock tie is resolved the same
    # way here as it is in the status response. A gate that disagreed with the
    # screen about what the user consented to would be worse than either answer.
    row = (await latest_by_type(db, user_id)).get(consent_type)
    return bool(row and row.accepted and row.version == legal.CURRENT_VERSIONS[consent_type])


def _to_out(row: UserConsent) -> ConsentOut:
    return ConsentOut(
        type=row.consent_type,
        version=row.version,
        accepted=row.accepted,
        source=row.source,
        accepted_at=row.accepted_at,
    )


def _to_state(consent_type: str, row: UserConsent | None) -> ConsentStateOut:
    current = legal.CURRENT_VERSIONS[consent_type]
    # "accepted" means accepted at the version in force, so the simplest read
    # of this field is also the safe one. "stale" then explains the case where
    # that is false only because the document moved on.
    effective = bool(row and row.accepted and row.version == current)
    return ConsentStateOut(
        type=consent_type,
        accepted=effective,
        version=row.version if row else None,
        current_version=current,
        stale=bool(row and row.accepted and row.version != current),
        accepted_at=row.accepted_at if row else None,
    )
