import asyncio
import uuid
from datetime import datetime

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import event, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from backend.app.database import Base
from backend.app.models import Block, Match, Trip, User
from backend.app.schemas.community import (
    CommunityCommentIn,
    CommunityDraftIn,
    CommunityPostIn,
)
from backend.app.services import community_service


def _session_factory():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    @event.listens_for(engine.sync_engine, "connect")
    def register_postgres_compatibility_functions(dbapi_connection, _connection_record) -> None:
        # matches의 짝 유일 인덱스가 쓰는 함수. SQLite에는 없어서 만들어 준다.
        dbapi_connection.create_function("least", 2, min, deterministic=True)
        dbapi_connection.create_function("greatest", 2, max, deterministic=True)

    return engine, async_sessionmaker(engine, expire_on_commit=False)


async def _prepare(db, count: int = 2) -> list[User]:
    users = [
        User(id=str(uuid.uuid4()), nickname=nickname, tti_code="PNFH")
        for nickname in ("여행자A", "여행자B", "여행자C")[:count]
    ]
    db.add_all(users)
    await db.commit()
    return users


def _post_input(**overrides) -> CommunityPostIn:
    values = {
        "title": "강릉에서 보낸 이틀",
        "body": "바다를 따라 걷다가 우연히 들어간 책방이 좋았다. 다음 여행자에게도 권하고 싶다.",
        "category": "여행기",
        "region": "강릉",
        "tags": ["바다", "책방"],
        "allow_comments": True,
    }
    values.update(overrides)
    return CommunityPostIn(**values)


def test_post_crud_and_author_only_changes() -> None:
    asyncio.run(_test_post_crud_and_author_only_changes())


async def _test_post_crud_and_author_only_changes() -> None:
    engine, session_factory = _session_factory()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        author, other = await _prepare(db)

        created = await community_service.create_post(db, author, _post_input())
        assert created.title == "강릉에서 보낸 이틀"
        assert created.tags == ["바다", "책방"]
        assert created.mine is True
        assert created.like_count == 0 and created.comment_count == 0

        # 남이 읽을 때는 내 글이 아니라고 표시된다.
        seen = await community_service.get_post(db, other, created.id)
        assert seen.mine is False
        assert seen.comments == []

        updated = await community_service.update_post(
            db, author, created.id, _post_input(title="강릉에서 보낸 이틀, 다시", tags=["바다"])
        )
        assert updated.title == "강릉에서 보낸 이틀, 다시"
        assert updated.tags == ["바다"]
        assert updated.created_at == created.created_at

        with pytest.raises(HTTPException) as denied:
            await community_service.update_post(db, other, created.id, _post_input())
        assert denied.value.status_code == 403
        with pytest.raises(HTTPException) as denied:
            await community_service.delete_post(db, other, created.id)
        assert denied.value.status_code == 403

        await community_service.delete_post(db, author, created.id)
        with pytest.raises(HTTPException) as gone:
            await community_service.get_post(db, author, created.id)
        assert gone.value.status_code == 404
        # 지워진 글은 목록에서도 사라진다.
        assert (await community_service.list_posts(db, author)).total == 0

    await engine.dispose()


def test_list_filters_search_sort_and_pagination() -> None:
    asyncio.run(_test_list_filters_search_sort_and_pagination())


async def _test_list_filters_search_sort_and_pagination() -> None:
    engine, session_factory = _session_factory()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        author, reader = await _prepare(db)

        story = await community_service.create_post(db, author, _post_input())
        tip = await community_service.create_post(
            db,
            author,
            _post_input(
                title="제주 버스 타는 법",
                body="공항 버스는 배차가 길어서 시간표를 미리 저장해 두면 편하다. 정류장 이름이 비슷하니 주의.",
                category="여행 팁",
                region="제주",
                tags=["교통"],
            ),
        )

        everything = await community_service.list_posts(db, reader)
        assert everything.total == 2
        # 최신순이 기본이다.
        assert [item.id for item in everything.items] == [tip.id, story.id]

        by_category = await community_service.list_posts(db, reader, category="여행 팁")
        assert [item.id for item in by_category.items] == [tip.id]

        # 검색은 제목·본문·지역·태그·작성자 닉네임을 함께 훑는다.
        assert [item.id for item in (await community_service.list_posts(db, reader, query="책방")).items] == [story.id]
        assert [item.id for item in (await community_service.list_posts(db, reader, query="교통")).items] == [tip.id]
        assert [item.id for item in (await community_service.list_posts(db, reader, query="제주")).items] == [tip.id]
        assert (await community_service.list_posts(db, reader, query="여행자A")).total == 2
        assert (await community_service.list_posts(db, reader, query="없는말")).total == 0

        # 공감순은 공감이 많은 글을 앞에 둔다.
        await community_service.set_reaction(db, reader, story.id, "liked", True)
        popular = await community_service.list_posts(db, reader, sort="popular")
        assert [item.id for item in popular.items] == [story.id, tip.id]

        first = await community_service.list_posts(db, reader, size=1, page=1)
        second = await community_service.list_posts(db, reader, size=1, page=2)
        assert first.total == 2 and first.total_pages == 2
        assert [item.id for item in first.items] == [tip.id]
        assert [item.id for item in second.items] == [story.id]

        # "내 글"은 작성자에게만 보이고, 읽기만 한 사람에게는 비어 있다.
        assert (await community_service.list_posts(db, author, view="mine")).total == 2
        assert (await community_service.list_posts(db, reader, view="mine")).total == 0

        with pytest.raises(HTTPException) as bad_view:
            await community_service.list_posts(db, reader, view="everything")
        assert bad_view.value.status_code == 400

    await engine.dispose()


def test_reactions_are_idempotent_and_personal() -> None:
    asyncio.run(_test_reactions_are_idempotent_and_personal())


async def _test_reactions_are_idempotent_and_personal() -> None:
    engine, session_factory = _session_factory()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        author, reader = await _prepare(db)
        post = await community_service.create_post(db, author, _post_input())

        liked = await community_service.set_reaction(db, reader, post.id, "liked", True)
        assert liked.like_count == 1 and liked.liked is True
        # 같은 요청이 두 번 닿아도 공감은 하나다.
        again = await community_service.set_reaction(db, reader, post.id, "liked", True)
        assert again.like_count == 1

        both = await community_service.set_reaction(db, author, post.id, "liked", True)
        assert both.like_count == 2

        # 공감 수는 모두의 합이고, liked는 읽는 사람의 상태다.
        seen_by_stranger = await community_service.get_post(db, author, post.id)
        assert seen_by_stranger.like_count == 2 and seen_by_stranger.liked is True

        cancelled = await community_service.set_reaction(db, reader, post.id, "liked", False)
        assert cancelled.like_count == 1 and cancelled.liked is False

        # 저장은 저장한 사람의 목록에만 나타난다.
        await community_service.set_reaction(db, reader, post.id, "saved", True)
        assert (await community_service.list_posts(db, reader, view="saved")).total == 1
        assert (await community_service.list_posts(db, author, view="saved")).total == 0

        await community_service.set_reaction(db, reader, post.id, "saved", False)
        assert (await community_service.list_posts(db, reader, view="saved")).total == 0

    await engine.dispose()


def test_comments_follow_the_post_setting_and_author() -> None:
    asyncio.run(_test_comments_follow_the_post_setting_and_author())


async def _test_comments_follow_the_post_setting_and_author() -> None:
    engine, session_factory = _session_factory()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        author, reader = await _prepare(db)
        post = await community_service.create_post(db, author, _post_input())

        comment = await community_service.create_comment(
            db, reader, post.id, CommunityCommentIn(body="  책방 이름이 궁금해요.  ")
        )
        assert comment.body == "책방 이름이 궁금해요."
        assert comment.mine is True

        detail = await community_service.get_post(db, author, post.id)
        assert detail.comment_count == 1
        assert detail.comments and detail.comments[0].mine is False

        with pytest.raises(HTTPException) as denied:
            await community_service.delete_comment(db, author, post.id, comment.id)
        assert denied.value.status_code == 403

        await community_service.delete_comment(db, reader, post.id, comment.id)
        assert (await community_service.get_post(db, author, post.id)).comment_count == 0

        # 댓글을 받지 않는 글로 바꾸면 새 댓글이 막힌다.
        await community_service.update_post(db, author, post.id, _post_input(allow_comments=False))
        with pytest.raises(HTTPException) as closed:
            await community_service.create_comment(db, reader, post.id, CommunityCommentIn(body="다시 질문"))
        assert closed.value.status_code == 403

    await engine.dispose()


def test_blocked_users_disappear_from_the_board() -> None:
    asyncio.run(_test_blocked_users_disappear_from_the_board())


async def _test_blocked_users_disappear_from_the_board() -> None:
    engine, session_factory = _session_factory()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        author, reader = await _prepare(db)
        post = await community_service.create_post(db, author, _post_input())
        comment = await community_service.create_comment(
            db, reader, post.id, CommunityCommentIn(body="잘 읽었습니다.")
        )

        # 차단은 양방향으로 가린다. 차단한 쪽에서도, 차단당한 쪽에서도 보이지 않는다.
        db.add(Block(id=str(uuid.uuid4()), blocker_id=reader.id, blocked_user_id=author.id))
        await db.commit()

        assert (await community_service.list_posts(db, reader)).total == 0
        with pytest.raises(HTTPException) as hidden:
            await community_service.get_post(db, reader, post.id)
        assert hidden.value.status_code == 404

        # 글쓴이는 자기 글을 계속 본다. 가려지는 것은 차단한 상대가 남긴 댓글이다.
        mine = await community_service.get_post(db, author, post.id)
        assert mine.comments == [] and mine.comment_count == 0
        # 목록의 댓글 수도 열어 본 화면과 같아야 한다.
        listed = await community_service.list_posts(db, author)
        assert [item.comment_count for item in listed.items] == [0]

        # 차단이 풀리면 글도 댓글도 그대로 돌아온다.
        block = (await db.execute(select(Block))).scalar_one()
        block.released_at = datetime.utcnow()
        await db.commit()

        restored = await community_service.get_post(db, reader, post.id)
        assert restored.id == post.id
        assert restored.comments and restored.comments[0].id == comment.id

    await engine.dispose()


def test_drafts_survive_until_the_post_is_published() -> None:
    asyncio.run(_test_drafts_survive_until_the_post_is_published())


async def _test_drafts_survive_until_the_post_is_published() -> None:
    engine, session_factory = _session_factory()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        author, other = await _prepare(db)

        draft = await community_service.save_draft(
            db, author, "new", CommunityDraftIn(title="쓰다 만 글", body="여기까지 썼다.")
        )
        assert draft.draft_key == "new" and draft.category == "여행기"
        # 초안은 완성 전이라 제목이 비어 있어도 저장된다.
        await community_service.save_draft(db, author, "trip:trip-1", CommunityDraftIn())
        keys = [item.draft_key for item in await community_service.list_drafts(db, author)]
        assert sorted(keys) == ["new", "trip:trip-1"]
        # 초안은 계정별로 나뉜다.
        assert await community_service.list_drafts(db, other) == []

        # 작성 완료가 그 초안을 같은 요청에서 정리한다.
        post = await community_service.create_post(db, author, _post_input(), draft_key="new")
        assert [item.draft_key for item in await community_service.list_drafts(db, author)] == ["trip:trip-1"]

        # 수정 초안은 그 글의 작성자만 만들 수 있다.
        await community_service.save_draft(db, author, post.id, CommunityDraftIn(title="고치는 중"))
        with pytest.raises(HTTPException) as denied:
            await community_service.save_draft(db, other, post.id, CommunityDraftIn(title="남의 글"))
        assert denied.value.status_code == 403

        # 수정 완료도 그 글의 초안을 지운다.
        await community_service.update_post(db, author, post.id, _post_input(title="고친 제목"))
        assert [item.draft_key for item in await community_service.list_drafts(db, author)] == ["trip:trip-1"]

        await community_service.delete_draft(db, author, "trip:trip-1")
        assert await community_service.list_drafts(db, author) == []
        with pytest.raises(HTTPException) as gone:
            await community_service.delete_draft(db, author, "trip:trip-1")
        assert gone.value.status_code == 404

    await engine.dispose()


def test_post_links_to_a_trip_the_author_joined() -> None:
    asyncio.run(_test_post_links_to_a_trip_the_author_joined())


async def _test_post_links_to_a_trip_the_author_joined() -> None:
    engine, session_factory = _session_factory()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        author, other = await _prepare(db)
        match = Match(
            id=str(uuid.uuid4()),
            user_id=author.id,
            matched_user_id=other.id,
            match_level="완전 반대",
            recommendation_score=95,
        )
        trip = Trip(id=str(uuid.uuid4()), match_id=match.id, status="confirmed")
        db.add_all([match, trip])
        await db.commit()

        linked = await community_service.create_post(db, author, _post_input(trip_id=trip.id))
        assert linked.trip_id == trip.id
        # tripId 없이 수정해도 연결은 유지된다.
        assert (await community_service.update_post(db, author, linked.id, _post_input())).trip_id == trip.id

        stranger = (await _prepare(db, count=3))[2]
        with pytest.raises(HTTPException) as denied:
            await community_service.create_post(db, stranger, _post_input(trip_id=trip.id))
        assert denied.value.status_code == 404

    await engine.dispose()


def test_input_validation_matches_the_writing_screen() -> None:
    # 화면(validatePost)과 같은 한도를 서버에서도 지킨다.
    with pytest.raises(ValidationError):
        _post_input(title="   ")
    with pytest.raises(ValidationError):
        _post_input(title="가" * 81)
    with pytest.raises(ValidationError):
        _post_input(body="짧다")
    with pytest.raises(ValidationError):
        _post_input(category="사진")
    with pytest.raises(ValidationError):
        _post_input(region="가" * 31)
    with pytest.raises(ValidationError):
        _post_input(tags=["가", "나", "다", "라", "마", "바"])
    with pytest.raises(ValidationError):
        _post_input(tags=["가" * 21])
    with pytest.raises(ValidationError):
        _post_input(image="javascript:alert(1)")
    with pytest.raises(ValidationError):
        _post_input(image="data:image/gif;base64,R0lGOD")
    with pytest.raises(ValidationError):
        _post_input(image="data:image/png;base64," + "A" * 1_200_000)
    with pytest.raises(ValidationError):
        CommunityCommentIn(body="   ")

    # 태그는 중복과 앞의 #을 정리하고, 빈 값은 버린다.
    assert _post_input(tags=["#바다", "바다", " ", "책방"]).tags == ["바다", "책방"]
    # 지역과 사진 설명은 비면 저장하지 않는다.
    cleaned = _post_input(region="  ", image_caption="  ")
    assert cleaned.region is None and cleaned.image_caption is None
    assert _post_input(image="data:image/webp;base64,UklGRg==").image.startswith("data:image/webp")
