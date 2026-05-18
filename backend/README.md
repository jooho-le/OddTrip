# OddTrip Backend

FastAPI 기반 OddTrip 백엔드입니다.  
현재 목표는 프론트가 실제 API를 호출해서 사용자, TTI, 매칭, 공동 의사결정, 관광지 추천, 일정 생성, 안전 알림 흐름을 끝까지 실행할 수 있게 하는 것입니다.

## 환경 변수

백엔드는 `backend/.env`를 읽습니다. 루트 `.env`가 아닙니다.  
실제 키는 `backend/.env`에만 넣고, Git에는 올리지 않습니다.

```env
DATABASE_URL=sqlite+aiosqlite:///./oddtrip.db
OPENAI_API_KEY=sk-your-real-key-here
OPENAI_MODEL=gpt-4o-mini
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
TOUR_API_SERVICE_KEY=
KAKAO_REST_API_KEY=
KMA_API_KEY=
MOIS_API_KEY=
```

예시 파일은 `backend/.env.example`입니다.

## 실행 준비

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

기본 로컬 개발은 SQLite를 사용합니다. 별도 DB 설치 없이 seed를 실행하면 `backend/oddtrip.db` 파일이 생성됩니다.

MySQL로 테스트하고 싶다면 `.env`를 아래처럼 바꾸고 MySQL에 `oddtrip` 데이터베이스를 먼저 만들어야 합니다.

```sql
CREATE DATABASE oddtrip CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```env
DATABASE_URL=mysql+aiomysql://root:password@localhost:3306/oddtrip
```

초기 TTI 질문, 여행 유형, 시연용 매칭 후보 사용자는 seed로 넣습니다.

```bash
python -m app.seed
```

개발 서버 실행:

```bash
uvicorn app.main:app --reload --port 8000
```

API 문서는 서버 실행 후 여기서 확인합니다.

```txt
http://localhost:8000/docs
```

플래너 단위 테스트는 아래처럼 실행합니다.

```bash
python -m pytest ../tests/test_day_assigner.py ../tests/test_route_optimizer.py ../tests/test_time_scheduler.py
```

## 현재 API 경계

| 영역 | prefix | 역할 |
| --- | --- | --- |
| users | `/api/users` | 사용자 생성, 내 정보 조회, 내 정보 수정 |
| tti | `/api/tti` | TTI 질문 조회, 결과 계산, 유형 목록 조회 |
| matches | `/api/matches` | 매칭 후보 조회, 매칭 상세, 매칭 수락 |
| decision | `/api/trips/{tripId}` | 공동 선호 조회/저장, 충돌 조정 제안 |
| attractions | `/api/trips/{tripId}` | 관광지 조회/생성, 저장/제외 |
| itinerary | `/api/trips/{tripId}` | 일정 조회/생성 |
| safety | `/api/trips/{tripId}` | 날씨/재난/안전 알림 조회 |

## 인증 방식

아직 로그인은 없습니다. 임시로 `X-User-Id` 헤더를 씁니다.

예를 들어 TTI 계산, 매칭 조회, AI 생성 API는 아래처럼 호출해야 합니다.

```http
X-User-Id: 생성된-user-id
```

프론트와 연결할 때는 먼저 `/api/users`로 사용자를 만들고, 응답의 `id`를 이후 요청 헤더에 넣는 방식으로 시작하면 됩니다.

## OpenAI 사용 위치

OpenAI 호출은 `backend/app/services/openai_service.py`에 모아두었습니다.

현재 AI가 담당하는 일:

- 관광지 추천 생성
- 공동 의사결정 충돌 조정 문장 생성
- 3일 일정 생성

`OPENAI_API_KEY`가 비어 있거나 호출 실패가 나면 fallback 데이터를 반환하도록 되어 있습니다. 발표나 로컬 개발 중 API quota 문제로 전체 흐름이 막히지 않게 하기 위한 처리입니다.

## 폴더 설명

```txt
backend/app/main.py
```

FastAPI 앱 진입점입니다. CORS 설정과 라우터 연결이 여기 있습니다.

```txt
backend/app/config.py
```

환경 변수를 읽는 설정 파일입니다. `backend/.env`를 기준으로 읽습니다.

```txt
backend/app/database.py
```

SQLAlchemy async engine과 session 설정입니다.

```txt
backend/app/dependencies.py
```

라우터에서 공통으로 쓰는 의존성입니다. DB session과 임시 사용자 인증이 들어 있습니다.

```txt
backend/app/models/
```

DB 테이블 모델입니다. 사용자, TTI, 매칭, 여행, 관광지, 일정, 안전 알림 테이블이 있습니다.

```txt
backend/app/schemas/
```

요청/응답 DTO입니다. 프론트와 맞춰야 하는 JSON 형태는 여기서 관리합니다.

```txt
backend/app/routers/
```

HTTP endpoint입니다. 라우터는 얇게 유지하고, 실제 로직은 services로 넘기는 구조가 좋습니다.

```txt
backend/app/services/
```

비즈니스 로직입니다. TTI 계산, 매칭 점수, 관광지 생성, 일정 생성 같은 흐름이 여기에 들어갑니다.

```txt
backend/app/clients/
```

외부 API 클라이언트입니다. 카카오 좌표/길찾기, 기상청 날씨/자외선, 행안부 재난 알림, 장소 운영시간 추론을 담당합니다. API 키가 없으면 개발용 fallback 데이터로 동작합니다.

```txt
backend/app/planner/
```

실행 가능한 일정표 생성 파이프라인입니다. 장소 좌표/운영시간 보강, 날짜별 분배, 동선 최적화, 시간대 배치, 날씨/재난 주의사항, AI 설명 생성을 처리합니다.

```txt
backend/app/seed.py
```

초기 개발 데이터 입력 스크립트입니다. 지금은 TTI 질문과 16개 유형을 넣습니다.

## 앞으로 기능 추가할 때 원칙

라우터에는 HTTP 입출력만 두고, 판단 로직은 service에 둡니다.  
프론트가 쓰는 응답 형식은 가능하면 `{ "data": ..., "error": null }` 모양으로 유지합니다.  
DB에 저장되는 구조를 바꿀 때는 model, schema, service, router 순서로 같이 봅니다.

새 기능을 추가할 때는 보통 이 순서가 가장 덜 꼬입니다.

1. 어떤 화면에서 필요한 기능인지 정리
2. 요청/응답 JSON 먼저 설계
3. schema 추가
4. model 변경이 필요하면 Alembic migration 추가
5. service에 실제 로직 추가
6. router endpoint 연결
7. 프론트 `src/services/oddtripService.ts`에서 호출 연결

## 공공데이터 관광 추천 확장

TourAPI와 관광데이터랩 계열 API를 활용한 추천 설계는 아래 문서에 정리했습니다.

```txt
backend/docs/PUBLIC_TOURISM_DATA_PLAN.md
```

공공데이터 API 키는 `backend/.env`의 `TOUR_API_SERVICE_KEY`에 넣으면 됩니다.

API별 키가 따로 발급됐으면 아래 변수에 각각 넣으면 됩니다.

```env
TOUR_API_SERVICE_KEY=
TOUR_API_RELATED_SERVICE_KEY=
TOUR_API_HUB_SERVICE_KEY=
TOUR_API_BIGDATA_SERVICE_KEY=
TOUR_API_CONCENTRATION_SERVICE_KEY=
```

공공데이터 기반 관광지 생성 endpoint:

```txt
POST /api/trips/{tripId}/attractions/generate-public
```

현재 저장하는 공공데이터:

- `contentId`, `contentTypeId`
- 주소, 전화번호, 홈페이지
- 위도/경도 좌표
- 지역 코드, 시군구 코드
- 운영시간/휴무일 추론값
- 혼잡 회피 점수
- 숨은 명소 점수
- 연관 관광지 순위
- 원본 TourAPI 응답 일부

## AI 일정 자동 생성

일정 생성 endpoint는 아래입니다.

```txt
POST /api/trips/{tripId}/itinerary/generate
```

현재 동작:

1. 저장한 관광지가 있으면 저장한 관광지를 우선 사용
2. 저장한 관광지가 없으면 제외되지 않은 추천 관광지 전체 사용
3. 장소명으로 좌표 보강
4. 장소 운영시간/휴무일 추론
5. 여행 기간별 날씨/자외선 정보 수집
6. 재난/안전 알림 수집
7. 날짜별 장소 분배
8. 카카오 길찾기 기반 이동시간 계산 또는 fallback 이동시간 계산
9. 운영시간 안에서 시간대별 슬롯 배치
10. AI 또는 템플릿으로 추천 이유 생성

지도 화면 렌더링은 아직 프론트에서 `MapPlaceholder`를 사용합니다. 지도 UI 연동은 별도 작업입니다.

선택 환경변수:

```env
KAKAO_REST_API_KEY=
KMA_API_KEY=
MOIS_API_KEY=
```

값이 비어 있으면 mock/fallback 로직으로 동작합니다.
