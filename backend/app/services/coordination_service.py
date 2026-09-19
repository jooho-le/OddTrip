from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.match import Match
from ..models.trip import Trip, TripConcessionResponse, TripOddRuleProposal
from ..schemas.coordination import ConcessionSubmissionIn, OddRuleProposalIn
from ..security import utcnow


async def get_concessions(db: AsyncSession, trip: Trip, user_id: str) -> dict:
    member_ids = await _member_ids(db, trip, user_id)
    rows = (await db.execute(
        select(TripConcessionResponse).where(
            TripConcessionResponse.trip_id == trip.id,
            TripConcessionResponse.user_id.in_(member_ids),
        )
    )).scalars().all()
    return _concession_state(trip.id, user_id, member_ids[1], rows)


async def save_concessions(
    db: AsyncSession, trip: Trip, user_id: str, body: ConcessionSubmissionIn
) -> dict:
    # The trip lock serializes the two users' submissions so the reveal moment
    # is written once and neither response can be observed halfway through.
    await db.execute(select(Trip.id).where(Trip.id == trip.id).with_for_update())
    member_ids = await _member_ids(db, trip, user_id)
    rows = (await db.execute(
        select(TripConcessionResponse).where(
            TripConcessionResponse.trip_id == trip.id,
            TripConcessionResponse.user_id.in_(member_ids),
        )
    )).scalars().all()
    by_user = {row.user_id: row for row in rows}
    mine = by_user.get(user_id)
    if mine and mine.revealed_at:
        raise HTTPException(status_code=409, detail="이미 함께 공개된 양보 범위는 변경할 수 없습니다.")
    if mine and mine.submitted_at and not body.submit:
        raise HTTPException(status_code=409, detail="제출한 답안을 초안으로 되돌릴 수 없습니다.")

    if mine:
        mine.answers_json = dict(body.answers)
        mine.note = body.note
    else:
        mine = TripConcessionResponse(
            trip_id=trip.id,
            user_id=user_id,
            answers_json=dict(body.answers),
            note=body.note,
        )
        db.add(mine)
        rows.append(mine)
    if body.submit:
        mine.submitted_at = utcnow()

    await db.flush()
    counterpart = by_user.get(member_ids[1])
    if mine.submitted_at and counterpart and counterpart.submitted_at:
        revealed_at = mine.revealed_at or counterpart.revealed_at or utcnow()
        mine.revealed_at = revealed_at
        counterpart.revealed_at = revealed_at

    await db.commit()
    await db.refresh(mine)
    if counterpart:
        await db.refresh(counterpart)
    return _concession_state(trip.id, user_id, member_ids[1], rows)


async def get_odd_rules(db: AsyncSession, trip: Trip, user_id: str) -> dict:
    await _member_ids(db, trip, user_id)
    rows = (await db.execute(
        select(TripOddRuleProposal)
        .where(TripOddRuleProposal.trip_id == trip.id)
        .order_by(TripOddRuleProposal.created_at.desc())
    )).scalars().all()
    return _odd_rule_state(trip.id, rows)


async def propose_odd_rule(
    db: AsyncSession, trip: Trip, user_id: str, body: OddRuleProposalIn
) -> dict:
    # Serialize proposals for the trip as well. Without this lock, two quick
    # requests from the same browser could both pass the pending withdrawal
    # update and leave two active proposals from one traveller.
    await db.execute(select(Trip.id).where(Trip.id == trip.id).with_for_update())
    await _member_ids(db, trip, user_id)
    now = utcnow()
    await db.execute(
        update(TripOddRuleProposal)
        .where(
            TripOddRuleProposal.trip_id == trip.id,
            TripOddRuleProposal.proposed_by == user_id,
            TripOddRuleProposal.status == "pending",
        )
        .values(status="withdrawn", responded_at=now)
    )
    proposal = TripOddRuleProposal(
        trip_id=trip.id,
        proposed_by=user_id,
        rule_key=body.rule_key,
        title=body.title,
        description=body.description,
    )
    db.add(proposal)
    await db.commit()
    return await get_odd_rules(db, trip, user_id)


async def respond_odd_rule(
    db: AsyncSession,
    trip: Trip,
    proposal_id: str,
    user_id: str,
    *,
    accept: bool,
) -> dict:
    await db.execute(select(Trip.id).where(Trip.id == trip.id).with_for_update())
    member_ids = await _member_ids(db, trip, user_id)
    proposal = (await db.execute(
        select(TripOddRuleProposal)
        .where(TripOddRuleProposal.id == proposal_id)
        .with_for_update()
    )).scalar_one_or_none()
    if not proposal or proposal.trip_id != trip.id:
        raise HTTPException(status_code=404, detail="Odd Rule 제안을 찾을 수 없습니다.")
    if proposal.status != "pending":
        raise HTTPException(status_code=409, detail="이미 처리된 Odd Rule 제안입니다.")
    if proposal.proposed_by == user_id:
        raise HTTPException(status_code=403, detail="자신이 제안한 규칙에는 응답할 수 없습니다.")
    if proposal.proposed_by not in member_ids:
        raise HTTPException(status_code=403, detail="이 여행의 Odd Rule 제안이 아닙니다.")

    now = utcnow()
    proposal.responded_by = user_id
    proposal.responded_at = now
    if accept:
        latest = (await db.execute(
            select(func.max(TripOddRuleProposal.version)).where(
                TripOddRuleProposal.trip_id == trip.id,
                TripOddRuleProposal.status == "accepted",
            )
        )).scalar_one_or_none() or 0
        proposal.status = "accepted"
        proposal.version = latest + 1
        proposal.finalized_at = now
        await db.execute(
            update(TripOddRuleProposal)
            .where(
                TripOddRuleProposal.trip_id == trip.id,
                TripOddRuleProposal.status == "pending",
                TripOddRuleProposal.id != proposal.id,
            )
            .values(status="withdrawn", responded_at=now)
        )
    else:
        proposal.status = "rejected"

    await db.commit()
    return await get_odd_rules(db, trip, user_id)


async def _member_ids(db: AsyncSession, trip: Trip, user_id: str) -> tuple[str, str]:
    match = await db.get(Match, trip.match_id)
    if not match:
        raise HTTPException(status_code=404, detail="매칭 정보를 찾을 수 없습니다.")
    if user_id == match.user_id:
        return user_id, match.matched_user_id
    if user_id == match.matched_user_id:
        return user_id, match.user_id
    raise HTTPException(status_code=403, detail="이 여행의 참여자가 아닙니다.")


def _time(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def _concession_out(row: TripConcessionResponse) -> dict:
    return {
        "userId": row.user_id,
        "answers": row.answers_json,
        "note": row.note,
        "status": "submitted" if row.submitted_at else "draft",
        "submittedAt": _time(row.submitted_at),
        "revealedAt": _time(row.revealed_at),
        "updatedAt": _time(row.updated_at),
    }


def _concession_state(
    trip_id: str,
    user_id: str,
    counterpart_id: str,
    rows: list[TripConcessionResponse],
) -> dict:
    by_user = {row.user_id: row for row in rows}
    mine = by_user.get(user_id)
    counterpart = by_user.get(counterpart_id)
    revealed = bool(mine and counterpart and mine.revealed_at and counterpart.revealed_at)
    return {
        "tripId": trip_id,
        "mine": _concession_out(mine) if mine else None,
        "counterpart": _concession_out(counterpart) if revealed and counterpart else None,
        "mineSubmitted": bool(mine and mine.submitted_at),
        "counterpartSubmitted": bool(counterpart and counterpart.submitted_at),
        "bothSubmitted": bool(mine and mine.submitted_at and counterpart and counterpart.submitted_at),
        "revealedAt": _time(mine.revealed_at) if revealed and mine else None,
    }


def _odd_rule_out(row: TripOddRuleProposal) -> dict:
    return {
        "id": row.id,
        "tripId": row.trip_id,
        "proposedBy": row.proposed_by,
        "respondedBy": row.responded_by,
        "ruleKey": row.rule_key,
        "title": row.title,
        "description": row.description,
        "status": row.status,
        "version": row.version,
        "createdAt": _time(row.created_at),
        "respondedAt": _time(row.responded_at),
        "finalizedAt": _time(row.finalized_at),
    }


def _odd_rule_state(trip_id: str, rows: list[TripOddRuleProposal]) -> dict:
    accepted = sorted(
        (row for row in rows if row.status == "accepted" and row.version is not None),
        key=lambda row: row.version or 0,
        reverse=True,
    )
    return {
        "tripId": trip_id,
        "current": _odd_rule_out(accepted[0]) if accepted else None,
        "pending": [_odd_rule_out(row) for row in rows if row.status == "pending"],
        "history": [_odd_rule_out(row) for row in accepted],
        "proposals": [_odd_rule_out(row) for row in rows],
        "nextVersion": (accepted[0].version + 1) if accepted else 1,
    }
