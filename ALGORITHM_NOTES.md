# 📐 알고리즘 상세 설명

이 문서는 일정 생성기에서 사용한 알고리즘들을 이해하기 쉽게 정리합니다.
코드 리뷰 시 참고하거나, 다른 팀원에게 설명하실 때 활용하세요.

---

## 전체 파이프라인 (5단계)

```
[입력] 저장된 관광지 + 여행 기간 + 선호
   │
   ▼
Step 1. enricher.py
        외부 데이터로 장소 보강 (좌표, 운영시간, 실내 여부)
   │
   ▼
Step 2. day_assigner.py
        지역 클러스터링으로 일자별 분배
   │
   ▼
Step 3. route_optimizer.py    ⭐ 핵심
        TSP 동적계획법으로 하루치 순서 최적화
   │
   ▼
Step 4. time_scheduler.py
        영업시간 윈도우 안에서 시간 슬롯 배치
   │
   ▼
Step 5. llm_narrator.py
        GPT가 aiReason 일괄 생성 (1 trip = 1 API call)
   │
   ▼
[출력] PlannedDay 리스트 → ItineraryItem (DB) → 기존 응답 스키마
```

---

## ⭐ Step 3. 동선 최적화 — Held-Karp TSP

### 무슨 문제인가

하루 동안 방문할 N개 장소가 있다. 어떤 순서로 가야 **총 이동 시간이 최소**인가?

이것이 바로 **외판원 문제(Traveling Salesman Problem, TSP)**다.
NP-hard 문제로 N이 커지면 모든 순열을 다 확인하는 건 불가능하다.
- N = 10: 10! = 3,628,800 가지 ← 1초 안에 가능
- N = 15: 15! ≈ 1.3 × 10¹² 가지 ← 며칠 걸림
- N = 20: 너무 많아서 우주 끝날 때까지

### 왜 정확해(exact)가 필요한가

하루 일정의 장소 수는 보통 3~6개. 이 정도면 정확해를 충분히 빠르게 구할 수 있다.
휴리스틱(근사해)을 쓰면 **"이게 진짜 최적인가?"** 라는 의문이 항상 남아서,
나중에 디버깅이 어렵다.

### Held-Karp 동적계획법

1962년 Bellman, Held, Karp가 독립적으로 제안한 알고리즘.
시간 복잡도 **O(N² · 2^N)**. N=8이면 약 16,384 × 8 = 13만 연산. < 200ms.

**핵심 아이디어: 비트마스크로 부분집합 표현**

집합 `{도시0, 도시2, 도시3}`을 이진수 `1101` (= 13)로 표현.
- 비트 0이 1 → 도시 0 포함
- 비트 1이 0 → 도시 1 미포함
- 비트 2가 1 → 도시 2 포함
- 비트 3이 1 → 도시 3 포함

이렇게 하면 부분집합을 정수 하나로 표현할 수 있어, dict의 키로 쓰기 편하다.

**상태 정의**

```
dp[mask][i] = "시작점에서 출발해 mask에 포함된 모든 도시를 거쳐
              마지막에 도시 i에 도착하는 최소 비용"
```

**점화식**

```
dp[mask][i] = min over j in (mask \ {i}):
                  dp[mask \ {i}][j] + dist(j, i)
```

즉, "i에 도착하기 직전에 어디에 있었나?"를 모든 후보 j에 대해 확인하고
그중 최솟값을 채택한다.

**예시 (N=4)**

```
                                   비트마스크
시작점 = 0                          ─────────
초기:    dp[0001][0] = 0           {0}

1단계:   dp[0011][1] = dist(0→1)   {0,1}
        dp[0101][2] = dist(0→2)   {0,2}
        dp[1001][3] = dist(0→3)   {0,3}

2단계:   dp[0111][1] = min(
            dp[0101][2] + dist(2→1),
            dp[0011][1]  # 이건 불가능 - 1이 이미 mask에 있음
        )
        ...

마지막:  dp[1111][i] for i in 1,2,3
        의 최솟값이 정답
```

**경로 복원**

`parent[mask][i]` 테이블에 "어디서 왔는지"를 기록해두고, 마지막에 역추적.

```python
order = []
mask = full_mask
current = best_last
while current != start:
    order.append(current)
    prev = parent[(mask, current)]
    mask &= ~(1 << current)  # mask에서 current 제거
    current = prev
order.append(start)
order.reverse()
```

### 큰 N에 대한 fallback (N > 9)

`_nearest_neighbor_then_2opt()` 함수가 휴리스틱 두 단계를 적용:

1. **Nearest Neighbor**: 시작점에서 가장 가까운 미방문 도시를 그리디하게 선택.
   초기해를 빠르게 만들지만 보통 최적 대비 25% 더 김.

2. **2-opt**: 두 개의 edge를 골라 뒤집어 보고, 더 짧아지면 채택.
   ```
   기존: A → B → C → D → E → F
   뒤집기: A → B → E → D → C → F  (C-D-E 구간 reverse)
   더 짧으면 채택, 더 이상 개선 안 되면 종료
   ```

이 조합은 보통 최적해의 5~10% 이내로 수렴.

---

## Step 2. 일자별 분배 — 그리디 클러스터링

### 문제

장소 10개를 3일에 나누어야 한다. 어떻게 묶을까?

### 단순 접근의 문제

"순서대로 3개씩 끊기"는 안 된다. 1번 장소가 서울, 2번이 부산, 3번이 서울이면
하루에 서울-부산-서울을 왕복하게 됨.

### 우리 알고리즘

**K-means++의 시드 선택 아이디어**를 빌렸다.

1. **시드 선택**
   - 첫 번째 시드: famous=True인 장소 우선
   - 다음 시드: 기존 시드들로부터 **최소 거리가 최대**인 장소
     (즉, 기존 시드와 가장 먼 곳)

   이렇게 하면 시드들이 공간적으로 잘 분산된다.

2. **할당**
   - 각 장소를 가장 가까운 시드의 클러스터에 추가
   - 단, 클러스터가 너무 커지지 않도록 **size_penalty** 부여

   ```python
   def cost(cluster_idx):
       seed_dist = haversine(place.coord, seeds[cluster_idx].coord)
       size_penalty = max(0, len(clusters[idx]) - target_size + 1) * 5
       return seed_dist + size_penalty
   ```

   페널티 항이 없으면 거리가 짧은 클러스터에 다 몰림 → 다른 클러스터가 비어버림.

3. **날짜 매칭**
   - 각 클러스터를 가장 적합한 날짜에 배정
   - 점수 계산:
     - +10: 그 요일에 모든 장소가 영업
     - -5: 하나라도 휴무
     - +3: 실내 비중 60% 이상인 클러스터인데 비 오는 날
     - -3: 실외 비중 70% 이상인 클러스터인데 비 오는 날

### 왜 K-means가 아닌가

K-means는 (1) iterative해서 느리고, (2) 클러스터 크기 제약 표현이 어렵다.
우리 데이터는 작아서(N ≤ 30) 그리디로 충분하고, 크기 균형이 더 중요하다.

---

## Step 4. 시간 스케줄링 — 영업시간 제약 만족

### 문제

순서가 정해진 장소들에 **실제 시각**을 부여해야 한다.
박물관은 월요일 휴관, 식당은 11~21시 영업 등 제약을 만족시켜야 함.

### 알고리즘 (단순한 순차 시뮬레이션)

```
current_time = 10:00 (시작 시각)

for each place in optimized_order:
    1. 이전 장소 → 현재 장소 이동
       current_time += 카카오 API 이동시간

    2. 식사 시간대 (12:00~13:30, 18:00~19:30) 진입?
       → 점심/저녁 슬롯 자동 삽입
       current_time += 식사 시간

    3. 영업시간 체크
       if current_time < 영업 시작:
           wait_minutes = 영업시작 - current_time
           if wait_minutes >= 15:
               대기 슬롯 추가
           current_time = 영업 시작 시각

    4. 체류 시간 결정
       stay = min(평균 체류 시간, 영업 종료까지 남은 시간)
       if stay < 30: skip (실질 방문 불가)

    5. 장소 슬롯 추가
       current_time += stay

    6. 22:00 넘으면 종료
```

### 왜 더 정교한 알고리즘을 안 쓰는가

이건 **Constraint Satisfaction Problem(CSP)**의 일반적 형태로 풀 수도 있다
(Z3 같은 SMT solver 사용). 하지만:

1. 우리 케이스는 제약이 단순함 (선형, 결정론적)
2. 순차 시뮬레이션이 더 이해하기 쉽고 디버깅 편함
3. 충분히 빠름 (장소당 O(1))

복잡도가 높아지면 CSP solver 도입을 고려할 수 있음.

---

## Step 5. LLM 후처리 — 비용/속도 최적화

### 핵심 결정: "1 trip = 1 API call"

순진하게 짠다면 슬롯마다 GPT를 부른다:
```
N개 슬롯 → N번 API 호출 → 비용 N배, 지연 시간 N배
```

대신 모든 슬롯을 **JSON 배열로 묶어** 한 번에 보낸다:

```json
입력: {
  "days": [
    { "day_number": 1, "slots": [
        { "id": "d1s1", "type": "place", "title": "북촌", ... },
        { "id": "d1s2", "type": "meal", "title": "점심", ... }
    ]}
  ]
}

출력: {
  "days": [
    { "day_number": 1, "title": "...", "slots": [
        { "id": "d1s1", "ai_reason": "..." },
        { "id": "d1s2", "ai_reason": "..." }
    ]}
  ]
}
```

`id` 매핑으로 결과를 다시 원본 슬롯에 합쳐넣는다.

### 프롬프트의 핵심 규칙

```
RULES (strict):
1) DO NOT change times, durations, places, or order — only add explanatory text.
2) Each aiReason must be 25~50 Korean characters.
3) Return JSON only matching the input schema.
```

이렇게 명시함으로써, GPT가 환각으로 시간을 바꾸거나 장소를 추가하는 것을 방지.
응답이 JSON 형식이 깨지면 catch해서 템플릿 fallback.

### Fallback 메커니즘

LLM 호출 실패 시 카테고리 기반 템플릿:

```python
if slot.type == "place" and slot.place_ref.indoor and day.weather.is_bad_weather:
    return "비 예보 시간대라 실내 일정으로 안정성을 확보합니다."
elif slot.place_ref.active:
    return "활동성 있는 일정으로 동행자의 에너지 수준을 맞춥니다."
# ...
```

사용자가 보기에는 LLM 답변과 거의 비슷한 품질이지만, 외부 API 의존 없이 동작.

---

## 복잡도 요약

| 단계 | 복잡도 | N=6 (전형적) 실측 |
|------|--------|-------------------|
| Step 1. Enrich | O(N) 병렬 | ~500ms (네트워크 의존) |
| Step 2. Day assign | O(N · K) | < 1ms |
| Step 3. TSP exact | O(N² · 2^N) | ~50ms |
| Step 3. TSP heuristic (N>9) | O(N³) | < 5ms |
| Step 4. Schedule | O(N) | < 1ms |
| Step 5. LLM | 1 API call | ~3000ms |

**병목은 외부 API (Enrich + LLM).** 알고리즘 부분은 사실상 무시 가능.

---

## 향후 개선 아이디어

1. **OR-Tools 도입**: Google의 CP/MILP solver. N > 12일 때 정확해를 빠르게 구함.
2. **운영시간 정확도**: TourAPI 연동으로 LLM 추론 의존도 낮추기.
3. **다양한 이동수단**: 도보/대중교통 옵션 추가 (카카오 길찾기 API에서 지원).
4. **다중 일정 비교**: 2~3가지 후보 일정을 만들어 사용자가 선택하게 하기.
5. **재학습 루프**: 사용자가 일정을 수정하면 그 패턴을 학습해 다음 추천 개선.
