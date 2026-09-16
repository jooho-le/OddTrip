# OddTrip 백엔드 미지원 기능 목록

- 확인 기준: `origin/dev@2f98373`
- 확인일: 2026-09-16
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

## 백엔드 계약 추가가 필요한 기능

### P0 · 양보 범위

- 영향 화면: `/survey/concession`, `/trip/coordination`
- 현재 제한: 개인 선호는 장소·활동·음식·속도·예산·실내·숨은 명소만 저장한다. 양보 가능 정도와 비공개 메모 필드는 스키마 정규화 과정에서 보존되지 않는다.
- 최소 계약: 기존 개인 선호 payload에 항목별 `concessions`와 제출 상태를 추가하거나 별도 endpoint를 제공한다.
- DB 선택: 단순 구조라면 `trip_user_preferences.preferences_json` 확장으로 migration 없이 가능하지만 요청·응답 명세와 테스트는 변경해야 한다.
- 검증 조건: 두 사용자의 원문 답안은 합의 규칙이 정한 시점 전까지 서로에게 노출되지 않는다.

### P0 · Odd Rule 합의

- 영향 화면: `/survey/rule`, `/trip/coordination`
- 현재 제한: 규칙 선택, 상대 응답, 최종 합의 규칙을 저장하는 필드와 API가 없다.
- 최소 계약: 규칙 후보 ID, 사용자별 선택, 합의 상태, 변경 이력을 제공한다. 기존 합의안 lifecycle을 재사용할 수 있다.
- DB 선택: 공동 선호 JSON 확장 또는 별도 rule proposal 모델. 감사 이력이 필요하면 별도 모델을 권장한다.
- 검증 조건: 한 사용자의 선택만으로 규칙을 확정하지 않으며 재선택 시 양쪽 화면이 같은 상태로 갱신된다.

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
- 현재 제한: 인앱 알림만 구현되어 있다. 유형별 설정, 모바일 Push, D-1 예약 발송은 없다.
- 필요한 계약: 사용자별 알림 설정, 기기 토큰 등록·철회, APNs/FCM 결과, 예약 작업과 idempotency key.
- 검증 조건: 로그아웃·철회 기기로 전송하지 않고 여행 변경·취소 시 잘못된 예약 알림을 제거한다.

### P1 · 휴대전화 본인확인

- 영향 화면: `/verification`, 매칭 자격과 프로필 공개 상태
- 현재 제한: SMS 요청·검증·만료·재시도 API와 본인확인기관 연동이 없다.
- 필요한 계약: provider reference, 인증 세션, 만료·횟수 제한, 최소 공개 상태, 감사·파기 정책.
- 검증 조건: 테스트 코드는 운영에서 거절되고 원문 식별정보가 다른 사용자에게 노출되지 않는다.

### P2 · 공유·실시간 위치

- 영향 화면: 일정 공유, 공개 링크, 여행 중 위치 공유
- 현재 제한: 공유 토큰, 접근 만료, 위치 동의·전송·철회 계약이 없다.
- 필요한 계약: 공개 링크 수명과 권한, 위치 세션과 참여자 동의, 보관·삭제 정책.
- 검증 조건: 만료·철회 후 접근할 수 없고 위치정보 동의가 없는 사용자의 위치를 수집하지 않는다.

### P2 · 관리자 편집·운영 상태

- 영향 화면: `/admin/attractions`, `/admin/tti`, `/admin/operations`
- 현재 제한: 회원·여행·신고·제재 API는 실제 구현되어 있지만 관광지·TTI 편집과 외부 연동 health API는 없다.
- 필요한 계약: 관광지/TTI CRUD와 배포 버전, 외부 연동 상태·latency·checkedAt, 감사 로그.
- 검증 조건: 일반 사용자는 403을 받고 모든 변경과 운영 수치에 실제 조회 시각이 남는다.

## 환경설정만으로 해결되지 않는 항목

`GEMINI_API_KEY`, Google Maps, TourAPI, KMA, MOIS 키는 이미 존재하는 외부 연동의 데이터 품질을 바꾼다. 위의 미지원 기능은 라우터·스키마·모델이 없으므로 키를 추가해도 활성화되지 않는다.
