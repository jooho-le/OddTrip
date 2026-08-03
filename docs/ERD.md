# OddTrip ERD

이 문서는 현재 백엔드의 SQLAlchemy 모델을 기준으로 작성한 ERD다. 실제 PostgreSQL 데이터베이스를 역분석한 결과가 아니므로, DB에 반영된 스키마와 차이가 있을 수 있다. 현재 저장소에는 Alembic revision 파일이 없으며 애플리케이션 시작 시 `Base.metadata.create_all()`로 신규 테이블을 생성한다.

## 현재 구현된 스키마

mermaid
erDiagram
    USERS {
        string id PK
        string email UK
        string password_hash
        string nickname
        string avatar_url
        string home_region
        string role
        string tti_code
        json tti_scores_json
        datetime created_at
        datetime updated_at
    }

    REFRESH_TOKENS {
        string id PK
        string user_id FK
        string token_hash UK
        datetime expires_at
        datetime revoked_at
        datetime created_at
    }

    MATCHES {
        string id PK
        string user_id FK
        string matched_user_id FK
        string match_level
        int recommendation_score
        string compatibility
        json differences_json
        json complements_json
        datetime created_at
    }

    TRIPS {
        string id PK
        string match_id FK
        string title
        string region
        date start_date
        date end_date
        json preferences_json
        string status
        datetime created_at
        datetime updated_at
    }

    PLACES {
        string id PK
        string content_id UK
        string content_type_id
        string source
        string name
        string category
        string image_url
        string description
        string addr1
        string addr2
        float latitude
        float longitude
        string area_code
        string sigungu_code
        string tel
        string homepage
        json opening_hours_json
        json closed_days_json
        boolean indoor
        boolean active
        json raw_json
        datetime created_at
        datetime updated_at
    }

    TRIP_ATTRACTIONS {
        string id PK
        string trip_id FK
        string place_id FK
        boolean saved
        boolean excluded
        boolean famous
        string reason
        json tags_json
        int score
        int congestion_score
        int hidden_score
        int related_rank
        datetime created_at
    }

    ITINERARY_DAYS {
        string id PK
        string trip_id FK
        int day_number
        date target_date
        string title
        string weather
        string caution
    }

    ITINERARY_ITEMS {
        string id PK
        string day_id FK
        string place_id FK
        int sort_order
        string time
        string type
        string title
        string location
        string duration
        string move_time
        string description
        string ai_reason
    }

    SAFETY_ALERTS {
        string id PK
        string trip_id FK
        string level
        string title
        string message
        string action
        string time
        datetime created_at
    }

    TTI_QUESTIONS {
        string id PK
        string axis
        string prompt
        string left_label
        string right_label
        string left_letter
        string right_letter
        int sort_order
    }

    TRAVEL_TYPES {
        string code PK
        string title
        string description
        json keywords_json
    }

    USERS ||--o{ REFRESH_TOKENS : owns
    USERS ||--o{ MATCHES : requester
    USERS ||--o{ MATCHES : counterpart
    MATCHES ||--o{ TRIPS : creates
    TRIPS ||--o{ TRIP_ATTRACTIONS : recommends
    PLACES ||--o{ TRIP_ATTRACTIONS : selected_for
    TRIPS ||--o{ ITINERARY_DAYS : contains
    ITINERARY_DAYS ||--o{ ITINERARY_ITEMS : contains
    PLACES o|--o{ ITINERARY_ITEMS : referenced_by
    TRIPS ||--o{ SAFETY_ALERTS : has
```

### 현재 주요 제약

- `matches`: `(least(user_id, matched_user_id), greatest(user_id, matched_user_id))` 고유 인덱스로 A-B와 B-A 중복 매칭을 차단한다.
- `trip_attractions`: `(trip_id, place_id)`가 고유하다.
- `itinerary_days`: `(trip_id, day_number)`가 고유하다.
- `places.content_id`, `users.email`, `refresh_tokens.token_hash`는 고유하다. nullable 컬럼은 여러 개의 `NULL`을 가질 수 있다.
- 사용자, 매칭, 여행, 일정의 주요 FK는 상위 행 삭제 시 `CASCADE`로 삭제된다.
- `itinerary_items.place_id`는 장소 삭제 시 `NULL`로 변경된다.
- `users.tti_code`는 `travel_types.code`를 논리적으로 참조하지만 DB 외래키는 설정되어 있지 않다.
- 현재 `matches`에는 요청·수락·종료 상태 컬럼이 없다. Match 행이 존재하면 성사된 매칭으로 취급하는 구조다.

## 채팅 API 추가 후 예상 스키마

아래는 텍스트 채팅 MVP에서 추가할 테이블과 기존 테이블의 연결이다. 아직 실제 모델이나 DB에는 반영되지 않았다.

```mermaid
erDiagram
    USERS {
        string id PK
        string nickname
    }

    MATCHES {
        string id PK
        string user_id FK
        string matched_user_id FK
    }

    TRIPS {
        string id PK
        string match_id FK
        string status
    }

    CHAT_ROOMS {
        string id PK
        string match_id FK,UK
        string status
        string last_message_id FK
        datetime last_message_at
        datetime created_at
        datetime updated_at
    }

    CHAT_MESSAGES {
        string id PK
        string room_id FK
        string sender_id FK
        bigint sequence
        string client_message_id
        string type
        string content
        json payload_json
        datetime created_at
        datetime deleted_at
    }

    CHAT_READ_STATES {
        string room_id PK,FK
        string user_id PK,FK
        bigint last_read_sequence
        datetime updated_at
    }

    USERS ||--o{ MATCHES : requester
    USERS ||--o{ MATCHES : counterpart
    MATCHES ||--o{ TRIPS : creates
    MATCHES ||--o| CHAT_ROOMS : opens
    CHAT_ROOMS ||--o{ CHAT_MESSAGES : contains
    USERS ||--o{ CHAT_MESSAGES : sends
    CHAT_ROOMS ||--o{ CHAT_READ_STATES : tracks
    USERS ||--o{ CHAT_READ_STATES : reads
    CHAT_MESSAGES o|--o| CHAT_ROOMS : latest_in
```

### 채팅 테이블 제약 계획

- `chat_rooms.match_id`는 고유하며 매칭 하나당 채팅방은 최대 하나다.
- `chat_messages`의 `(room_id, sequence)`는 고유해 방 안의 메시지 순서를 보장한다.
- `chat_messages`의 `(sender_id, client_message_id)`는 고유해 재시도에 따른 중복 저장을 막는다.
- `chat_read_states`의 PK는 `(room_id, user_id)` 복합키다.
- `chat_rooms.match_id`, `chat_messages.room_id`, `chat_read_states.room_id`는 상위 행 삭제 시 `CASCADE`를 사용한다.
- `chat_messages.sender_id`와 `chat_read_states.user_id`의 사용자 삭제 정책은 메시지 보존 정책을 확정한 뒤 결정한다.
- `last_message_id`는 순환 FK가 되므로 방 생성 후 nullable 상태로 두고, 메시지 저장 트랜잭션에서 갱신한다.

## 실제 PostgreSQL과 비교하는 방법

PostgreSQL 연결과 migration이 정리된 뒤에는 DBeaver에서 `Schemas > public > Tables`를 선택하고 **View Diagram**을 실행한다. 그 결과를 이 문서와 비교하면 모델과 실제 DB 사이의 누락된 컬럼, FK, 인덱스를 확인할 수 있다.
