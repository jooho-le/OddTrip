import asyncio
import uuid
from datetime import date, datetime, timedelta

from sqlalchemy import event, func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from backend.app.database import Base
from backend.app.models import Match, Notification, Trip, TripReminder, User
from backend.app.services import reminder_service

# 한국 시각 2026-09-18 10:00 = UTC 01:00. 발송 시각(오전 9시)을 지난 시점이다.
MORNING = datetime(2026, 9, 18, 1, 0)
TOMORROW = date(2026, 9, 19)


def _session_factory():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    @event.listens_for(engine.sync_engine, "connect")
    def register_postgres_compatibility_functions(dbapi_connection, _connection_record) -> None:
        dbapi_connection.create_function("least", 2, min, deterministic=True)
        dbapi_connection.create_function("greatest", 2, max, deterministic=True)

    return engine, async_sessionmaker(engine, expire_on_commit=False)


async def _trip(db, *, start: date | None = TOMORROW, status: str = "confirmed", region: str = "강릉"):
    first = User(id=str(uuid.uuid4()), nickname="도윤", tti_code="WCAS")
    second = User(id=str(uuid.uuid4()), nickname="서아", tti_code="PNFH")
    match = Match(
        id=str(uuid.uuid4()),
        user_id=first.id,
        matched_user_id=second.id,
        match_level="완전 반대",
        recommendation_score=95,
    )
    trip = Trip(id=str(uuid.uuid4()), match_id=match.id, status=status, region=region, start_date=start)
    db.add_all([first, second, match, trip])
    await db.commit()
    return trip, first, second


async def _count(db, model):
    return int((await db.execute(select(func.count()).select_from(model))).scalar_one())


def test_sends_one_reminder_to_each_traveller_and_never_twice() -> None:
    asyncio.run(_test_sends_one_reminder_to_each_traveller_and_never_twice())


async def _test_sends_one_reminder_to_each_traveller_and_never_twice() -> None:
    engine, session_factory = _session_factory()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        trip, first, second = await _trip(db)

        sent = await reminder_service.send_due_reminders(db, now=MORNING)

        assert {notification.user_id for notification in sent} == {first.id, second.id}
        assert sent[0].title == "내일 강릉 여행이 시작돼요"
        assert sent[0].link == f"/trips/{trip.id}/schedule"
        assert sent[0].type == "trip.reminder_d1"
        # 상대 이름이 본문에 들어간다. 누구와 떠나는 여행인지가 알림함에서 바로 보인다.
        assert "님과 함께하는 여행이에요" in (sent[0].body or "")
        assert sent[0].payload_json == {"tripId": trip.id, "startDate": "2026-09-19", "kind": "d1"}

        # 스케줄러는 주기적으로 깨어난다. 같은 날 몇 번을 돌아도 한 번만 간다.
        assert await reminder_service.send_due_reminders(db, now=MORNING) == []
        assert await reminder_service.send_due_reminders(db, now=MORNING + timedelta(hours=5)) == []
        assert await _count(db, Notification) == 2
        assert await _count(db, TripReminder) == 2

    await engine.dispose()


def test_waits_for_the_send_hour_in_korean_time() -> None:
    asyncio.run(_test_waits_for_the_send_hour_in_korean_time())


async def _test_waits_for_the_send_hour_in_korean_time() -> None:
    engine, session_factory = _session_factory()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        await _trip(db)

        # 한국 시각 2026-09-18 08:00. 아직 보낼 시각이 아니다.
        assert await reminder_service.send_due_reminders(db, now=datetime(2026, 9, 17, 23, 0)) == []
        # UTC로는 전날 23시지만 한국에서는 이미 18일 아침이다. UTC로 D-1을 계산하면
        # 이 시점에 20일 출발 여행을 잘못 고른다.
        assert reminder_service.due_trip_date(datetime(2026, 9, 17, 23, 0), 9) is None
        assert reminder_service.due_trip_date(datetime(2026, 9, 18, 1, 0), 9) == TOMORROW

        assert len(await reminder_service.send_due_reminders(db, now=MORNING)) == 2

    await engine.dispose()


def test_skips_trips_that_are_not_about_to_start() -> None:
    asyncio.run(_test_skips_trips_that_are_not_about_to_start())


async def _test_skips_trips_that_are_not_about_to_start() -> None:
    engine, session_factory = _session_factory()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        await _trip(db, start=date(2026, 9, 18))   # 오늘 출발. D-1은 어제 지났다.
        await _trip(db, start=date(2026, 9, 20))   # 모레 출발
        await _trip(db, start=None)                # 날짜가 없는 여행
        await _trip(db, status="cancelled")
        await _trip(db, status="completed")

        assert await reminder_service.send_due_reminders(db, now=MORNING) == []

    await engine.dispose()


def test_reminds_again_when_the_trip_moves_to_another_date() -> None:
    asyncio.run(_test_reminds_again_when_the_trip_moves_to_another_date())


async def _test_reminds_again_when_the_trip_moves_to_another_date() -> None:
    engine, session_factory = _session_factory()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        trip, _, _ = await _trip(db)
        assert len(await reminder_service.send_due_reminders(db, now=MORNING)) == 2

        # 출발이 일주일 밀렸다. 새 출발일의 하루 전에 다시 알려야 한다.
        trip.start_date = date(2026, 9, 26)
        await db.commit()

        assert await reminder_service.send_due_reminders(db, now=MORNING) == []
        later = await reminder_service.send_due_reminders(db, now=datetime(2026, 9, 25, 1, 0))
        assert len(later) == 2
        assert await _count(db, TripReminder) == 4

    await engine.dispose()


def test_leaves_out_withdrawn_accounts_but_still_tells_the_other_traveller() -> None:
    asyncio.run(_test_leaves_out_withdrawn_accounts_but_still_tells_the_other_traveller())


async def _test_leaves_out_withdrawn_accounts_but_still_tells_the_other_traveller() -> None:
    engine, session_factory = _session_factory()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        _, first, second = await _trip(db)
        second.deleted_at = datetime(2026, 9, 1)
        await db.commit()

        sent = await reminder_service.send_due_reminders(db, now=MORNING)

        assert [notification.user_id for notification in sent] == [first.id]
        # 탈퇴한 동행의 이름은 본문에 넣지 않는다.
        assert sent[0].body == "일정과 준비물을 미리 확인해 보세요."

    await engine.dispose()


def test_falls_back_to_the_trip_title_when_there_is_no_region() -> None:
    asyncio.run(_test_falls_back_to_the_trip_title_when_there_is_no_region())


async def _test_falls_back_to_the_trip_title_when_there_is_no_region() -> None:
    engine, session_factory = _session_factory()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        trip, _, _ = await _trip(db, region="")
        trip.title = "둘만의 첫 여행"
        await db.commit()

        # 이름이 "여행"으로 끝나면 제목에 '여행'을 또 붙이지 않는다.
        assert (await reminder_service.send_due_reminders(db, now=MORNING))[0].title == "내일 둘만의 첫 여행이 시작돼요"

    await engine.dispose()
