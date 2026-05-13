import type { TtiQuestion, TravelTypeSample } from '../types';

export const ttiQuestions: TtiQuestion[] = [
  { id: 'q1', axis: 'PW', prompt: '여행 첫날 숙소에 도착했다. 당신이 더 끌리는 방식은?', leftLabel: '바로 동네를 걸으며 즉흥 탐색', rightLabel: '저장한 코스부터 차례대로 확인', leftLetter: 'P', rightLetter: 'W' },
  { id: 'q2', axis: 'NC', prompt: '새로운 도시에서 점심 장소를 고른다면?', leftLabel: '처음 보는 현지 식당에 도전', rightLabel: '후기 많은 검증 맛집 선택', leftLetter: 'N', rightLetter: 'C' },
  { id: 'q3', axis: 'FA', prompt: '여행 중 가장 만족스러운 순간은?', leftLabel: '카페와 공원에서 오래 머무는 시간', rightLabel: '액티비티와 체험으로 꽉 찬 시간', leftLetter: 'F', rightLetter: 'A' },
  { id: 'q4', axis: 'HS', prompt: '유명 관광지와 작은 동네 명소 중 고른다면?', leftLabel: '사람들이 놓치는 조용한 장소', rightLabel: '대표 랜드마크와 필수 코스', leftLetter: 'H', rightLetter: 'S' },
  { id: 'q5', axis: 'PW', prompt: '비가 와서 일정이 틀어졌을 때 더 편한 쪽은?', leftLabel: '그 자리에서 새 계획을 찾기', rightLabel: '대체 실내 코스를 미리 준비하기', leftLetter: 'P', rightLetter: 'W' },
  { id: 'q6', axis: 'NC', prompt: '여행 예산을 쓸 때 당신은?', leftLabel: '기억에 남을 경험이면 과감히 지출', rightLabel: '가격과 만족도를 비교해 안정 선택', leftLetter: 'N', rightLetter: 'C' },
  { id: 'q7', axis: 'FA', prompt: '하루 일정의 이상적인 밀도는?', leftLabel: '두세 곳만 깊게 즐기기', rightLabel: '여러 곳을 빠르게 경험하기', leftLetter: 'F', rightLetter: 'A' },
  { id: 'q8', axis: 'HS', prompt: '사진을 찍고 싶은 장소는?', leftLabel: '골목, 로컬 상점, 우연한 풍경', rightLabel: '전망대, 박물관, 대표 포토존', leftLetter: 'H', rightLetter: 'S' },
  { id: 'q9', axis: 'PW', prompt: '여행 전 준비 스타일에 가깝게 고르면?', leftLabel: '핵심만 정하고 현장에서 결정', rightLabel: '예약, 동선, 시간을 상세히 정리', leftLetter: 'P', rightLetter: 'W' },
  { id: 'q10', axis: 'NC', prompt: '동행자가 낯선 메뉴를 제안했다면?', leftLabel: '좋아, 이번 여행의 발견일 수 있어', rightLabel: '리뷰와 재료를 먼저 확인하고 싶어', leftLetter: 'N', rightLetter: 'C' },
  { id: 'q11', axis: 'FA', prompt: '오후 시간이 비었을 때 고르는 선택은?', leftLabel: '숙소 근처에서 천천히 쉬기', rightLabel: '근교 체험 프로그램 예약하기', leftLetter: 'F', rightLetter: 'A' },
  { id: 'q12', axis: 'HS', prompt: '다녀온 여행을 떠올릴 때 더 좋은 기억은?', leftLabel: '나만 알고 싶은 장면을 발견한 일', rightLabel: '꼭 봐야 할 명소를 놓치지 않은 일', leftLetter: 'H', rightLetter: 'S' }
];

export const travelTypes: TravelTypeSample[] = [
  { code: 'PNFH', title: '느슨한 발견가', description: '계획보다 감각을 믿고 숨은 장소에서 오래 머무는 타입입니다.', keywords: ['즉흥', '로컬', '휴식'] },
  { code: 'WCAS', title: '클래식 정복가', description: '동선과 예약을 정리하고 대표 코스를 효율적으로 완주합니다.', keywords: ['계획', '액티비티', '명소'] },
  { code: 'PNAS', title: '즉흥 모험가', description: '새로운 체험과 유명 포인트를 빠르게 즐기는 타입입니다.', keywords: ['도전', '활동', '랜드마크'] },
  { code: 'WCFH', title: '차분한 큐레이터', description: '검증된 선택을 바탕으로 조용한 장소를 깊게 즐깁니다.', keywords: ['안정', '휴식', '취향'] }
];
