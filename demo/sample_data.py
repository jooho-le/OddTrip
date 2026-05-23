"""데모용 샘플 관광지 데이터.

실제 OddTrip에서는 사용자가 저장한 관광지 (Attraction.saved=True)가 들어갑니다.
여기서는 발표/시연용으로 미리 정의된 샘플을 사용합니다.

3가지 시나리오:
- SEOUL_SAMPLE: 서울 3일 여행 (북촌, 익선, 성수, 광장시장 등)
- BUSAN_SAMPLE: 부산 2일 여행 (해운대, 감천문화마을, 광안리 등)
- JEJU_SAMPLE: 제주 3일 여행 (성산일출봉, 우도, 한라산 등)
"""
from backend.app.planner import InputPlace


# ══════════════════════════════════════════════════════
# 서울 3일 여행 샘플 (관광지 + 축제 + 숙소 혼합)
# ══════════════════════════════════════════════════════
SEOUL_SAMPLE: list[InputPlace] = [
    InputPlace(
        id="s1",
        name="국립현대미술관 서울",
        category="박물관",
        description="현대 미술의 흐름을 한눈에 볼 수 있는 대표 미술관.",
        famous=True,
        active=False,
        latitude=37.578631,
        longitude=126.980003,
    ),
    InputPlace(
        id="s2",
        name="롤 파크",
        category="게임",
        description="롤 팬들을 위한 체험형 게임 테마파크.",
        famous=True,
        active=False,
        latitude=37.524057,
        longitude=127.022907,
    ),
    InputPlace(
        id="s3",
        name="북촌 전망 산책로",
        category="산책",
        description="서울의 오래된 지붕선과 도심 풍경을 함께 보는 코스.",
        famous=True,
        active=True,
        latitude=37.582604,
        longitude=126.986923,
    ),
    InputPlace(
        id="s4",
        name="성수 공방 체험관",
        category="체험",
        description="가죽 키링과 향을 직접 만드는 예약형 체험.",
        famous=False,
        active=True,
        latitude=37.544581,
        longitude=127.055962,
    ),
    InputPlace(
        id="s5",
        name="광장시장",
        category="시장",
        description="빈대떡과 마약김밥으로 유명한 전통시장.",
        famous=True,
        active=False,
        latitude=37.570039,
        longitude=126.999603,
    ),
    InputPlace(
        id="s6",
        name="서울 라이트 페스티벌",
        category="축제",
        description="가을 저녁 청계천 일대에서 열리는 빛 축제.",
        famous=True,
        active=False,
        latitude=37.569107,
        longitude=126.978388,
    ),
    InputPlace(
        id="s7",
        name="익선동 게스트하우스",
        category="숙소",
        description="한옥을 개조한 부티크 게스트하우스.",
        famous=False,
        active=False,
        latitude=37.572209,
        longitude=126.989851,
    ),
]


# ══════════════════════════════════════════════════════
# 부산 2일 여행 샘플
# ══════════════════════════════════════════════════════
BUSAN_SAMPLE: list[InputPlace] = [
    InputPlace(
        id="b1",
        name="해운대 해수욕장",
        category="해변",
        description="부산의 대표 해변. 산책과 사진 명소.",
        famous=True,
        active=True,
        latitude=35.158698,
        longitude=129.160384,
    ),
    InputPlace(
        id="b2",
        name="감천문화마을",
        category="산책",
        description="알록달록한 마을 전체가 야외 미술관.",
        famous=True,
        active=True,
        latitude=35.097485,
        longitude=129.010668,
    ),
    InputPlace(
        id="b3",
        name="자갈치시장",
        category="시장",
        description="부산 대표 수산물 시장. 회와 해산물 천국.",
        famous=True,
        active=False,
        latitude=35.096611,
        longitude=129.030548,
    ),
    InputPlace(
        id="b4",
        name="광안리 야경 카페",
        category="카페",
        description="광안대교 야경을 보며 쉴 수 있는 루프탑 카페.",
        famous=False,
        active=False,
        latitude=35.153170,
        longitude=129.118666,
    ),
    InputPlace(
        id="b5",
        name="국립해양박물관",
        category="박물관",
        description="해양 생태와 문화를 다룬 박물관 (월요일 휴관).",
        famous=False,
        active=False,
        latitude=35.078846,
        longitude=129.080037,
    ),
]


# ══════════════════════════════════════════════════════
# 제주 3일 여행 샘플
# ══════════════════════════════════════════════════════
JEJU_SAMPLE: list[InputPlace] = [
    InputPlace(
        id="j1",
        name="성산일출봉",
        category="산책",
        description="유네스코 자연유산. 일출 명소.",
        famous=True,
        active=True,
        latitude=33.458056,
        longitude=126.942500,
    ),
    InputPlace(
        id="j2",
        name="우도 자전거 코스",
        category="체험",
        description="우도 일주 자전거 대여 + 해변 카페.",
        famous=True,
        active=True,
        latitude=33.506413,
        longitude=126.955989,
    ),
    InputPlace(
        id="j3",
        name="제주 민속자연사박물관",
        category="박물관",
        description="제주의 자연과 민속 문화 (월요일 휴관).",
        famous=False,
        active=False,
        latitude=33.506627,
        longitude=126.531822,
    ),
    InputPlace(
        id="j4",
        name="협재 해수욕장",
        category="해변",
        description="에메랄드빛 바다와 비양도 풍경.",
        famous=True,
        active=False,
        latitude=33.393669,
        longitude=126.239031,
    ),
    InputPlace(
        id="j5",
        name="제주 동문시장",
        category="시장",
        description="흑돼지와 감귤이 가득한 전통시장.",
        famous=True,
        active=False,
        latitude=33.511598,
        longitude=126.526014,
    ),
    InputPlace(
        id="j6",
        name="제주 한옥 스테이",
        category="숙소",
        description="구좌읍에 위치한 독채 한옥 숙소.",
        famous=False,
        active=False,
        latitude=33.518057,
        longitude=126.861538,
    ),
]


# 시나리오 이름 → 데이터 매핑
SAMPLES = {
    "seoul": ("서울", SEOUL_SAMPLE, "서울특별시"),
    "busan": ("부산", BUSAN_SAMPLE, "부산광역시"),
    "jeju": ("제주", JEJU_SAMPLE, "제주특별자치도"),
}
