import asyncio
import uuid
from datetime import date, datetime

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from backend.app import legal
from backend.app.database import Base
from backend.app.models import ChatMessage, ChatRoom, Notification, Report, User
from backend.app.schemas.admin import AdminReportReviewIn
from backend.app.schemas.communication import MatchRequestCreate
from backend.app.schemas.consent import ConsentDecisionIn
from backend.app.services import admin_service, communication_service, consent_service
from tests.test_chat_service import _sqlite_test_engine


async def _session_factory():
    engine = _sqlite_test_engine()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    return async_sessionmaker(engine, expire_on_commit=False)


def _user(email: str, *, role: str = "user", deleted: bool = False) -> User:
    return User(
        id=str(uuid.uuid4()),
        email=email,
        nickname=email.split("@")[0],
        role=role,
        created_at=datetime.utcnow(),
        deleted_at=datetime.utcnow() if deleted else None,
    )


def test_promote_and_demote() -> None:
    asyncio.run(_test_promote_and_demote())


async def _test_promote_and_demote() -> None:
    sessions = await _session_factory()

    async with sessions() as session:
        session.add_all([_user("first@example.com"), _user("second@example.com")])
        await session.commit()

        # 대소문자와 공백이 섞여 들어와도 가입 시 정규화된 주소로 찾습니다.
        promoted = await admin_service.promote(session, "  First@Example.com ")
        assert promoted.role == "admin"

        # 멱등: 이미 관리자면 그대로 둡니다.
        assert (await admin_service.promote(session, "first@example.com")).role == "admin"
        assert len(await admin_service.list_admins(session)) == 1

        await admin_service.promote(session, "second@example.com")
        assert len(await admin_service.list_admins(session)) == 2

        demoted = await admin_service.demote(session, "second@example.com")
        assert demoted.role == "user"
        assert len(await admin_service.list_admins(session)) == 1


def test_last_admin_cannot_be_demoted() -> None:
    asyncio.run(_test_last_admin_cannot_be_demoted())


async def _test_last_admin_cannot_be_demoted() -> None:
    """관리자가 0명이 되면 다시 올릴 방법이 서버 접근밖에 남지 않습니다."""
    sessions = await _session_factory()

    async with sessions() as session:
        session.add(_user("only@example.com", role="admin"))
        await session.commit()

        with pytest.raises(admin_service.AdminRoleError):
            await admin_service.demote(session, "only@example.com")

        assert len(await admin_service.list_admins(session)) == 1


def test_missing_and_withdrawn_accounts_are_rejected() -> None:
    asyncio.run(_test_missing_and_withdrawn_accounts_are_rejected())


async def _test_missing_and_withdrawn_accounts_are_rejected() -> None:
    sessions = await _session_factory()

    async with sessions() as session:
        session.add(_user("gone@example.com", deleted=True))
        await session.commit()

        with pytest.raises(admin_service.AdminRoleError):
            await admin_service.promote(session, "nobody@example.com")

        # 탈퇴 계정을 관리자로 되살리는 경로가 있으면 안 됩니다.
        with pytest.raises(admin_service.AdminRoleError):
            await admin_service.promote(session, "gone@example.com")

        # 일반 사용자를 강등해도 오류가 아니라 무동작입니다.
        session.add(_user("plain@example.com"))
        await session.commit()
        assert (await admin_service.demote(session, "plain@example.com")).role == "user"


# --- 운영 조회 -------------------------------------------------------------


async def _matched_pair(session, a_email: str, b_email: str):
    """양쪽이 수락한 매칭 하나와 그에 딸린 여행을 만든다."""
    a = _user(a_email)
    a.tti_code, a.tti_scores_json = "PNFH", [{"axis": x, "score": -2} for x in ("PW", "NC", "FA", "HS")]
    b = _user(b_email)
    b.tti_code, b.tti_scores_json = "WCAS", [{"axis": x, "score": 2} for x in ("PW", "NC", "FA", "HS")]
    session.add_all([a, b])
    await session.commit()

    for user in (a, b):
        await consent_service.record(
            session,
            user.id,
            [ConsentDecisionIn(
                type=legal.MATCHING_PROFILE,
                version=legal.CURRENT_VERSIONS[legal.MATCHING_PROFILE],
                accepted=True,
            )],
            legal.SOURCE_MATCHING_GATE,
        )

    request = await communication_service.create_match_request(
        session,
        a,
        MatchRequestCreate(
            receiver_id=b.id,
            region="부산",
            start_date=date(2026, 10, 1),
            end_date=date(2026, 10, 3),
            greeting_message="같이 가요",
        ),
    )
    await communication_service.accept_match_request(session, request.id, b)
    return a, b


def test_user_list_counts_matches_and_trips() -> None:
    asyncio.run(_test_user_list_counts_matches_and_trips())


async def _test_user_list_counts_matches_and_trips() -> None:
    sessions = await _session_factory()

    async with sessions() as session:
        a, b = await _matched_pair(session, "a@example.com", "b@example.com")
        session.add(_user("lonely@example.com"))
        await session.commit()

        items, total = await admin_service.list_users(session)
        assert total == 3
        by_email = {item.email: item for item in items}

        # 매칭은 한 건인데 양쪽 모두에게 1로 잡혀야 한다.
        assert by_email["a@example.com"].matches == 1
        assert by_email["b@example.com"].matches == 1
        assert by_email["a@example.com"].trips == 1
        assert by_email["lonely@example.com"].matches == 0
        assert by_email["lonely@example.com"].trips == 0


def test_user_list_filters_and_paginates() -> None:
    asyncio.run(_test_user_list_filters_and_paginates())


async def _test_user_list_filters_and_paginates() -> None:
    sessions = await _session_factory()

    async with sessions() as session:
        session.add_all([
            _user("active@example.com"),
            _user("gone@example.com", deleted=True),
        ])
        await session.commit()

        active, total = await admin_service.list_users(session, status="active")
        assert total == 1 and active[0].status == "active"

        withdrawn, total = await admin_service.list_users(session, status="withdrawn")
        assert total == 1 and withdrawn[0].status == "withdrawn"

        # 검색은 대소문자를 가리지 않는다.
        found, total = await admin_service.list_users(session, query="ACTIVE@")
        assert total == 1 and found[0].email == "active@example.com"

        # total은 페이지 크기가 아니라 조건에 맞는 전체 수여야 한다.
        page, total = await admin_service.list_users(session, limit=1)
        assert len(page) == 1 and total == 2


def test_trip_list_carries_travelers_and_counts() -> None:
    asyncio.run(_test_trip_list_carries_travelers_and_counts())


async def _test_trip_list_carries_travelers_and_counts() -> None:
    sessions = await _session_factory()

    async with sessions() as session:
        await _matched_pair(session, "a@example.com", "b@example.com")

        items, total = await admin_service.list_trips(session)
        assert total == 1
        trip = items[0]
        # 참여자는 매칭 양쪽이므로 두 명이어야 한다.
        assert len(trip.travelers) == 2
        assert trip.attractions == 0
        assert trip.itinerary_items == 0

        detail = await admin_service.get_trip(session, trip.id)
        assert detail.id == trip.id

        with pytest.raises(HTTPException):
            await admin_service.get_trip(session, "no-such-trip")


def test_user_detail_includes_consent_summary() -> None:
    asyncio.run(_test_user_detail_includes_consent_summary())


async def _test_user_detail_includes_consent_summary() -> None:
    sessions = await _session_factory()

    async with sessions() as session:
        user = _user("member@example.com")
        session.add(user)
        await session.commit()

        await consent_service.record(
            session,
            user.id,
            [ConsentDecisionIn(
                type=legal.ADULT,
                version=legal.CURRENT_VERSIONS[legal.ADULT],
                accepted=True,
            )],
            legal.SOURCE_SIGNUP,
        )

        detail = await admin_service.get_user(session, user.id)
        # 성인 확인 여부를 운영 화면에서 봐야 하므로 요약으로 싣는다.
        assert detail.consents[legal.ADULT] is True
        assert detail.consents[legal.MARKETING] is False

        with pytest.raises(HTTPException):
            await admin_service.get_user(session, "no-such-user")


def test_stats_excludes_unanswered_requests_from_acceptance_rate() -> None:
    asyncio.run(_test_stats_excludes_unanswered_requests_from_acceptance_rate())


async def _test_stats_excludes_unanswered_requests_from_acceptance_rate() -> None:
    sessions = await _session_factory()

    async with sessions() as session:
        a, b = await _matched_pair(session, "a@example.com", "b@example.com")
        # 아직 답하지 않은 요청. 성사율 분모에 들어가면 안 된다.
        c = _user("c@example.com")
        c.tti_code, c.tti_scores_json = "WCAS", [{"axis": x, "score": 2} for x in ("PW", "NC", "FA", "HS")]
        session.add(c)
        await session.commit()
        await consent_service.record(
            session,
            c.id,
            [ConsentDecisionIn(
                type=legal.MATCHING_PROFILE,
                version=legal.CURRENT_VERSIONS[legal.MATCHING_PROFILE],
                accepted=True,
            )],
            legal.SOURCE_MATCHING_GATE,
        )
        await communication_service.create_match_request(
            session,
            a,
            MatchRequestCreate(
                receiver_id=c.id,
                region="서울",
                start_date=date(2026, 11, 1),
                end_date=date(2026, 11, 3),
                greeting_message="안녕하세요",
            ),
        )

        data = await admin_service.stats(session)
        assert data.total_users == 3
        assert data.active_users == 3
        assert data.total_matches == 1
        assert data.total_trips == 1
        # 수락 1건 / 응답된 요청 1건 = 100%. 대기 중 1건은 분모에서 빠진다.
        assert data.match_acceptance_rate == 100.0
        assert data.tti_completion_rate == 100.0
        assert {row["code"] for row in data.tti_distribution} == {"PNFH", "WCAS"}


def test_stats_on_an_empty_database() -> None:
    asyncio.run(_test_stats_on_an_empty_database())


async def _test_stats_on_an_empty_database() -> None:
    """0으로 나누는 자리가 두 곳이라 빈 DB에서 터지기 쉽다."""
    sessions = await _session_factory()

    async with sessions() as session:
        data = await admin_service.stats(session)
        assert data.total_users == 0
        assert data.match_acceptance_rate == 0.0
        assert data.tti_completion_rate == 0.0
        assert data.tti_distribution == []


# --- 신고 처리 -------------------------------------------------------------


def _report(reporter_id: str, reported_id: str, *, reason: str = "harassment", status: str = "pending",
            created_at: datetime | None = None, message_id: str | None = None) -> Report:
    return Report(
        id=str(uuid.uuid4()),
        reporter_id=reporter_id,
        reported_user_id=reported_id,
        reason=reason,
        details="괴롭힘을 당했습니다.",
        status=status,
        message_id=message_id,
        created_at=created_at or datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )


def test_report_list_puts_pending_oldest_first() -> None:
    asyncio.run(_test_report_list_puts_pending_oldest_first())


async def _test_report_list_puts_pending_oldest_first() -> None:
    sessions = await _session_factory()

    async with sessions() as session:
        a, b = _user("a@example.com"), _user("b@example.com")
        session.add_all([a, b])
        await session.commit()

        old_pending = _report(a.id, b.id, created_at=datetime(2026, 1, 1))
        new_pending = _report(a.id, b.id, reason="spam", created_at=datetime(2026, 6, 1))
        done = _report(a.id, b.id, reason="fraud", status="resolved", created_at=datetime(2025, 1, 1))
        session.add_all([new_pending, done, old_pending])
        await session.commit()

        page = await admin_service.list_reports(session)
        assert page.total == 3
        assert page.pending == 2
        # 미처리가 먼저, 그 안에서는 오래된 순. 처리된 건은 뒤로.
        assert [r.id for r in page.items] == [old_pending.id, new_pending.id, done.id]

        # 필터를 걸어도 미처리 건수는 전체 기준으로 유지된다.
        filtered = await admin_service.list_reports(session, status="resolved")
        assert filtered.total == 1
        assert filtered.pending == 2


def test_report_row_carries_people_and_repeat_count() -> None:
    asyncio.run(_test_report_row_carries_people_and_repeat_count())


async def _test_report_row_carries_people_and_repeat_count() -> None:
    sessions = await _session_factory()

    async with sessions() as session:
        a, b = _user("a@example.com"), _user("b@example.com")
        session.add_all([a, b])
        await session.commit()
        session.add_all([_report(a.id, b.id), _report(a.id, b.id, reason="spam")])
        await session.commit()

        page = await admin_service.list_reports(session)
        row = page.items[0]
        assert row.reporter.nickname == a.nickname
        assert row.reported_user.nickname == b.nickname
        # 반복성을 목록에서 바로 봐야 제재 수위를 정할 수 있다.
        assert row.reported_user_report_count == 2


def test_report_detail_hides_deleted_message_and_lists_related() -> None:
    asyncio.run(_test_report_detail_hides_deleted_message_and_lists_related())


async def _test_report_detail_hides_deleted_message_and_lists_related() -> None:
    sessions = await _session_factory()

    async with sessions() as session:
        a, b = await _matched_pair(session, "a@example.com", "b@example.com")
        room = (await session.execute(select(ChatRoom))).scalars().first()
        alive = ChatMessage(
            id=str(uuid.uuid4()), room_id=room.id, sender_id=b.id,
            client_message_id=str(uuid.uuid4()),
            content="살아있는 메시지", sequence=100, created_at=datetime.utcnow(),
        )
        removed = ChatMessage(
            id=str(uuid.uuid4()), room_id=room.id, sender_id=b.id,
            client_message_id=str(uuid.uuid4()),
            content="지워진 메시지", sequence=101, created_at=datetime.utcnow(),
            deleted_at=datetime.utcnow(),
        )
        session.add_all([alive, removed])
        await session.commit()

        first = _report(a.id, b.id, message_id=alive.id)
        second = _report(a.id, b.id, reason="spam", message_id=removed.id)
        session.add_all([first, second])
        await session.commit()

        detail = await admin_service.get_report(session, first.id)
        assert detail.message_content == "살아있는 메시지"
        # 같은 피신고자의 다른 신고가 함께 보여야 기준이 흔들리지 않는다.
        assert [r.id for r in detail.related_reports] == [second.id]

        # 지워진 메시지는 원문을 복원해 보여주지 않는다.
        removed_detail = await admin_service.get_report(session, second.id)
        assert removed_detail.message_content is None

        with pytest.raises(HTTPException):
            await admin_service.get_report(session, "no-such-report")


def test_review_records_decision_and_notifies_reporter_once() -> None:
    asyncio.run(_test_review_records_decision_and_notifies_reporter_once())


async def _test_review_records_decision_and_notifies_reporter_once() -> None:
    sessions = await _session_factory()

    async with sessions() as session:
        a, b = _user("a@example.com"), _user("b@example.com")
        admin = _user("ops@example.com", role="admin")
        session.add_all([a, b, admin])
        await session.commit()

        report = _report(a.id, b.id)
        session.add(report)
        await session.commit()

        # 검토 중으로 옮기는 단계에서는 아직 알리지 않는다.
        await admin_service.review_report(
            session, report.id, admin, AdminReportReviewIn(status="reviewing", note="확인 중")
        )
        notifications = (await session.execute(
            select(Notification).where(Notification.user_id == a.id)
        )).scalars().all()
        assert notifications == []

        result = await admin_service.review_report(
            session, report.id, admin, AdminReportReviewIn(status="resolved", note="경고 처리함")
        )
        assert result.status == "resolved"
        assert result.reviewed_by == admin.id
        assert result.reviewed_at is not None
        assert result.review_note == "경고 처리함"

        notifications = (await session.execute(
            select(Notification).where(Notification.user_id == a.id)
        )).scalars().all()
        assert len(notifications) == 1
        # 어떤 제재가 내려졌는지는 피신고자의 정보라 신고자에게 담지 않는다.
        assert "경고" not in notifications[0].body

        # 이미 닫힌 신고를 다시 저장해도 알림이 또 가지 않는다.
        await admin_service.review_report(
            session, report.id, admin, AdminReportReviewIn(status="dismissed", note="재검토")
        )
        notifications = (await session.execute(
            select(Notification).where(Notification.user_id == a.id)
        )).scalars().all()
        assert len(notifications) == 1


def test_review_rejects_missing_report() -> None:
    asyncio.run(_test_review_rejects_missing_report())


async def _test_review_rejects_missing_report() -> None:
    sessions = await _session_factory()

    async with sessions() as session:
        admin = _user("ops@example.com", role="admin")
        session.add(admin)
        await session.commit()

        with pytest.raises(HTTPException):
            await admin_service.review_report(
                session, "no-such-report", admin, AdminReportReviewIn(status="resolved")
            )
