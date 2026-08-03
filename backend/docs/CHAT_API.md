# OddTrip Chat API

## 구현 범위

현재 구현은 매칭된 두 사용자를 위한 텍스트 채팅 MVP다.

- 매칭당 채팅방 하나 생성 또는 조회
- 참여 중인 채팅방 목록과 상세 조회
- cursor 방식의 메시지 조회
- 텍스트 메시지 전송과 중복 요청 방지
- 사용자별 읽음 위치 및 미읽음 수 계산
- WebSocket 새 메시지·읽음 이벤트

이미지, 장소·일정 공유, 투표, 신고·차단, 푸시 알림은 아직 구현하지 않았다. 메시지 모델의 `type`과 `payload_json`은 이 기능들을 확장할 자리다.

## 현재 전제

현재 `matches` 테이블에는 요청·수락 상태가 없다. 따라서 Match 행이 존재하고 로그인 사용자가 `user_id` 또는 `matched_user_id`라면 성사된 매칭으로 간주한다.

채팅방은 매칭 수락 API에서 자동 생성하지 않는다. 매칭 완료 화면 또는 채팅 진입 시 아래 API를 호출한다. 여러 번 호출해도 `chat_rooms.match_id` UNIQUE 제약으로 같은 방을 반환한다.

```http
POST /api/matches/{matchId}/chat-room
Authorization: Bearer {accessToken}
```

## 데이터 구조

### chat_rooms

| 컬럼 | 역할 |
| --- | --- |
| `id` | 채팅방 UUID |
| `match_id` | 매칭 FK, UNIQUE |
| `status` | `active` 또는 `closed` |
| `next_sequence` | 다음 메시지 순서 번호 |
| `last_message_id` | 목록 조회용 마지막 메시지 ID |
| `last_message_at` | 채팅방 정렬 기준 |

메시지를 저장할 때 방 행을 잠그고 `next_sequence`를 하나 올린다. `MAX(sequence) + 1`을 사용하지 않으므로 PostgreSQL에서 두 사용자가 동시에 보내도 같은 순서를 배정하지 않는다.

### chat_messages

| 컬럼 | 역할 |
| --- | --- |
| `room_id` | 채팅방 FK |
| `sender_id` | 발신 사용자 FK |
| `sequence` | 방 안에서 증가하는 순서 |
| `client_message_id` | 클라이언트가 요청마다 생성하는 UUID |
| `type` | 현재 `text`, 향후 메시지 타입 확장 |
| `content` | 텍스트 본문 |
| `payload_json` | 장소·일정·투표 등 확장 데이터 |

`(sender_id, client_message_id)`가 UNIQUE다. 네트워크 오류로 같은 요청을 다시 보내면 새 메시지를 만들지 않고 먼저 저장된 메시지를 반환한다.

### chat_read_states

사용자마다 방별 `last_read_sequence` 하나를 저장한다. 메시지마다 읽음 boolean을 업데이트하지 않는다.

```text
미읽음 = 상대가 보낸 메시지
       AND message.sequence > my.last_read_sequence
```

## REST API

모든 REST 응답은 기존 프로젝트 규칙인 아래 구조를 따른다.

```json
{
  "data": {},
  "error": null
}
```

### 채팅방 생성 또는 조회

```http
POST /api/matches/{matchId}/chat-room
```

로그인 사용자가 해당 Match 참여자가 아니면 존재 여부를 숨기기 위해 `404`를 반환한다.

### 채팅방 목록

```http
GET /api/chat/rooms?status=active&before=2026-08-03T12:00:00&limit=20
```

- `status`: `active`, `closed`, 또는 생략
- `before`: 이전 페이지의 `nextBefore`
- `limit`: 기본 20, 최대 100

각 방에는 상대 프로필, Match 점수, 연결된 Trip, 마지막 메시지, 내 미읽음 수가 포함된다. `currentStep`은 별도 조율 상태가 아직 없으므로 현재 `trip.status`를 그대로 반환한다.

### 채팅방 상세

```http
GET /api/chat/rooms/{roomId}
```

### 메시지 조회

```http
GET /api/chat/rooms/{roomId}/messages?beforeSequence=120&limit=30
```

최신 메시지를 기준으로 조회하며 응답의 `items`는 화면에서 사용하기 편하게 오래된 순서부터 반환한다. 다음 페이지가 있으면 `nextBeforeSequence`를 반환한다.

### 텍스트 메시지 전송

```http
POST /api/chat/rooms/{roomId}/messages
Content-Type: application/json
```

```json
{
  "clientMessageId": "b58b7f08-d494-4f90-97a9-77bb8c681f9d",
  "type": "text",
  "content": "부산역에서 만날까요?"
}
```

- 본문 앞뒤 공백은 제거한다.
- 공백만 있는 메시지는 거절한다.
- 최대 2,000자다.
- `clientMessageId`는 UUID여야 한다.
- 요청의 sender ID는 받지 않고 access token의 사용자 ID를 사용한다.
- `closed` 방은 `409`를 반환한다.

### 읽음 처리

```http
PUT /api/chat/rooms/{roomId}/read
Content-Type: application/json
```

```json
{
  "lastReadSequence": 120
}
```

읽음 위치는 뒤로 이동하지 않는다. 아직 존재하지 않는 큰 sequence를 보내면 현재 방의 마지막 sequence까지만 적용한다.

### 전체 미읽음 수

```http
GET /api/chat/unread-count
```

Global Navigation의 채팅 배지에 사용할 수 있다.

## WebSocket

```text
ws://localhost:8000/api/chat/ws?token={accessToken}
```

브라우저 WebSocket API가 임의의 `Authorization` 헤더를 설정할 수 없어 현재는 query token을 사용한다. 운영 환경에서는 URL 로그 노출 가능성을 줄이기 위해 짧은 수명의 WebSocket ticket API 또는 HttpOnly 쿠키 인증으로 교체하는 것이 좋다.

메시지 저장은 WebSocket이 아니라 REST API에서 수행한다. DB commit 성공 후 연결된 양쪽 사용자에게 이벤트를 보낸다.

### 새 메시지

```json
{
  "event": "message.created",
  "data": {
    "id": "message-uuid",
    "roomId": "room-uuid",
    "senderId": "user-uuid",
    "sequence": 1,
    "type": "text",
    "content": "부산역에서 만날까요?",
    "createdAt": "2026-08-03T12:00:00"
  }
}
```

### 읽음 변경

```json
{
  "event": "room.read",
  "data": {
    "roomId": "room-uuid",
    "userId": "user-uuid",
    "lastReadSequence": 1,
    "updatedAt": "2026-08-03T12:00:10"
  }
}
```

연결 확인이 필요하면 다음 이벤트를 보낼 수 있다.

```json
{ "event": "ping" }
```

서버는 `{ "event": "pong" }`을 반환한다.

현재 연결 관리자는 한 API 프로세스의 메모리에 저장된다. Uvicorn worker나 서버 인스턴스를 여러 개 사용하면 Redis Pub/Sub을 `ChatConnectionManager` 뒤에 연결해야 한다.

## 파일별 수정 위치

| 파일 | 수정할 때 |
| --- | --- |
| `app/models/chat.py` | 컬럼, FK, 인덱스, 메시지 저장 구조 변경 |
| `app/schemas/chat.py` | 프론트 요청·응답 JSON 변경 |
| `app/services/chat_service.py` | 권한, 읽음, 메시지 순서, 목록 계산 규칙 변경 |
| `app/routers/chat.py` | URL, HTTP 상태, WebSocket 이벤트 변경 |
| `app/realtime/chat_manager.py` | Redis 또는 다중 서버 실시간 전송으로 변경 |
| `tests/test_chat_service.py` | 정책 변경에 맞춘 회귀 테스트 |

### 매칭 상태가 추가되는 경우

`chat_service.get_match_for_user()`에 다음 조건을 추가하면 된다.

```python
Match.status == "accepted"
```

다른 채팅 로직을 바꿀 필요는 없다.

### 장소 공유를 추가하는 경우

1. `ChatMessageCreate.type`에 `place` 추가
2. `payload` 입력 스키마 추가
3. 서비스에서 `placeId` 또는 `tripAttractionId` 접근 권한 검증
4. 검증한 payload를 `payload_json`에 저장

클라이언트가 보낸 장소 이름이나 이미지 전체를 신뢰하지 말고 서버가 ID를 통해 조회해야 한다.

### 시스템 메시지를 추가하는 경우

일반 사용자가 `system` 타입을 보낼 수 있게 하지 않는다. 서비스 내부 함수가 조율·승인 상태 변경 트랜잭션 이후 시스템 메시지를 생성하도록 추가한다.

## DB 적용 주의사항

채팅 모델은 `app/models/__init__.py`에 등록되어 있어 새 빈 DB에서는 기존 `create_all()`로 테이블이 만들어진다. 이미 존재하는 PostgreSQL DB에는 `create_all()`이 새 테이블은 추가할 수 있지만 변경 이력을 남기지 않는다.

DB 담당자의 추가 스키마 수정이 끝나면 최신 Alembic revision을 기준으로 아래 테이블 migration을 작성해야 한다.

- `chat_rooms`
- `chat_messages`
- `chat_read_states`

현재 로컬 SQLite는 기존 `matches`의 PostgreSQL 전용 `least/greatest` 인덱스 때문에 빈 DB 전체 생성이 실패한다. 채팅 테스트에서는 해당 함수를 테스트 DB에만 등록해 우회한다. 실제 운영 기준은 PostgreSQL이다.
