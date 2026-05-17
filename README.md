# 🧭 OddTrip — AI 일정 자동 생성 + 동선 최적화

> OddTrip 백엔드에 추가될 5번/6번 기능의 **단독 실행 가능한 로직 모듈**입니다.
> 회원님이 직접 실행해서 검증한 뒤, 팀장님께서 OddTrip backend에 통합하시는 흐름입니다.

---

## 🎯 무엇을 만드는가

**5. AI 일정 자동 생성 기능**
- 관광지, 축제, 숙소, 이동 동선을 시간대별로 자동 배치
- 운영시간, 휴무일, 날씨, 자외선 지수, 재난 정보까지 반영
- 단순 추천 리스트가 아닌 **실제로 실행 가능한** 여행 플랜

**6. 동선 최적화 기능**
- 카카오 길찾기 API 활용해 이동시간 계산
- TSP 알고리즘(Held-Karp)으로 관광 순서를 효율적으로 정리

---

## ⚡ 빠른 시작 (3분)

```bash
# 1. 의존성 설치
pip install -r demo/requirements.txt

# 2. OpenAI 키 설정 (선택 - 없으면 템플릿 모드)
cp demo/.env.example demo/.env
# demo/.env 열어서 OPENAI_API_KEY 입력

# 3. 실행
python demo/run_demo.py
```

→ 콘솔에 3일짜리 서울 여행 일정이 출력됩니다.

다른 시나리오:
```bash
python demo/run_demo.py busan
python demo/run_demo.py jeju
```

---

## 📁 파일 구조

```
oddtrip-itinerary-feature/
├── README.md                   ← 이 파일 (시작점)
├── INTEGRATION_GUIDE.md        ← 팀장님 통합 가이드
├── ALGORITHM_NOTES.md          ← 알고리즘 상세 (Held-Karp 등)
├── PR_MESSAGE_TEMPLATE.md      ← PR 메시지 템플릿
│
├── src/                        ← 로직 모듈 (팀장이 통합할 부분)
│   ├── config.py               ← 환경변수 로더 (통합 시 삭제 예정)
│   ├── clients/                ← 외부 API 어댑터 4개
│   │   ├── kakao_client.py     좌표 검색 + 길찾기
│   │   ├── weather_client.py   기상청 날씨/자외선
│   │   ├── disaster_client.py  행안부 재난문자
│   │   └── place_info_client.py LLM 기반 운영시간 추론
│   └── planner/                ← 일정 생성 알고리즘
│       ├── models.py           도메인 객체 (InputPlace/PlannedDay/Slot)
│       ├── enricher.py         Step 1: 외부 데이터로 보강
│       ├── day_assigner.py     Step 2: 일자별 분배 (그리디 클러스터링)
│       ├── route_optimizer.py  Step 3: TSP 동선 최적화 ⭐
│       ├── time_scheduler.py   Step 4: 영업시간 만족 시간 배치
│       ├── llm_narrator.py     Step 5: GPT batch 설명 생성
│       └── planner.py          전체 오케스트레이터
│
├── demo/                       ← 단독 실행 환경 (회원님 검증용)
│   ├── README.md
│   ├── .env.example
│   ├── requirements.txt
│   ├── sample_data.py          서울/부산/제주 샘플
│   └── run_demo.py             콘솔 실행 스크립트
│
└── tests/                      ← 단위 테스트 (자동 검증)
    ├── conftest.py
    ├── test_route_optimizer.py  TSP 정확해 검증
    ├── test_day_assigner.py     일자 분배 검증
    └── test_time_scheduler.py   시간 제약 검증
```

---

## 🧪 검증 방법

### 1. 단위 테스트 실행

```bash
pip install pytest
python -m pytest tests/ -v
```

기대 결과:
```
tests/test_route_optimizer.py::test_empty_input PASSED
tests/test_route_optimizer.py::test_held_karp_4_cities_optimal PASSED
tests/test_day_assigner.py::test_six_places_two_days PASSED
tests/test_day_assigner.py::test_avoid_closed_day PASSED
tests/test_time_scheduler.py::test_lunch_slot_inserted PASSED
... (15개 테스트 모두 PASSED)
```

### 2. 데모 실행 (눈으로 확인)

```bash
python demo/run_demo.py
```

콘솔에 출력된 일정에서:
- ✅ 시간이 단조 증가하는가
- ✅ 영업시간 안에 방문이 배치되었는가
- ✅ 점심/저녁 슬롯이 자동 삽입되었는가
- ✅ 이동 시간이 합리적인가
- ✅ 일자별 장소 수가 균등한가
- ✅ aiReason이 자연스러운가 (OpenAI 키 있을 때)

---


## ⚙️ 핵심 설계 결정

### 1. "알고리즘 = 사실 / LLM = 설명" 분리
- 시간/거리는 검증 가능한 수치이므로 알고리즘이 결정
- 자연스러운 설명은 LLM이 작성 (단, 사실 변경 불가)
- 결과: LLM 환각으로 잘못된 일정 발생 불가

### 2. Mock 모드 기본 지원
- 외부 API 키가 없어도 결정론적 mock 반환
- 로컬 개발/데모/온보딩 시 외부 의존성 0

### 3. DB 모델 의존성 분리 (InputPlace)
- SQLAlchemy `Attraction` 대신 자체 dataclass `InputPlace` 사용
- standalone 동작 + 테스트 용이 + 결합도 낮음
- 통합 시 어댑터 한 줄로 변환

### 4. 비용 효율적인 LLM 사용
- 1 trip = 1 API call (batch 처리)
- gpt-4o-mini 사용 → 1 trip당 약 $0.001

---

## 📚 추가 문서

- [`ALGORITHM_NOTES.md`](./ALGORITHM_NOTES.md) — Held-Karp TSP, 클러스터링 등 알고리즘 상세
- [`demo/README.md`](./demo/README.md) — 데모 실행 가이드

---

## 🛡️ 보안 주의

⚠️ **`.env` 파일에 API 키를 입력하셨다면 절대 git/슬랙/이메일로 공유하지 마세요.**
회원님 명의로 청구되어 큰 금액이 나올 수 있습니다.
키 공유가 필요하면 1Password 같은 비밀번호 관리자나 직접 만나서 전달하세요.
