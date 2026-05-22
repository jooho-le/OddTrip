# oddtrip

혼자 여행하는 사람을 위한 AI 여행 매칭 서비스입니다.  
핵심 아이디어는 단순히 “비슷한 사람”을 붙이는 게 아니라, TTI 진단으로 여행 성향을 읽고 나와 반대되는 장점을 가진 사람과 같이 여행을 설계하게 만드는 것입니다.

현재 프론트는 mock 데이터를 쓰지 않고 `http://localhost:8000`의 FastAPI 백엔드를 호출합니다. TTI 질문, 결과 계산, 매칭, Trip 생성, 공동 선호 저장, 공공데이터 기반 관광지 추천, 일정/안전 알림 조회가 API를 통해 이어집니다.

## 실행 방법

```bash
npm install
npm run dev
```

프론트와 백엔드는 프로젝트 루트의 `.env` 하나를 같이 읽습니다.

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_MAPS_API_KEY=Google_Maps_Browser_Key
DATABASE_URL=sqlite+aiosqlite:///./oddtrip.db
OPENAI_API_KEY=sk-your-key-here
TOUR_API_SERVICE_KEY=공공데이터_키
GOOGLE_MAPS_API_KEY=Google_Maps_Server_Key
```

프로덕션 빌드는 아래 명령으로 확인합니다.

```bash
npm run build
```

## 사용 기술

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Zustand
- Capacitor 설정 파일 포함

## 큰 구조

```txt
src/
  app/          앱 라우터와 전체 레이아웃
  pages/        실제 화면 단위 폴더
  components/   여러 화면에서 같이 쓰는 앱 컴포넌트
  shared/       버튼, 카드 같은 공통 UI와 작은 유틸
  entities/     전역 상태 저장소
  services/     실제 백엔드 API 호출 계층
  types/        서비스 도메인 타입
  styles/       전역 스타일과 애니메이션
```

## 페이지 폴더

페이지는 한 파일씩 흩어두지 않고 화면별 폴더로 나눴습니다. 지금은 각 폴더 안에 `index.tsx`만 있지만, 화면이 커지면 같은 폴더 안에 `components.tsx`, `hooks.ts`, `constants.ts`처럼 붙여서 키우면 됩니다.

| 경로 | 의미 |
| --- | --- |
| `src/pages/landing/index.tsx` | 첫 진입 화면입니다. oddtrip의 핵심 메시지, 카드뉴스형 소개, 움직이는 매칭/일정 프리뷰가 들어 있습니다. |
| `src/pages/tti-start/index.tsx` | TTI 진단 시작 화면입니다. 진단 축과 소요시간, 진행 방식을 설명합니다. |
| `src/pages/tti-questions/index.tsx` | 12문항 TTI 진단 화면입니다. 한 문항씩 보여주고 진행률과 이전/다음 흐름을 관리합니다. |
| `src/pages/tti-result/index.tsx` | TTI 결과 화면입니다. 유형 코드, 축별 점수, 반대 유형, 매칭 CTA를 보여줍니다. |
| `src/pages/matches/index.tsx` | 반대 성향 매칭 추천 목록입니다. 후보 카드, 추천도, 수락/보류/다시 추천 흐름을 담당합니다. |
| `src/pages/match-detail/index.tsx` | 선택한 매칭 상대 상세 화면입니다. 내 성향과 상대 성향 차이, 보완점, 공동 일정 CTA가 있습니다. |
| `src/pages/decision/index.tsx` | 공동 의사결정 화면입니다. 장소, 활동, 음식, 일정 강도, 예산, AI 조정 제안을 다룹니다. |
| `src/pages/attractions/index.tsx` | 관광지 추천 화면입니다. 필터, 저장/제외 상태, 지도 보기 CTA를 보여줍니다. |
| `src/pages/itinerary/index.tsx` | 3일 일정 생성 결과 화면입니다. 날짜별 타임라인, 날씨 배너, 일정 상세 진입이 있습니다. |
| `src/pages/itinerary-detail/index.tsx` | 일정 상세 화면입니다. 장소 설명, 이동 시간, 추천 이유, 지도 placeholder, 변경 옵션이 들어 있습니다. |
| `src/pages/safety/index.tsx` | 알림/안전 화면입니다. 날씨 변화, 재난성 알림, 일정 조정 필요 여부를 카드로 보여줍니다. |
| `src/pages/my-trip/index.tsx` | 마이페이지 성격의 내 여행 화면입니다. 내 유형, 저장한 여행지, 생성 일정, 최근 매칭 기록을 모읍니다. |

## 주요 파일 설명

| 파일 | 역할 |
| --- | --- |
| `src/main.tsx` | React 앱을 DOM에 붙이는 시작점입니다. 전역 CSS도 여기서 불러옵니다. |
| `src/app/App.tsx` | 전체 라우팅을 정의합니다. URL과 페이지 컴포넌트가 여기서 연결됩니다. |
| `src/app/AppLayout.tsx` | 공통 앱 레이아웃입니다. 상단 헤더, 웹 사이드 내비게이션, 모바일 하단 탭을 감쌉니다. |
| `src/components/AppHeader.tsx` | 앱 상단 헤더입니다. 뒤로가기, 현재 화면명, 안전 알림 진입을 처리합니다. |
| `src/components/BottomTabs.tsx` | 모바일 하단 탭입니다. Capacitor 앱으로 감쌌을 때도 자연스럽게 쓰기 위한 내비게이션입니다. |
| `src/components/DesktopNav.tsx` | 웹 화면에서 보이는 사이드 내비게이션입니다. 모바일 하단 탭과 역할을 나눕니다. |
| `src/components/CardNewsRail.tsx` | 카드뉴스 느낌의 소개 블록입니다. 발표용 화면에서 서비스 흐름을 짧게 보여줄 때 씁니다. |
| `src/components/MapPlaceholder.tsx` | 실제 지도 API를 붙이기 전까지 사용하는 지도 영역 대체 컴포넌트입니다. |
| `src/components/GoogleMap.tsx` | Google Maps 브라우저 키가 있으면 실제 지도를 띄우고, 없으면 placeholder로 내려가는 지도 컴포넌트입니다. |
| `src/shared/ui/Button.tsx` | 공통 버튼입니다. primary, secondary, ghost, danger 스타일을 가지고 있습니다. |
| `src/shared/ui/Card.tsx` | 공통 카드입니다. 현재 디자인 톤에 맞춰 반투명 웜 톤과 hover 효과를 기본으로 둡니다. |
| `src/shared/ui/Badge.tsx` | 추천도, 유형, 태그 같은 작은 정보를 보여주는 뱃지입니다. |
| `src/shared/ui/SectionTitle.tsx` | 페이지나 섹션 제목을 통일해서 보여주는 컴포넌트입니다. |
| `src/shared/ui/AxisBar.tsx` | TTI 축별 점수를 시각화하는 바입니다. |
| `src/shared/ui/StateView.tsx` | loading, empty, error 상태를 화면마다 일관되게 보여주는 컴포넌트입니다. |
| `src/shared/lib/classNames.ts` | 조건부 className을 합치는 작은 유틸입니다. |
| `src/entities/tripStore.ts` | Zustand 전역 상태입니다. 사용자, TTI 답변/결과, 매칭, 선호값, 관광지, 일정, 안전 알림을 관리합니다. |
| `src/services/oddtripService.ts` | 프론트와 FastAPI 백엔드 사이의 API 호출 계층입니다. 사용자 생성, TTI, 매칭, 관광지, 일정, 안전 알림을 호출합니다. |
| `src/types/index.ts` | TTI 코드, 매칭 후보, 관광지, 일정, 알림 등 서비스에서 쓰는 타입을 모아둔 곳입니다. |
| `src/styles/globals.css` | Tailwind 기본 설정 위에 전역 배경, safe-area, 카드 애니메이션, 티커 애니메이션을 정의합니다. |
| `capacitor.config.ts` | 나중에 iOS/Android 앱으로 감쌀 때 쓰는 Capacitor 설정입니다. |

## 상태 흐름

상태는 `src/entities/tripStore.ts` 하나에 모아두었습니다. 화면은 store를 호출하고, store는 `src/services/oddtripService.ts`를 통해 백엔드 API를 호출합니다.

대략 이런 흐름입니다.

```txt
Page -> Zustand store -> oddtripService -> FastAPI backend -> MySQL / TourAPI / OpenAI
```

이렇게 해둔 이유는 페이지 컴포넌트 안에 fetch 로직이 흩어지는 걸 막기 위해서입니다.

## 백엔드 연결

프론트는 처음 실행될 때 `/api/users`로 임시 사용자를 만들고, 받은 `id`를 localStorage에 저장합니다. 이후 인증이 필요한 요청에는 `X-User-Id` 헤더를 붙입니다.

연결된 API 흐름:

- `/api/users`
- `/api/tti/questions`
- `/api/tti/calculate`
- `/api/matches`
- `/api/matches/{matchedUserId}/accept`
- `/api/trips/{tripId}/preferences`
- `/api/trips/{tripId}/attractions/generate-public`
- `/api/trips/{tripId}/itinerary/generate`
- `/api/trips/{tripId}/safety`

## 디자인 메모

초기 버전은 흰 카드가 많아서 데모 화면이 다소 평평해 보일 수 있었습니다. 그래서 현재 버전은 웜 베이지 배경, 틸/코랄 포인트, 카드뉴스형 블록, float/reveal/ticker 애니메이션을 넣어 발표 화면에서 서비스 성격이 더 빨리 보이도록 조정했습니다.

너무 장식적인 랜딩페이지가 아니라, 실제 앱 첫 화면처럼 동작하는 흐름을 유지하는 쪽으로 맞췄습니다.

## Capacitor 연동

웹에서 먼저 동작하고, 나중에 앱으로 감싸는 구조입니다. 기본 설정은 `capacitor.config.ts`에 있습니다.

앱 프로젝트를 추가할 때는 보통 아래 순서로 진행합니다.

```bash
npm run build
npx cap add ios
npx cap add android
npx cap sync
```

safe-area는 `src/styles/globals.css`에 `safe-top`, `safe-bottom` 클래스로 처리해두었습니다. 상단 헤더와 하단 탭이 이 값을 사용하기 때문에 iPhone 노치나 홈 인디케이터 영역에서도 레이아웃이 무너지지 않게 의도했습니다.

## 앞으로 정리하면 좋은 것

지금은 실제 API 호출 기반 MVP입니다. 다음 단계에서는 아래 순서로 정리하는 게 좋습니다.

1. 실제 로그인/인증 추가
2. 일정 재조정 요청 API 추가
3. 모바일 빌드 후 safe-area와 뒤로가기 동작 실기기 확인
