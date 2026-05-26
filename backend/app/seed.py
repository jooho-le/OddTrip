"""Seed TTI questions and travel types into the database."""
import asyncio

from sqlalchemy import select
from sqlalchemy.engine import Connection

from .database import async_session, engine, Base
from .models.tti import TtiQuestion, TravelType
from .models.user import User


TTI_QUESTIONS = [
    {"id": "q1", "axis": "PW", "prompt": "여행 첫날 숙소에 도착했다. 당신이 더 끌리는 방식은?", "left_label": "바로 동네를 걸으며 즉흥 탐색", "right_label": "저장한 코스부터 차례대로 확인", "left_letter": "P", "right_letter": "W", "sort_order": 1},
    {"id": "q2", "axis": "NC", "prompt": "새로운 도시에서 점심 장소를 고른다면?", "left_label": "처음 보는 현지 식당에 도전", "right_label": "후기 많은 검증 맛집 선택", "left_letter": "N", "right_letter": "C", "sort_order": 2},
    {"id": "q3", "axis": "FA", "prompt": "여행 중 가장 만족스러운 순간은?", "left_label": "카페와 공원에서 오래 머무는 시간", "right_label": "액티비티와 체험으로 꽉 찬 시간", "left_letter": "F", "right_letter": "A", "sort_order": 3},
    {"id": "q4", "axis": "HS", "prompt": "유명 관광지와 작은 동네 명소 중 고른다면?", "left_label": "사람들이 놓치는 조용한 장소", "right_label": "대표 랜드마크와 필수 코스", "left_letter": "H", "right_letter": "S", "sort_order": 4},
    {"id": "q5", "axis": "PW", "prompt": "비가 와서 일정이 틀어졌을 때 더 편한 쪽은?", "left_label": "그 자리에서 새 계획을 찾기", "right_label": "대체 실내 코스를 미리 준비하기", "left_letter": "P", "right_letter": "W", "sort_order": 5},
    {"id": "q6", "axis": "NC", "prompt": "여행 예산을 쓸 때 당신은?", "left_label": "기억에 남을 경험이면 과감히 지출", "right_label": "가격과 만족도를 비교해 안정 선택", "left_letter": "N", "right_letter": "C", "sort_order": 6},
    {"id": "q7", "axis": "FA", "prompt": "하루 일정의 이상적인 밀도는?", "left_label": "두세 곳만 깊게 즐기기", "right_label": "여러 곳을 빠르게 경험하기", "left_letter": "F", "right_letter": "A", "sort_order": 7},
    {"id": "q8", "axis": "HS", "prompt": "사진을 찍고 싶은 장소는?", "left_label": "골목, 로컬 상점, 우연한 풍경", "right_label": "전망대, 박물관, 대표 포토존", "left_letter": "H", "right_letter": "S", "sort_order": 8},
    {"id": "q9", "axis": "PW", "prompt": "여행 전 준비 스타일에 가깝게 고르면?", "left_label": "핵심만 정하고 현장에서 결정", "right_label": "예약, 동선, 시간을 상세히 정리", "left_letter": "P", "right_letter": "W", "sort_order": 9},
    {"id": "q10", "axis": "NC", "prompt": "동행자가 낯선 메뉴를 제안했다면?", "left_label": "좋아, 이번 여행의 발견일 수 있어", "right_label": "리뷰와 재료를 먼저 확인하고 싶어", "left_letter": "N", "right_letter": "C", "sort_order": 10},
    {"id": "q11", "axis": "FA", "prompt": "오후 시간이 비었을 때 고르는 선택은?", "left_label": "숙소 근처에서 천천히 쉬기", "right_label": "근교 체험 프로그램 예약하기", "left_letter": "F", "right_letter": "A", "sort_order": 11},
    {"id": "q12", "axis": "HS", "prompt": "다녀온 여행을 떠올릴 때 더 좋은 기억은?", "left_label": "나만 알고 싶은 장면을 발견한 일", "right_label": "꼭 봐야 할 명소를 놓치지 않은 일", "left_letter": "H", "right_letter": "S", "sort_order": 12},
]

TRAVEL_TYPES = [
    {"code": "PNFH", "title": "느슨한 발견가", "description": "계획보다 감각을 믿고 숨은 장소에서 오래 머무는 타입입니다.", "keywords_json": ["즉흥", "로컬", "휴식"]},
    {"code": "WCAS", "title": "클래식 정복가", "description": "동선과 예약을 정리하고 대표 코스를 효율적으로 완주합니다.", "keywords_json": ["계획", "액티비티", "명소"]},
    {"code": "PNAS", "title": "즉흥 모험가", "description": "새로운 체험과 유명 포인트를 빠르게 즐기는 타입입니다.", "keywords_json": ["도전", "활동", "랜드마크"]},
    {"code": "WCFH", "title": "차분한 큐레이터", "description": "검증된 선택을 바탕으로 조용한 장소를 깊게 즐깁니다.", "keywords_json": ["안정", "휴식", "취향"]},
    {"code": "PNAH", "title": "자유로운 탐험가", "description": "즉흥적으로 새로운 체험을 찾아 숨은 명소를 누빕니다.", "keywords_json": ["즉흥", "도전", "숨은곳"]},
    {"code": "WCAH", "title": "전략적 탐색가", "description": "계획적으로 움직이되 숨은 장소에서 활동적인 체험을 즐깁니다.", "keywords_json": ["계획", "활동", "숨은곳"]},
    {"code": "PNFS", "title": "감성 여행자", "description": "유명 장소에서 느긋하게 머무르며 새로운 감각을 채웁니다.", "keywords_json": ["즉흥", "휴식", "명소"]},
    {"code": "WCFS", "title": "안정 지향 관광객", "description": "검증된 유명 코스를 여유롭게 즐기는 타입입니다.", "keywords_json": ["계획", "휴식", "명소"]},
    {"code": "WNFH", "title": "계획적 은둔가", "description": "꼼꼼히 계획하되 숨은 장소에서 조용히 쉬는 타입입니다.", "keywords_json": ["계획", "휴식", "숨은곳"]},
    {"code": "WNFS", "title": "계획적 감상가", "description": "새로운 시도를 계획적으로 준비해 유명 장소에서 여유를 즐깁니다.", "keywords_json": ["계획", "새로움", "명소"]},
    {"code": "WNAH", "title": "모험 설계자", "description": "새로운 활동을 꼼꼼히 준비해 숨은 명소를 정복합니다.", "keywords_json": ["계획", "새로움", "활동"]},
    {"code": "WNAS", "title": "전략적 모험가", "description": "계획 위에 새로운 체험을 쌓아 유명 코스를 완주합니다.", "keywords_json": ["계획", "새로움", "랜드마크"]},
    {"code": "PCFH", "title": "느긋한 안전파", "description": "즉흥적이면서도 검증된 곳에서 조용히 쉬는 타입입니다.", "keywords_json": ["즉흥", "안정", "휴식"]},
    {"code": "PCFS", "title": "편안한 관광객", "description": "가볍게 움직이며 유명 장소를 편안한 속도로 즐깁니다.", "keywords_json": ["즉흥", "안정", "명소"]},
    {"code": "PCAH", "title": "활동적 실용주의자", "description": "안전한 선택 안에서 활동적인 경험을 찾습니다.", "keywords_json": ["즉흥", "안정", "활동"]},
    {"code": "PCAS", "title": "실용적 관광객", "description": "검증된 유명 코스를 즉흥적이면서 활동적으로 즐기는 타입입니다.", "keywords_json": ["즉흥", "안정", "명소", "활동"]},
]

SAMPLE_USERS = [
    {
        "id": "sample-user-doyun",
        "nickname": "도윤",
        "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80",
        "home_region": "Busan",
        "tti_code": "WCAS",
        "tti_scores_json": [
            {"axis": "PW", "leftLetter": "P", "rightLetter": "W", "score": 2},
            {"axis": "NC", "leftLetter": "N", "rightLetter": "C", "score": 2},
            {"axis": "FA", "leftLetter": "F", "rightLetter": "A", "score": 2},
            {"axis": "HS", "leftLetter": "H", "rightLetter": "S", "score": 2},
        ],
    },
    {
        "id": "sample-user-seoa",
        "nickname": "서아",
        "avatar_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=240&q=80",
        "home_region": "Jeju",
        "tti_code": "WCAH",
        "tti_scores_json": [
            {"axis": "PW", "leftLetter": "P", "rightLetter": "W", "score": 2},
            {"axis": "NC", "leftLetter": "N", "rightLetter": "C", "score": 2},
            {"axis": "FA", "leftLetter": "F", "rightLetter": "A", "score": 2},
            {"axis": "HS", "leftLetter": "H", "rightLetter": "S", "score": -2},
        ],
    },
    {
        "id": "sample-user-junho",
        "nickname": "준호",
        "avatar_url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=240&q=80",
        "home_region": "Gangneung",
        "tti_code": "PCAH",
        "tti_scores_json": [
            {"axis": "PW", "leftLetter": "P", "rightLetter": "W", "score": -2},
            {"axis": "NC", "leftLetter": "N", "rightLetter": "C", "score": 2},
            {"axis": "FA", "leftLetter": "F", "rightLetter": "A", "score": 2},
            {"axis": "HS", "leftLetter": "H", "rightLetter": "S", "score": -2},
        ],
    },
]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_ensure_user_columns)
        await conn.run_sync(_ensure_attraction_columns)

    async with async_session() as session:
        # Seed questions
        for q_data in TTI_QUESTIONS:
            existing = await session.execute(
                select(TtiQuestion).where(TtiQuestion.id == q_data["id"])
            )
            if not existing.scalar_one_or_none():
                session.add(TtiQuestion(**q_data))

        # Seed travel types
        for t_data in TRAVEL_TYPES:
            existing = await session.execute(
                select(TravelType).where(TravelType.code == t_data["code"])
            )
            if not existing.scalar_one_or_none():
                session.add(TravelType(**t_data))

        # Seed demo users so the real matching API has candidates immediately.
        for user_data in SAMPLE_USERS:
            existing = await session.execute(
                select(User).where(User.id == user_data["id"])
            )
            if not existing.scalar_one_or_none():
                session.add(User(**user_data))

        await session.commit()
        print("Seed completed successfully!")


def _ensure_attraction_columns(conn: Connection) -> None:
    """SQLite local DB helper.

    `create_all` does not add columns to an existing table. For local demo DBs,
    add newly introduced public-data columns if they are missing. Production
    should use Alembic migrations.
    """
    if conn.dialect.name != "sqlite":
        return

    existing = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(attractions)").fetchall()}
    column_sql = {
        "content_id": "VARCHAR(50)",
        "content_type_id": "VARCHAR(20)",
        "source": "VARCHAR(50)",
        "addr1": "VARCHAR(500)",
        "addr2": "VARCHAR(500)",
        "map_x": "VARCHAR(50)",
        "map_y": "VARCHAR(50)",
        "area_code": "VARCHAR(20)",
        "sigungu_code": "VARCHAR(20)",
        "tel": "VARCHAR(100)",
        "homepage": "TEXT",
        "opening_hours_json": "JSON",
        "closed_days_json": "JSON",
        "congestion_score": "INTEGER",
        "hidden_score": "INTEGER",
        "related_rank": "INTEGER",
        "raw_json": "JSON",
    }
    for name, ddl in column_sql.items():
        if name not in existing:
            conn.exec_driver_sql(f"ALTER TABLE attractions ADD COLUMN {name} {ddl}")


def _ensure_user_columns(conn: Connection) -> None:
    if conn.dialect.name != "sqlite":
        return

    existing = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(users)").fetchall()}
    column_sql = {
        "email": "VARCHAR(255)",
        "password_hash": "VARCHAR(255)",
    }
    for name, ddl in column_sql.items():
        if name not in existing:
            conn.exec_driver_sql(f"ALTER TABLE users ADD COLUMN {name} {ddl}")

    indexes = {row[1] for row in conn.exec_driver_sql("PRAGMA index_list(users)").fetchall()}
    if "ix_users_email" not in indexes:
        conn.exec_driver_sql("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users(email)")


if __name__ == "__main__":
    asyncio.run(seed())
