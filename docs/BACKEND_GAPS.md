# OddTrip 백엔드 미지원 기능 목록

- 확인 기준: 현재 작업 트리
- 확인일: 2026-09-19
- 판정 범위: FastAPI 라우터, Pydantic 스키마, SQLAlchemy 모델, Alembic migration, 서비스와 테스트

## 기존 계약으로 프론트 연결이 가능한 기능

다음 기능은 백엔드가 이미 구현되어 있으므로 프론트에서 `준비 중`으로 막지 않는다.

| 기능 | 기존 계약 | 검증 기준 |
| --- | --- | --- |
| 개인별 독립 선호 | `PUT /api/trips/{tripId}/preferences/me` | 사용자별 응답이 분리되고 상대 제출 전 원문이 노출되지 않는다. |
| 양쪽 제출 상태·차이 비교 | `GET /api/trips/{tripId}/preferences/pair` | `mine`, `counterpart`, `bothSubmitted`, `comparison`을 서버 응답으로 표시한다. |
| 공동 선호 합의안 | `GET/POST /preferences/proposals`, `POST /{proposalId}/accept|reject` | 제안자 본인은 응답할 수 없고 수락 시 공동 선호가 갱신된다. |
| AI 조정 문구 생성 | `POST /api/trips/{tripId}/resolve-conflict` | LLM 실패 응답과 정상 제안을 구분하며 자동 확정하지 않는다. |
| Trip 생성·수정·취소 | `POST/PATCH/DELETE /api/trips*` | 지역·기간 변경 시 일정과 현재 승인 상태가 무효화된다. |
| 일정 승인·수정 요청 | `GET /approval`, `PUT /approval/me` | 현재 `itineraryRevision`에만 응답하고 두 사람 모두 승인해야 확정된다. |
| 인앱 알림 | `/api/notifications`, WebSocket `notification.created` | 서버 ID로 중복을 제거하고 읽음 상태를 서버 기준으로 유지한다. |
| 양보 범위 | `GET /concessions`, `PUT /concessions/me` | 사용자별 초안·제출을 분리하고 두 사람 모두 제출하기 전 상대 답안과 메모를 반환하지 않는다. |
| Odd Rule | `GET /odd-rules`, `POST /odd-rules/proposals*` | 상대만 수락·거절할 수 있고 수락된 규칙은 증가하는 버전과 이력으로 보존된다. |
| 비밀번호 변경 | `POST /api/auth/change-password` | 현재 비밀번호를 확인하고 성공 시 모든 refresh token을 폐기한다. |
| 비밀번호 재설정 | `POST /api/auth/password-reset/request|confirm` | 해시로만 저장한 일회용 만료 토큰을 SMTP로 전달하며 계정 존재 여부를 같은 응답으로 감춘다. |

## 백엔드 계약 추가가 필요한 기능

### P0 · AI 조정안 확정

- 영향 화면: `/trip/coordination`
- 현재 제한: `/resolve-conflict`는 자유 형식 문자열만 반환한다. 이를 공동 선호로 변환하거나 확정하는 계약이 없다.
- 최소 계약: AI 결과를 `JointPreference` 구조로 반환하거나, 결과를 기존 preference proposal로 생성하는 endpoint를 제공한다.
- 검증 조건: AI 응답만으로 합의 상태가 변경되지 않고 상대 수락 이후에만 공동 선호가 갱신된다.

### P1 · 장소 개인 투표와 개인 북마크

- 영향 화면: `/trip/places`, 장소 상세, 내 여행
- 현재 제한: `trip_attractions.saved/excluded`는 여행 공동 상태다. 사용자별 의견과 여행 밖 개인 북마크는 구분되지 않는다.
- 필요한 계약: 사용자별 장소 투표 모델과 `/votes/me`, `/votes/summary`; 별도 개인 bookmark endpoint.
- DB 변경: 사용자·여행·장소 조합을 보존하는 새 테이블과 migration이 필요하다.
- 검증 조건: 개인 표가 상대의 표를 덮어쓰지 않고 일정 생성에 사용한 집계 snapshot을 확인할 수 있다.

### P1 · 일정 항목 개별 수정

- 영향 화면: 일정 항목 검토 드로어
- 현재 제한: 일정 전체 재생성만 가능하고 개별 슬롯 수정·대체 후보 API는 없다.
- 필요한 계약: 항목 PATCH, 대체 후보 조회·적용, 수정 시 revision 증가와 기존 승인 무효화 규칙.
- 검증 조건: 수정된 최신 revision만 승인 대상으로 계산되고 동시 수정 충돌은 409로 처리한다.

### P1 · 알림 채널 확장

- 영향 화면: `/settings/notifications`, 모바일 앱
- 현재 제한: 인앱 알림과 여행 리마인더(출발 D-1, 종료 다음 날 후기 권유) 예약 발송이 구현되어 있다. 유형별 수신 설정과 모바일 Push는 없다.
- 필요한 계약: 사용자별 알림 설정, 기기 토큰 등록·철회, APNs/FCM 결과, 예약 작업과 idempotency key.
- 검증 조건: 로그아웃·철회 기기로 전송하지 않고 여행 변경·취소 시 잘못된 예약 알림을 제거한다.

### P1 · 휴대전화 본인확인

- 영향 화면: `/verification`, 매칭 자격과 프로필 공개 상태
- 현재 제한: SMS 요청·검증·만료·재시도 API와 본인확인기관 연동이 없다.
- 필요한 계약: provider reference, 인증 세션, 만료·횟수 제한, 최소 공개 상태, 감사·파기 정책.
- 검증 조건: 테스트 코드는 운영에서 거절되고 원문 식별정보가 다른 사용자에게 노출되지 않는다.

### P2 · 일정 공유 링크

- 영향 화면: 일정 공유, 공개 링크
- 현재 제한: 위치 공유 링크는 구현했다(`/api/me/location-share`, `/api/share/{token}`). 여행 일정 자체를 공개 링크로 공유하는 계약은 아직 없다.
- 필요한 계약: 공개 링크 수명과 권한, 조회 화면, 철회와 감사 기록.
- 검증 조건: 만료·철회 후 접근할 수 없다.

### P2 · 관리자 편집·운영 상태

- 영향 화면: `/admin/attractions`, `/admin/tti`, `/admin/operations`
- 현재 제한: 회원·여행·신고·제재 API는 실제 구현되어 있지만 관광지·TTI 편집과 외부 연동 health API는 없다.
- 필요한 계약: 관광지/TTI CRUD와 배포 버전, 외부 연동 상태·latency·checkedAt, 감사 로그.
- 검증 조건: 일반 사용자는 403을 받고 모든 변경과 운영 수치에 실제 조회 시각이 남는다.

## 환경설정만으로 해결되지 않는 항목

`GEMINI_API_KEY`, Google Maps, TourAPI, KMA, MOIS 키는 이미 존재하는 외부 연동의 데이터 품질을 바꾼다. 위의 미지원 기능은 라우터·스키마·모델이 없으므로 키를 추가해도 활성화되지 않는다.
