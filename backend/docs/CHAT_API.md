# OddTrip 매칭·채팅 API

이 문서는 현재 구현된 매칭 커뮤니케이션 API를 설명한다. 알림 테이블과 여행 D-1 스케줄러는 알림 담당 범위라 포함하지 않는다.

## 사용자 흐름

```text
TTI 완료
→ 매칭 요청과 인사 메시지
→ 상대 수락
→ Match + ChatRoom + Trip 생성
→ 인사 메시지를 채팅방 첫 메시지로 저장
→ 일반 채팅
→ 종료·숨김·차단·신고
```

일반 채팅은 요청 수락 후 시작한다. 양쪽 모두 `tti_code`와 `tti_scores_json`이 있어야 요청과 수락이 가능하다.

## 데이터 모델

### 매칭 관계

- `match_requests`: 요청자, 수신자, 여행 조건, 인사 메시지, 요청 상태
- `matches`: 활성·종료 상태와 매칭 당시 양쪽 TTI 스냅샷
- `match_user_states`: 사용자별 매칭 이력 숨김·나가기
- `blocks`: 방향성 차단과 해제 시각
- `reports`: 메시지·사용자 신고와 검토 상태

### 채팅

- `chat_rooms`: Match당 하나의 방, 상태와 다음 sequence
- `chat_room_members`: 양쪽 멤버의 읽음 위치·숨김·나가기
- `chat_messages`: 텍스트·시스템 메시지와 소프트 삭제

모델 위치:

```text
app/models/chat.py
app/models/communication.py
app/models/match.py
```

## 매칭 요청 API

### 요청 생성

```http
POST /api/match-requests
```

```json
{
  "receiverId": "user-uuid",
  "region": "부산",
  "startDate": "2026-09-01",
  "endDate": "2026-09-03",
  "greetingMessage": "같이 여행해요!"
}
```

검사:

- 자기 자신 요청 금지
- 양쪽 TTI 완료
- 차단 관계 금지
- 기존 Match 또는 양방향 pending 요청 금지
- 인사 메시지 최대 300자
- 요청은 7일 후 만료

### 요청 목록·상세

```http
GET /api/match-requests/received?status=pending&limit=20
GET /api/match-requests/sent?status=pending&limit=20
GET /api/match-requests/{requestId}
```

목록·상세 조회 시 만료 시각이 지난 pending 요청은 `expired`로 갱신한다.

### 수락·거절·취소

```http
POST /api/match-requests/{requestId}/accept
POST /api/match-requests/{requestId}/reject
POST /api/match-requests/{requestId}/cancel
```

수락은 하나의 트랜잭션에서 다음을 저장한다.

```text
MatchRequest accepted
Match 및 TTI 스냅샷
ChatRoom
ChatRoomMember 2건
Trip
인사 메시지 sequence 1
MatchUserState 2건
```

commit 후 양쪽 WebSocket에 `chat.room_created`를 전송한다. 응답과 이벤트에는 `roomId`, `matchId`, `tripId`, `userIds`가 포함된다. 알림 담당은 이 데이터를 사용해 새 채팅방 알림을 생성할 수 있다.

요청 생성 시 `match_request.created`, 거절·취소 시 `match_request.updated` 이벤트를 양쪽에 전송한다. 기존 즉시 매칭 API `POST /api/matches/{userId}/accept`는 `410 Gone`을 반환한다.

요청 목록·상세 응답은 요청자와 수신자 프로필, 상대 프로필, 현재 TTI 기준 반대도·점수·차이·보완점을 포함한다.

## 채팅 API

```http
POST   /api/matches/{matchId}/chat-room
GET    /api/chat/rooms
GET    /api/chat/rooms/{roomId}
DELETE /api/chat/rooms/{roomId}
GET    /api/chat/rooms/{roomId}/messages
POST   /api/chat/rooms/{roomId}/messages
DELETE /api/chat/rooms/{roomId}/messages/{messageId}
PUT    /api/chat/rooms/{roomId}/read
GET    /api/chat/unread-count
```

`DELETE /api/chat/rooms/{roomId}`는 방을 삭제하지 않는다. 현재 사용자의 `chat_room_members.hidden_at`만 기록한다. 숨긴 뒤에는 목록뿐 아니라 상세·메시지 직접 접근도 `404`를 반환한다.

### 메시지 전송

```json
{
  "clientMessageId": "b58b7f08-d494-4f90-97a9-77bb8c681f9d",
  "type": "text",
  "content": "부산역에서 만날까요?"
}
```

정책:

- 최대 1,000자
- 앞뒤 공백 제거
- 수정 미지원
- `(sender_id, client_message_id)`로 재전송 중복 방지
- 방 행을 잠그고 `next_sequence`를 증가시켜 동시 순서 보장
- 종료·차단 관계에서는 전송 금지
- 사용자 ID 기준 초당 5건·분당 60건 token bucket
- 제한 초과 시 `429`와 `Retry-After: 1`

현재 rate limiter는 한 프로세스 메모리 방식이다. 다중 worker부터 Redis 구현으로 교체해야 한다.

### 메시지 삭제

발신자만 삭제할 수 있다. `deleted_at`, `deleted_by`를 기록하고 원문은 DB에 유지한다.

```json
{
  "deleted": true,
  "content": null,
  "displayText": "삭제된 메시지입니다"
}
```

삭제 후 `message.deleted` WebSocket 이벤트를 양쪽에 전달한다. 삭제 메시지는 미읽음 수에서 제외한다.

### 읽음과 숨김

`chat_room_members.last_read_sequence`보다 큰 상대 메시지만 미읽음으로 계산한다. 읽음 위치는 뒤로 이동하지 않는다. 사용자 한 명이 방을 숨겨도 상대 목록과 DB 원본에는 영향을 주지 않는다.

## 시스템 메시지

일반 REST 사용자는 `system` 타입을 전송할 수 없다. 다른 백엔드 도메인은 내부 함수를 호출한다.

```python
await chat_service.create_system_message(
    db=db,
    match_id=match_id,
    event="itinerary.shared",
    content="새 일정을 공유했습니다.",
    payload={"tripId": trip_id, "version": 2},
)
```

기본값은 `flush`만 수행한다. 호출한 도메인 서비스가 상태 변경과 시스템 메시지를 함께 commit한다.

## 매칭 종료·이력 숨김

```http
POST   /api/matches/{matchId}/end
DELETE /api/me/matches/{matchId}
```

종료:

```text
Match.status = ended
ChatRoom.status = closed
match.ended 시스템 메시지
새 메시지 전송 금지
과거 메시지 조회 유지
```

삭제 요청은 `match_user_states.hidden_at`과 해당 사용자의 방 `hidden_at`만 기록한다. 상대 사용자와 DB 원본은 유지한다.

## 차단

```http
POST   /api/users/{userId}/block
DELETE /api/users/{userId}/block
GET    /api/me/blocks
```

어느 한쪽이 차단하면:

- 매칭 후보에서 서로 제외
- 매칭 요청·수락 금지
- 활성 Match와 ChatRoom 종료
- 메시지 전송 금지

차단 해제는 기존 Match와 ChatRoom을 자동 복구하지 않는다.

## 신고

```http
POST /api/chat/rooms/{roomId}/messages/{messageId}/reports
POST /api/users/{userId}/reports
```

사유:

```text
spam
harassment
sexual_content
hate
fraud
personal_information
other
```

자신의 메시지 신고와 동일 메시지 중복 신고는 금지한다. 신고된 메시지가 삭제돼도 DB 원문은 유지한다.

## WebSocket

```text
WS /api/chat/ws?token={accessToken}
```

이벤트:

```text
chat.room_created
message.created
message.deleted
room.read
match.ended
user.blocked
match_request.created
match_request.updated
preference.updated
preference.proposal_created
preference.proposal_responded
```

메시지는 REST에서 commit한 후 WebSocket으로 전달한다. 단일 프로세스는 메모리 연결 관리자를 사용하며 다중 worker는 Redis Pub/Sub이 필요하다.

## 알림 모듈 연동 경계

채팅 모듈은 알림 행을 저장하지 않는다.

```text
매칭 수락 commit
→ chat.room_created 데이터 제공
→ 알림 모듈이 양쪽 chat.room_created 알림 생성
```

## 사용자 간 여행 선호 조율

개인 입력과 최종 공동 선호를 분리한다. 개인 입력은 일정 생성에 바로 반영되지 않으며 상대방이 합의안을 수락했을 때만 `trips.preferences_json`이 변경된다.

```http
PUT  /api/trips/{tripId}/preferences/me
GET  /api/trips/{tripId}/preferences/pair
GET  /api/trips/{tripId}/preferences/proposals
POST /api/trips/{tripId}/preferences/proposals
POST /api/trips/{tripId}/preferences/proposals/{proposalId}/accept
POST /api/trips/{tripId}/preferences/proposals/{proposalId}/reject
```

`preferences/pair`은 양쪽 제출 여부, 공통·개별 장소/활동/음식, 속도·예산 차이, boolean 선호 충돌과 최종 합의 결과를 반환한다. 제안자는 자신의 합의안을 수락할 수 없고 처리된 합의안에 중복 응답할 수 없다.

여행 D-1 알림은 Trip과 Match를 조회하는 알림 스케줄러가 담당한다.

## DB 적용

새 모델은 SQLAlchemy metadata에 등록되어 있다. 기존 PostgreSQL DB에 적용할 Alembic migration은 아직 없다. DB 담당자의 최신 revision 위에 다음 변경을 migration으로 작성해야 한다.

```text
users soft-delete 컬럼
matches 상태·TTI 스냅샷·soft-delete 컬럼
match_requests
match_user_states
chat_rooms
chat_messages
chat_room_members
blocks
reports
```

## 주요 수정 위치

| 파일 | 역할 |
| --- | --- |
| `app/models/chat.py` | 채팅 DB 구조 |
| `app/models/communication.py` | 요청·이력·차단·신고 DB 구조 |
| `app/schemas/chat.py` | 채팅·신고 요청 응답 |
| `app/schemas/communication.py` | 매칭 요청·차단 요청 응답 |
| `app/services/chat_service.py` | 메시지·읽음·삭제·신고·시스템 메시지 |
| `app/services/communication_service.py` | 매칭 요청·수락·종료·차단 |
| `app/services/chat_rate_limiter.py` | 사용자별 token bucket |
| `app/routers/chat.py` | 채팅 REST·WebSocket |
| `app/routers/communication.py` | 매칭 요청·종료·차단 API |
