# 양보 범위·Odd Rule·비밀번호 API 확인 가이드

확인일: 2026-09-19

## 구현 범위

| 기능 | 프론트 경로 | API | 영속 데이터 |
| --- | --- | --- | --- |
| 양보 범위 조사서 | `/trips/{tripId}/survey/concession` | `GET /api/trips/{tripId}/concessions`, `PUT /api/trips/{tripId}/concessions/me` | `trip_concession_responses` |
| Odd Rule | `/trips/{tripId}/survey/rule` | `GET /api/trips/{tripId}/odd-rules`, 제안 생성·수락·거절 API | `trip_odd_rule_proposals` |
| 비밀번호 변경 | `/settings/privacy` | `POST /api/auth/change-password` | `users.password_hash`, 토큰 폐기 시각 |
| 비밀번호 재설정 | `/password-reset` | `POST /api/auth/password-reset/request`, `POST /api/auth/password-reset/confirm` | `password_reset_tokens` |

양보 범위의 상대 답안과 메모는 두 사람이 모두 제출하기 전에는 API 응답에 포함되지 않는다. 두 번째 제출 요청이 Trip 행을 잠근 상태에서 두 응답에 같은 `revealedAt`을 기록한다. 공개 뒤에는 답안을 수정할 수 없다.

Odd Rule은 제안자 본인이 수락할 수 없다. 상대가 수락한 제안만 `accepted`가 되고 여행별 증가 버전을 받는다. `current`는 최신 확정 규칙이고 `history`는 최신순 확정 이력이다.

비밀번호 재설정 토큰은 원문 대신 SHA-256 해시만 DB에 저장한다. 토큰은 기본 30분, 1회만 유효하다. 변경·재설정 성공 시 기존 refresh token을 모두 폐기한다. 짧은 수명의 기존 access token은 무상태라 자체 만료까지 최대 `AUTH_TOKEN_EXPIRE_MINUTES` 동안 남을 수 있다.

## 적용

```bash
cd backend
.venv/bin/alembic upgrade head
```

운영 메일 발송에는 다음 값을 설정한다.

```dotenv
FRONTEND_BASE_URL=https://서비스-프론트-주소
PASSWORD_RESET_TOKEN_EXPIRE_MINUTES=30
PASSWORD_RESET_DEBUG=false
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
SMTP_FROM_EMAIL=no-reply@example.com
SMTP_STARTTLS=true
```

로컬에서 SMTP 없이 화면을 확인할 때만 `PASSWORD_RESET_DEBUG=true`로 설정한다. 이 경우 요청 응답의 `data.resetToken`과 서버 로그에 개발용 링크가 제공된다. 운영에서는 반드시 `false`여야 한다.

## 요청 예시

양보 범위 초안은 일부 항목만 저장할 수 있고, `submit: true`일 때는 네 항목이 모두 필요하다.

```json
{
  "answers": {
    "pace": "flexible",
    "budget": "keep",
    "food": "yield",
    "activities": "flexible"
  },
  "note": "숙소 예산은 유지하고 싶어요.",
  "submit": true
}
```

Odd Rule 제안 예시:

```json
{
  "ruleKey": "one-veto-each",
  "title": "각자 거절권 한 번",
  "description": "서로 한 번씩 이유를 설명하지 않고 선택을 제외할 수 있습니다."
}
```

비밀번호 변경·재설정 예시:

```json
{ "currentPassword": "현재 비밀번호", "newPassword": "새 비밀번호" }
```

```json
{ "email": "user@example.com" }
```

```json
{ "token": "메일로 받은 토큰", "newPassword": "새 비밀번호" }
```

## 검증 명령

```bash
npm test
npm run build
cd backend
.venv/bin/python -m pytest -q
```

자동 테스트는 제출 전 상대 답안 비노출, 양쪽 제출 후 동시 공개, 공개 후 수정 차단, 제안자 자기 수락 차단, Odd Rule 버전 증가, 비밀번호 현재값 검증, 재설정 토큰 만료·1회 사용, refresh token 폐기를 확인한다.
