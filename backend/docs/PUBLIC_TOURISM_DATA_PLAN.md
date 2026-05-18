# Public Tourism Data Recommendation Plan

OddTrip 관광 추천을 공공데이터 기반으로 확장하기 위한 설계 메모입니다.  
목표는 TourAPI 데이터를 그대로 보여주는 것이 아니라, 두 여행자의 TTI 중간지점과 공동 선호를 기준으로 “왜 이 장소가 둘에게 맞는지”까지 설명하는 추천 파이프라인을 만드는 것입니다.

## 1. 가져올 API와 데이터

### A. 한국관광공사 TourAPI 관광정보 서비스

용도: 기본 관광지, 축제, 숙박, 음식점, 문화시설, 레포츠 후보 수집

우선 사용할 operation:

| operation | 용도 |
| --- | --- |
| `areaBasedList2` | 지역 기반 관광지/음식점/숙박/축제 후보 조회 |
| `locationBasedList2` | 특정 좌표 주변 후보 조회 |
| `searchKeyword2` | 키워드 기반 후보 조회 |
| `searchFestival2` | 기간 기반 축제/행사 조회 |
| `detailCommon2` | 설명, 주소, 대표 이미지, 좌표 등 공통 상세 |
| `detailIntro2` | contentType별 상세 정보 |
| `detailImage2` | 추가 이미지 조회 |

contentTypeId 매핑:

| contentTypeId | 의미 | OddTrip 활용 |
| --- | --- | --- |
| `12` | 관광지 | 기본 장소 추천 |
| `14` | 문화시설 | 실내/휴식형 후보 |
| `15` | 축제/공연/행사 | 날짜 기반 이벤트 추천 |
| `28` | 레포츠 | 활동형 후보 |
| `32` | 숙박 | 일정 생성 시 숙소 주변 동선 |
| `39` | 음식점 | 식사 일정 후보 |

### B. 관광지별 연관 관광지 정보

공공데이터포털 `한국관광공사_관광지별 연관 관광지 정보`입니다.  
티맵 내비게이션 데이터를 기반으로 관광지별 연관 관광지를 제공합니다. 지자체별 중심관광지와 연결성이 높은 연관관광지를 전체/관광지/음식/숙박 유형별 최대 50위까지 제공합니다.

2025년 공지 기준 변경된 base URL:

```txt
https://apis.data.go.kr/B551011/TarRlteTarService1
```

사용할 operation:

| operation | 용도 |
| --- | --- |
| `areaBasedList1` | 지역 기반 연관 관광지 조회 |
| `searchKeyword1` | 키워드 기반 연관 관광지 조회 |

OddTrip 활용:

- 후속 코스 추천
- “이 장소 다음에 많이 이어지는 장소” 추천
- 음식/숙박/다른 관광지 타입별 다음 후보 분리

### C. 기초지자체 중심 관광지 정보

공공데이터포털 `한국관광공사_기초지자체 중심 관광지 정보`입니다.  
티맵 내비게이션 데이터 기반으로 특정 지역에서 다른 관광지와 연계 방문 빈도가 높은 중심 관광지 100위 정보를 제공합니다.

2025년 공지 기준 변경된 base URL:

```txt
https://apis.data.go.kr/B551011/LocgoHubTarService1
```

사용할 operation:

| operation | 용도 |
| --- | --- |
| `areaBasedList1` | 지역 기반 중심 관광지 조회 |

OddTrip 활용:

- 후보 풀 생성 시 “동선 허브” 점수 부여
- 너무 외진 장소만 추천되지 않게 일정 안정성 보정
- 첫날/마지막날처럼 동선 실패 비용이 큰 날에 우선 반영

### D. 관광빅데이터 지역별 방문자수

공공데이터포털 `한국관광공사_빅데이터_지역별 방문자수_GW`입니다.  
KT 내국인, SKT 외국인 이동통신 데이터를 기반으로 광역/기초지자체별 방문자 수 정보를 제공합니다.

OddTrip 활용:

- 지역 단위 혼잡도 추정
- 방문자 규모가 낮은 후보를 “숨은 명소”로 가중
- 일정 날짜/시기별 혼잡 회피 문구 생성

주의:

- 방문자 수는 관광객 수와 완전히 같은 의미가 아닙니다.
- 광역/기초지자체별 집계 기준이 달라 임의 합산하면 안 됩니다.

### E. 관광지 집중률 방문자 추이 예측 정보

공공데이터포털 연관 데이터 `한국관광공사_관광지 집중률 방문자 추이 예측 정보`입니다.

OddTrip 활용:

- “이번 주말은 혼잡 예상” 같은 추천 이유
- 인기 장소를 이른 시간대로 배치
- 혼잡 회피형 사용자에게 대체 장소 추천

### F. 지역별 관광 다양성

공공데이터포털 `한국관광공사_지역별 관광 다양성`입니다.  
관광 수요 지수를 구성하는 관광객 다양성, 관광소비 다양성, 국제적 다양성 정보를 제공합니다.

OddTrip 활용:

- 다양한 연령/국적 방문이 있는 지역은 초행자 친화 후보로 가중
- 너무 단조로운 지역은 “숨은 명소”보다 “취향 특화”로 분류

## 2. 코드를 넣을 위치

이미 추가한 위치:

```txt
backend/app/services/tour_api_client.py
```

공공데이터 API를 직접 호출하는 얇은 클라이언트입니다. 지금 들어간 메서드:

- `area_based_list`
- `location_based_list`
- `search_keyword`
- `search_festival`
- `detail_common`
- `detail_intro`
- `detail_images`
- `related_attractions_by_area`
- `related_attractions_by_keyword`
- `hub_attractions`
- `visitor_trend`

다음에 수정할 핵심 위치:

```txt
backend/app/services/attraction_service.py
```

현재는 OpenAI 생성 결과를 바로 DB에 저장합니다.  
다음 단계에서는 아래 순서로 바꾸면 됩니다.

```txt
TourAPI 후보 수집
-> 중심/연관/방문자 데이터 보강
-> TTI와 공동 선호 기준 점수화
-> OpenAI 추천 이유 문장 생성
-> attractions 테이블 저장
```

OpenAI 역할을 바꿀 위치:

```txt
backend/app/services/openai_service.py
```

OpenAI가 장소를 새로 만들어내지 않게 하고, TourAPI 후보를 받아 랭킹/설명만 하게 바꾸는 게 좋습니다.

DB 모델 확장 위치:

```txt
backend/app/models/trip.py
```

`Attraction` 모델에 추가하면 좋은 필드:

```txt
content_id
content_type_id
source
addr1
map_x
map_y
area_code
sigungu_code
congestion_score
hidden_score
hub_rank
related_rank
raw_json
```

응답 스키마 확장 위치:

```txt
backend/app/schemas/attraction.py
```

프론트에 혼잡도, 숨은 명소 점수, 후속 코스 근거를 내려주려면 여기부터 확장합니다.

라우터 위치:

```txt
backend/app/routers/attractions.py
```

기존 endpoint:

```txt
POST /api/trips/{trip_id}/attractions/generate
```

이 endpoint 내부 구현을 TourAPI 기반으로 바꾸면 프론트 변경이 적습니다.  
기존 AI 생성 방식과 분리하고 싶으면 아래 endpoint를 새로 둡니다.

```txt
POST /api/trips/{trip_id}/attractions/generate-public
```

## 3. 추천 파이프라인 초안

### Step 1. 입력 확정

추천 생성 요청은 최소 이 정도를 받는 것이 좋습니다.

```json
{
  "region": "서울",
  "areaCode": "1",
  "sigunguCode": "1",
  "dateFrom": "2026-06-01",
  "dateTo": "2026-06-03",
  "filters": {
    "indoorPreferred": true,
    "hiddenSpots": true,
    "pace": 55,
    "budget": 60
  }
}
```

### Step 2. 후보 수집

TTI와 선호에 따라 contentTypeId를 다르게 가져옵니다.

- 휴식형: `12`, `14`, `39`
- 활동형: `12`, `15`, `28`
- 실내 우선: `14`, `39`
- 일정 생성용 전체 풀: `12`, `14`, `15`, `28`, `39`

### Step 3. 데이터 보강

가능하면 지역 방문자수, 관광지 집중률 예측, 중심/연관 관광지 데이터를 붙입니다.

점수 예시:

```txt
finalScore
= ttiFitScore
+ preferenceScore
+ relatedCourseScore
+ hiddenScore
+ hubScore
- congestionPenalty
```

### Step 4. OpenAI 설명 보강

OpenAI는 장소를 새로 지어내는 역할이 아니라, 이미 수집한 공공데이터 후보를 받아 설명과 랭킹을 정리하는 역할로 제한합니다.

이 방식이 좋은 이유:

- 장소 실재성은 TourAPI가 보장
- 추천 이유는 OddTrip 서비스 톤으로 설명 가능
- 환각 위험 감소

### Step 5. DB 저장

최종 후보를 `attractions` 테이블에 저장합니다.  
저장 후 프론트는 기존 관광지 추천 화면을 그대로 사용할 수 있습니다.

## 4. 개발 순서

1. 공공데이터포털에서 아래 API 활용신청
   - 한국관광공사 TourAPI 관광정보 서비스
   - 한국관광공사_관광지별 연관 관광지 정보
   - 한국관광공사_기초지자체 중심 관광지 정보
   - 한국관광공사_빅데이터_지역별 방문자수_GW
   - 한국관광공사_관광지 집중률 방문자 추이 예측 정보
2. `backend/.env`에 `TOUR_API_SERVICE_KEY` 입력
3. `tour_api_client.py` 단독 호출 테스트
4. `Attraction` 모델 확장 migration 작성
5. `attraction_service.generate_attractions`를 TourAPI 기반으로 변경
6. OpenAI에는 후보 목록과 사용자 성향만 넘기도록 수정
7. 프론트 관광지 추천 카드에 혼잡도/숨은 명소/후속 코스 태그 표시

## 4-1. 현재 구현된 1차 개발 범위

DB migration 없이 바로 개발을 이어갈 수 있도록 1차 구현을 넣었습니다.

추가된 파일:

```txt
backend/app/services/tour_api_client.py
```

추가된 endpoint:

```txt
POST /api/trips/{tripId}/attractions/generate-public
```

요청 예시:

```json
{
  "areaCode": "1",
  "sigunguCode": "1",
  "keywords": ["북촌", "전시"],
  "contentTypeIds": ["12", "14", "15", "28", "39"],
  "rowsPerType": 12,
  "limit": 8
}
```

동작 방식:

```txt
TourAPI 후보 수집
-> contentId 기준 중복 제거
-> 중심 관광지 데이터로 후속 코스 태그 보강
-> TTI/공동 선호 기반 간단 점수화
-> detailCommon2로 최종 후보 상세 보강
-> 기존 attractions 테이블에 저장
```

현재는 기존 프론트 응답 형태를 유지하기 위해 확장 데이터(`contentId`, 좌표, 혼잡도)는 DB에 저장하지 않습니다. 다음 단계에서 migration을 추가하면 됩니다.

## 4-2. env 입력 방식

공공데이터포털에서 받은 키가 API마다 다르면 각각 넣고, 같은 키를 쓰면 `TOUR_API_SERVICE_KEY`에만 넣어도 됩니다.

```env
TOUR_API_SERVICE_KEY=국문관광정보서비스키
TOUR_API_RELATED_SERVICE_KEY=관광지별연관관광지키
TOUR_API_HUB_SERVICE_KEY=기초지자체중심관광지키
TOUR_API_BIGDATA_SERVICE_KEY=관광빅데이터키
TOUR_API_CONCENTRATION_SERVICE_KEY=관광지집중률예측키
```

개별 키가 비어 있으면 `TOUR_API_SERVICE_KEY`를 fallback으로 사용합니다.

## 5. 응답 예시

```json
{
  "id": "uuid",
  "name": "북촌 전망 산책로",
  "category": "관광지",
  "imageUrl": "https://...",
  "description": "서울의 오래된 지붕선과 도심 풍경을 함께 보는 코스.",
  "reason": "대표 명소와 숨은 골목을 함께 만족시키는 중간 지점입니다.",
  "tags": ["실외", "활동형", "혼잡 낮음", "후속 코스 좋음"],
  "indoor": false,
  "active": true,
  "famous": true,
  "saved": false,
  "excluded": false,
  "publicData": {
    "contentId": "12345",
    "contentTypeId": "12",
    "source": "TourAPI",
    "areaCode": "1",
    "sigunguCode": "1",
    "mapX": 126.98,
    "mapY": 37.57,
    "congestionScore": 42,
    "hiddenScore": 78,
    "relatedRank": 6
  }
}
```

초기 프론트 변경은 `tags`에 혼잡/숨은명소/후속코스 문구만 추가해도 충분합니다. 상세 데이터는 나중에 `publicData`로 확장하면 됩니다.

## 참고 링크

- 한국관광콘텐츠랩: https://api.visitkorea.or.kr/
- TourAPI 안내: https://www.2025tourapi.com/sub/sub01.html
- 지역별 방문자수 GW: https://www.data.go.kr/data/15101972/openapi.do
- 관광지별 연관 관광지 정보: https://www.data.go.kr/data/15128560/openapi.do
- 기초지자체 중심 관광지 정보: https://www.data.go.kr/data/15128559/openapi.do
- 지역별 관광 다양성: https://www.data.go.kr/data/15151365/openapi.do
