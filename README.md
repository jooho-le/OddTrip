# OddTrip

혼자 떠나는 여행을 더 넓은 취향과 연결하는 AI 여행 매칭 서비스입니다.

OddTrip은 단순히 비슷한 사람을 추천하는 앱이 아닙니다. 사용자의 여행 성향을 TTI 진단으로 분석하고, 나와 다른 강점을 가진 여행자와 연결한 뒤, 두 사람의 취향을 균형 있게 반영한 관광지와 일정을 생성합니다.

## Live

| 구분 | URL |
| --- | --- |
| Frontend | https://odd-trip.vercel.app |
| Backend API Docs | https://oddtrip.onrender.com/docs |

## 핵심 흐름

```txt
회원가입/로그인
  -> TTI 여행 성향 진단
  -> 반대 성향 매칭
  -> 공동 취향 조율
  -> 공공데이터 기반 관광지 추천
  -> AI 일정 생성
  -> 날씨/주의사항 확인
```

## 주요 기능

| 기능 | 설명 |
| --- | --- |
| TTI 진단 | 12문항으로 즉흥/계획, 새로움/검증, 휴식/활동, 숨은곳/대표명소 성향을 계산합니다. |
| 반대 성향 매칭 | 나와 비슷한 사람보다 여행을 넓혀줄 보완형 여행자를 추천합니다. |
| 공동 의사결정 | 장소, 활동, 음식, 예산, 일정 강도를 함께 조율합니다. |
| 관광지 추천 | TourAPI와 AI fallback을 활용해 여행 후보지를 생성합니다. |
| 일정 생성 | 관광지, 식사, 이동, 휴식을 시간대별로 배치합니다. |
| 안전 정보 | 날씨, 재난, 주의사항을 일정 맥락에 맞게 보여줍니다. |
| 지도 표시 | Google Maps 키가 있으면 실제 지도를 렌더링하고, 없으면 placeholder를 표시합니다. |

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| State | Zustand |
| Routing | React Router |
| Backend | FastAPI, SQLAlchemy Async ORM |
| Database | Supabase PostgreSQL, local SQLite |
| AI | OpenAI API |
| External APIs | TourAPI, Google Maps, KMA, MOIS |
| Deploy | Vercel, Render, Supabase |
| Mobile Ready | Capacitor 설정 포함 |

## 아키텍처

```txt
Browser
  -> Vercel Frontend
    -> Zustand tripStore
      -> oddtripService fetch client
        -> Render FastAPI
          -> SQLAlchemy Async ORM
            -> Supabase PostgreSQL

Render FastAPI
  -> OpenAI API
  -> TourAPI
  -> Google Maps API
  -> KMA / MOIS API
```

## 폴더 구조

```txt
OddTrip/
  src/
    app/          앱 라우팅과 공통 레이아웃
    pages/        화면 단위 페이지
    components/   여러 화면에서 쓰는 컴포넌트
    entities/     Zustand 전역 상태
    services/     백엔드 API 호출 계층
    shared/       공통 UI와 유틸
    styles/       전역 스타일
    types/        도메인 타입

  backend/
    app/
      routers/    FastAPI 라우터
      services/   비즈니스 로직
      planner/    일정 생성 파이프라인
      clients/    외부 API 클라이언트
      models/     SQLAlchemy 모델
      schemas/    요청/응답 DTO
    requirements.txt

  tests/          플래너 단위 테스트
```

## 로컬 실행

### 1. 프론트엔드

```bash
npm install
npm run dev
```

기본 주소:

```txt
http://localhost:5173
```

### 2. 백엔드

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API 문서:

```txt
http://localhost:8000/docs
```

## 환경변수

프론트와 백엔드는 루트 `.env` 하나를 기준으로 개발할 수 있습니다. 실제 배포에서는 Vercel과 Render에 각각 필요한 값만 넣습니다.

### 로컬 예시

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_MAPS_API_KEY=Google_Maps_Browser_Key

DATABASE_URL=sqlite+aiosqlite:///./oddtrip.db
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4o-mini
AUTH_SECRET_KEY=replace-with-long-random-secret
AUTH_TOKEN_EXPIRE_MINUTES=20160
ALLOW_DEMO_USER_HEADER_AUTH=false

CORS_ORIGINS=http://localhost:5173
CORS_ORIGIN_REGEX=^https?://(localhost|127\.0\.0\.1):\d+$

TOUR_API_SERVICE_KEY=
GOOGLE_MAPS_API_KEY=Google_Maps_Server_Key
KMA_API_KEY=
MOIS_API_KEY=
```

## 배포 설정

### Vercel

프론트엔드만 배포합니다.

```txt
Framework Preset: Vite
Root Directory: ./
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

Vercel 환경변수:

```env
VITE_API_BASE_URL=https://oddtrip.onrender.com
VITE_GOOGLE_MAPS_API_KEY=Google_Maps_Browser_Key
```

`vercel.json`에서 SPA 라우팅 새로고침 404를 방지합니다.

### Render

FastAPI 백엔드를 배포합니다.

```txt
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Render 환경변수:

```env
PYTHON_VERSION=3.11.9
DATABASE_URL=postgresql+asyncpg://...
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4o-mini
AUTH_SECRET_KEY=replace-with-long-random-secret
AUTH_TOKEN_EXPIRE_MINUTES=20160
ALLOW_DEMO_USER_HEADER_AUTH=false
CORS_ORIGINS=https://odd-trip.vercel.app
CORS_ORIGIN_REGEX=^https://.*\.vercel\.app$
TOUR_API_SERVICE_KEY=
GOOGLE_MAPS_API_KEY=
KMA_API_KEY=
MOIS_API_KEY=
```

앱 시작 시 `backend/app/seed.py`가 실행되어 기본 테이블과 TTI 데이터를 준비합니다.

### Supabase

Supabase는 PostgreSQL 데이터베이스로 사용합니다. Render의 `DATABASE_URL`에는 SQLAlchemy async 드라이버 형식이 필요합니다.

```txt
postgresql+asyncpg://USER:PASSWORD@HOST:PORT/postgres
```

Supabase에서 받은 값이 `postgresql://...` 형태여도 앱이 자동 보정하지만, 운영 환경변수에는 `postgresql+asyncpg://...`로 넣는 것을 권장합니다.

## API 경계

| Prefix | 역할 |
| --- | --- |
| `/api/auth` | 회원가입, 로그인, 내 정보 |
| `/api/users` | 사용자 관련 개발용 API |
| `/api/tti` | TTI 질문, 결과 계산 |
| `/api/matches` | 매칭 후보, 매칭 수락 |
| `/api/trips/{tripId}/preferences` | 공동 선호 저장 |
| `/api/trips/{tripId}/attractions` | 관광지 조회/생성 |
| `/api/trips/{tripId}/agent` | 여행 에이전트 실행 |
| `/api/trips/{tripId}/itinerary` | 일정 조회/생성 |
| `/api/trips/{tripId}/safety` | 날씨/주의사항 |

## 검증 명령

프론트 빌드:

```bash
npm run build
```

백엔드 테스트:

```bash
backend/.venv/bin/python -m pytest tests/test_day_assigner.py tests/test_route_optimizer.py tests/test_time_scheduler.py
```

## 자주 나는 배포 문제

| 증상 | 확인할 것 |
| --- | --- |
| 배포 사이트에서 `localhost:8000` 요청 | Vercel `VITE_API_BASE_URL`이 Render 주소인지 확인 후 재배포 |
| CORS 오류 | Render `CORS_ORIGINS=https://odd-trip.vercel.app` 확인 |
| Render에서 `psycopg2` 오류 | `DATABASE_URL`이 `postgresql+asyncpg://`인지 확인 |
| Render에서 Python 3.14 사용 | `PYTHON_VERSION=3.11.9` 환경변수 확인 |
| 지도 placeholder 표시 | Vercel `VITE_GOOGLE_MAPS_API_KEY`와 Maps JavaScript API 활성화 확인 |
| 회원가입 500 | Render 로그와 Supabase 연결 문자열 확인 |

## 모바일 확장

Capacitor 설정이 포함되어 있어 웹 앱을 iOS/Android 앱으로 감쌀 수 있습니다.

```bash
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

```bash
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

## 보안 메모

- `.env`는 커밋하지 않습니다.
- 브라우저에 노출되는 키는 `VITE_` prefix가 붙습니다.
- Google Maps 브라우저 키는 `https://odd-trip.vercel.app/*` referrer 제한을 권장합니다.
- OpenAI API key, Supabase password는 노출되면 즉시 폐기 후 재발급해야 합니다.

## 현재 상태

- 프론트엔드: Vercel 배포 가능
- 백엔드: Render 배포 가능
- DB: Supabase PostgreSQL 연결 가능
- 테스트: 플래너 단위 테스트 통과
