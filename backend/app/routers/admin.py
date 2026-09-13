"""운영자 전용 API.

모든 엔드포인트가 ``get_current_admin``을 거친다. 별도 라우터로 분리한 이유는
가드를 한 곳에서만 걸기 위해서다. 사용자용 라우터에 관리자 경로를 섞으면
가드를 빠뜨린 엔드포인트가 눈에 띄지 않는다.

여행은 조회만 제공한다. 관리자가 남의 여행을 고치거나 지우는 것은 사유·당사자
통보·기록을 먼저 정해야 하는 별도 사안이다.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_current_admin, get_db
from ..models.user import User
from ..schemas.admin import AdminReportReviewIn, AdminSanctionIn, AdminSanctionOut
from ..services import admin_service, sanction_service

router = APIRouter()


@router.get("/stats", response_model=dict)
async def get_stats(
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    data = await admin_service.stats(db)
    return {"data": data.model_dump(by_alias=True), "error": None}


@router.get("/users", response_model=dict)
async def list_users(
    q: str | None = Query(default=None, max_length=100),
    status: str | None = Query(default=None, pattern="^(active|withdrawn)$"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    items, total = await admin_service.list_users(
        db, query=q, status=status, limit=limit, offset=offset
    )
    return {
        "data": {"items": [item.model_dump(by_alias=True) for item in items], "total": total},
        "error": None,
    }


@router.get("/users/{user_id}", response_model=dict)
async def get_user(
    user_id: str,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    data = await admin_service.get_user(db, user_id)
    return {"data": data.model_dump(by_alias=True), "error": None}


@router.get("/trips", response_model=dict)
async def list_trips(
    q: str | None = Query(default=None, max_length=100),
    status: str | None = Query(default=None, pattern="^(planning|confirmed|completed|cancelled)$"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    items, total = await admin_service.list_trips(
        db, query=q, status=status, limit=limit, offset=offset
    )
    return {
        "data": {"items": [item.model_dump(by_alias=True) for item in items], "total": total},
        "error": None,
    }


@router.get("/trips/{trip_id}", response_model=dict)
async def get_trip(
    trip_id: str,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    data = await admin_service.get_trip(db, trip_id)
    return {"data": data.model_dump(by_alias=True), "error": None}


@router.get("/reports", response_model=dict)
async def list_reports(
    status: str | None = Query(default=None, pattern="^(pending|reviewing|resolved|dismissed)$"),
    reason: str | None = Query(default=None, max_length=30),
    reported_user_id: str | None = Query(default=None, alias="reportedUserId", max_length=36),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    data = await admin_service.list_reports(
        db,
        status=status,
        reason=reason,
        reported_user_id=reported_user_id,
        limit=limit,
        offset=offset,
    )
    return {"data": data.model_dump(by_alias=True), "error": None}


@router.get("/reports/{report_id}", response_model=dict)
async def get_report(
    report_id: str,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    data = await admin_service.get_report(db, report_id)
    return {"data": data.model_dump(by_alias=True), "error": None}


@router.patch("/reports/{report_id}", response_model=dict)
async def review_report(
    report_id: str,
    body: AdminReportReviewIn,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """검토 결과를 기록한다. 제재 집행은 별도 엔드포인트다."""
    data = await admin_service.review_report(db, report_id, admin, body)
    return {"data": data.model_dump(by_alias=True), "error": None}


def _sanction_out(sanction, *, now=None) -> AdminSanctionOut:
    active = sanction.released_at is None and (
        sanction.type in (sanction_service.BAN, sanction_service.WITHDRAWAL)
        or sanction.expires_at is None
        or sanction.expires_at > (now or datetime.utcnow())
    )
    # 경고는 차단하는 것이 없으므로 "적용 중"이라는 말이 맞지 않는다.
    if sanction.type == sanction_service.WARNING:
        active = False
    return AdminSanctionOut(**{
        "id": sanction.id,
        "user_id": sanction.user_id,
        "type": sanction.type,
        "reason": sanction.reason,
        "note": sanction.note,
        "expires_at": sanction.expires_at,
        "released_at": sanction.released_at,
        "released_by": sanction.released_by,
        "report_id": sanction.report_id,
        "issued_by": sanction.issued_by,
        "created_at": sanction.created_at,
        "active": active,
    })


@router.get("/users/{user_id}/sanctions", response_model=dict)
async def list_sanctions(
    user_id: str,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    rows = await sanction_service.list_for_user(db, user_id)
    return {
        "data": {"items": [_sanction_out(row).model_dump(by_alias=True) for row in rows]},
        "error": None,
    }


@router.post("/users/{user_id}/sanctions", response_model=dict)
async def issue_sanction(
    user_id: str,
    body: AdminSanctionIn,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """제재를 부과한다. 당사자에게는 사유와 기간, 이의제기 방법이 통지된다."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    sanction = await sanction_service.issue(
        db,
        user=user,
        admin=admin,
        type=body.type,
        reason=body.reason,
        note=body.note,
        days=body.days,
        report_id=body.report_id,
    )
    return {"data": _sanction_out(sanction).model_dump(by_alias=True), "error": None}


@router.delete("/sanctions/{sanction_id}", response_model=dict)
async def release_sanction(
    sanction_id: str,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """이의제기가 받아들여졌을 때 제재를 해제한다."""
    sanction = await sanction_service.release(db, sanction_id, admin)
    return {"data": _sanction_out(sanction).model_dump(by_alias=True), "error": None}
