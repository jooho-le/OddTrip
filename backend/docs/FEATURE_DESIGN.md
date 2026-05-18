# Backend Feature Design Notes

추가 백엔드 기능을 설계할 때 쓰는 작업 메모입니다.  
기능을 바로 코드부터 만들면 프론트 응답 모양과 DB 저장 방식이 어긋나기 쉬워서, 먼저 아래 항목을 채우고 들어가는 쪽이 좋습니다.

## 기능 설계 템플릿

```md
## 기능 이름

### 사용 화면
- 예: 공동 의사결정 화면

### 사용자 행동
- 예: 사용자가 장소/활동/음식 우선순위를 저장한다.

### API
- Method:
- Path:
- Headers:
- Request:
- Response:

### DB 변경
- 새 테이블:
- 기존 테이블 변경:
- 인덱스 필요 여부:

### 서비스 로직
- 검증:
- 계산:
- 외부 API:
- fallback:

### 프론트 연결
- 연결할 파일:
- 필요한 상태:
- loading / empty / error 처리:
```

## 다음에 설계하면 좋은 기능 후보

### 1. 실제 로그인/세션

현재는 `X-User-Id` 헤더 기반 임시 인증입니다.  
앱까지 고려하면 나중에는 최소한 access token 기반 구조가 필요합니다.

후보 API:

```txt
POST /api/auth/guest
POST /api/auth/login
POST /api/auth/refresh
GET  /api/auth/me
```

처음에는 게스트 로그인만 있어도 프론트와 앱 시연이 훨씬 안정적입니다.

### 2. 매칭 수락 이후 trip context 고정

현재 매칭 수락 시 `Trip`이 생성됩니다.  
다음 단계에서는 프론트가 현재 활성 trip을 쉽게 가져올 수 있어야 합니다.

후보 API:

```txt
GET /api/trips/current
GET /api/trips/{tripId}
PATCH /api/trips/{tripId}/status
```

### 3. 공동 우선순위 투표

지금 preferences는 최종값 저장에 가깝습니다.  
실제 공동 의사결정처럼 보이려면 각 사용자의 선택과 합의 결과를 분리하는 편이 좋습니다.

후보 모델:

```txt
trip_votes
- id
- trip_id
- user_id
- category
- value
- priority
```

후보 API:

```txt
PUT /api/trips/{tripId}/votes/me
GET /api/trips/{tripId}/votes/summary
```

### 4. 관광지 추천 재생성 옵션

추천 재생성 시 “실내만”, “숨은 명소 위주”, “예산 낮게” 같은 조건이 들어가야 합니다.

후보 API:

```txt
POST /api/trips/{tripId}/attractions/generate
```

request 예시:

```json
{
  "region": "서울",
  "filters": {
    "indoor": true,
    "hiddenSpots": true,
    "pace": 55,
    "budget": 60
  }
}
```

### 5. 일정 재조정

현재 일정 생성은 전체 생성 중심입니다.  
발표 이후에는 특정 일정 하나만 바꾸는 API가 필요합니다.

후보 API:

```txt
POST /api/trips/{tripId}/itinerary/regenerate
PATCH /api/trips/{tripId}/itinerary/items/{itemId}
POST /api/trips/{tripId}/itinerary/items/{itemId}/alternatives
```

### 6. 안전 알림 기반 자동 변경 제안

날씨/재난 알림이 뜰 때 단순 표시가 아니라 “변경 제안”까지 만들면 서비스 차별점이 분명해집니다.

후보 API:

```txt
POST /api/trips/{tripId}/safety/adjustment-suggestions
POST /api/trips/{tripId}/safety/apply-adjustment
```

## 프론트와 맞춰야 하는 응답 규칙

프론트는 현재 camelCase 타입을 씁니다.

예:

```json
{
  "recommendationScore": 96,
  "matchLevel": "완전 반대",
  "avatarUrl": "..."
}
```

백엔드 내부 Python 코드는 snake_case를 써도 되지만, 응답은 Pydantic alias를 이용해서 camelCase로 맞추는 게 좋습니다.

## 에러 응답 규칙

FastAPI 기본 에러는 `{ "detail": "..." }`로 나갑니다.  
프론트 서비스 레이어에서 이 형태를 흡수할 수 있지만, 자체 API 응답은 가능하면 아래 모양을 유지합니다.

```json
{
  "data": null,
  "error": "사용자가 이해할 수 있는 메시지"
}
```

다만 validation error나 404 같은 기본 HTTP 에러는 FastAPI 기본 형식이 섞일 수 있습니다. 이건 나중에 exception handler를 추가해서 정리하면 됩니다.
