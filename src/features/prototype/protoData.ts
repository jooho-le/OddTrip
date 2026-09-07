/** 프로토타입 HTML의 목업 데이터 — 원본 값 그대로 */

export const UN = 'https://images.unsplash.com/';
export const img = (id: string, w: number, q: number) => `${UN}${id}?auto=format&fit=crop&w=${w}&q=${q}`;

export type TaskKey = 'concession' | 'rule' | 'proposal' | 'places' | 'approval' | 'done';
export type FormKey = 'tti' | 'preference' | 'concession' | 'rule' | 'approval';

export type Mate = {
  name: string;
  type: string;
  score: number;
  photo: string;
  desc: string;
  compat: string;
  axes: [string, number][];
};

export const mates: Mate[] = [
  {
    name: '지우', type: 'WCAS', score: 96, photo: 'photo-1500648767791-00dcc994a43e',
    desc: '계획 없이 도시를 걷고 숨은 가게를 찾습니다. 자연 중심인 내 여행을 가장 크게 넓혀줄 후보예요.',
    compat: '은진님의 자연·미식 중심 선택에 지우님의 도시 탐험과 즉흥성이 더해집니다. 아침 시작 시간과 방문 장소 수를 먼저 합의하면 균형 잡힌 여행이 가능합니다.',
    axes: [['계획 방식', 88], ['장소 분위기', 92], ['활동 강도', 74], ['대표·로컬', 91]]
  },
  {
    name: '민', type: 'WCAF', score: 91, photo: 'photo-1507003211169-0a1dd7228f2d',
    desc: '액티비티와 시장을 우선하고 예약은 당일에 정합니다. 부산 일정이 정확히 일치해요.',
    compat: '활동과 음식 선택이 풍부해집니다. 예약 시점과 하루 이동량을 조율하면 좋습니다.',
    axes: [['계획 방식', 85], ['장소 분위기', 76], ['활동 강도', 89], ['대표·로컬', 78]]
  },
  {
    name: '해린', type: 'WCAH', score: 84, photo: 'photo-1534528741775-53994a69daeb',
    desc: '느슨한 일정 안에 대표 명소 한 곳을 넣는 편입니다. 아침 시작 시간이 잘 맞아요.',
    compat: '여유로운 일정 리듬은 잘 맞고 장소 선택에서 새로운 경험을 얻을 수 있습니다.',
    axes: [['계획 방식', 67], ['장소 분위기', 71], ['활동 강도', 64], ['대표·로컬', 83]]
  },
  {
    name: '준서', type: 'SCAS', score: 78, photo: 'photo-1506794778202-cad84cf45f1d',
    desc: '먹는 것을 우선하고 걷는 거리는 짧게 잡습니다. 예산 기준이 가장 비슷합니다.',
    compat: '식사와 예산 기준은 잘 맞지만 새로운 활동을 넣을 때 의견 차이가 생길 수 있습니다.',
    axes: [['계획 방식', 55], ['장소 분위기', 69], ['활동 강도', 72], ['대표·로컬', 75]]
  }
];

export type FormSpec = {
  title: string;
  code: string;
  note: string;
  kind: 'scale' | 'choice';
  questions: string[];
  options?: string[];
  return: { page: 'home' | 'trip'; tab?: string };
};

export const forms: Record<FormKey, FormSpec> = {
  tti: {
    title: '여행 성향 조사서', code: 'ODDTRIP FORM 01 · TRAVEL TYPE INDICATOR',
    note: '평소 여행에서 실제로 하는 선택을 기준으로 답해 주세요. 결과는 매칭 후보를 계산할 때 사용됩니다.',
    kind: 'scale',
    questions: ['여행 전 숙소와 식당을 미리 정해두는 편이다.', '유명 관광지보다 현지인이 가는 장소가 더 좋다.', '하루 일정은 여유보다 다양한 경험을 우선한다.', '익숙한 메뉴보다 처음 보는 음식을 선택한다.'],
    return: { page: 'home' }
  },
  preference: {
    title: '독립 선택 조사서', code: 'ODDTRIP FORM 02 · PRIVATE PREFERENCE',
    note: '상대의 답을 보기 전에 이번 여행에서 원하는 것을 각자 작성합니다. 제출 전에는 서로의 응답이 공개되지 않습니다.',
    kind: 'choice',
    questions: ['이번 여행에서 가장 원하는 장소 분위기는?', '하루에 적당한 방문 장소 수는?', '식사 선택에서 가장 중요한 기준은?', '반드시 포함하고 싶은 것은?'],
    options: ['자연·해안', '도시·전시', '음식·시장', '체험·활동'],
    return: { page: 'trip', tab: 'coordination' }
  },
  concession: {
    title: '양보 범위 조사서', code: 'ODDTRIP FORM 03 · PRIVATE CONCESSION',
    note: '각 항목이 나에게 얼마나 중요한지 표시해 주세요. 두 사람의 응답이 모두 끝난 뒤 겹치는 범위만 공개됩니다.',
    kind: 'scale',
    questions: ['아침 시작 시간을 늦게 잡는 것은 괜찮다.', '상대가 고른 장소를 하루 한 곳 포함할 수 있다.', '예산이 10% 늘어나는 것을 허용할 수 있다.', '이동 시간이 길어져도 꼭 가고 싶은 곳을 우선한다.'],
    return: { page: 'trip', tab: 'coordination' }
  },
  rule: {
    title: 'Odd Rule 선택서', code: 'ODDTRIP FORM 04 · AGREEMENT RULE',
    note: '차이가 생겼을 때 적용할 둘만의 규칙을 하나 선택합니다. 두 사람의 선택이 다르면 채팅 투표로 이어집니다.',
    kind: 'choice',
    questions: ['우리 여행에 적용할 조율 방식은?'],
    options: ['반반 혼합', '오전·오후 분할', '하루씩 번갈아 선택', '각자 핵심 1개 보장'],
    return: { page: 'trip', tab: 'coordination' }
  },
  approval: {
    title: '일정 확인·승인서', code: 'ODDTRIP FORM 05 · FINAL APPROVAL',
    note: '최종 일정의 이동량, 예산, 장소 구성을 확인한 뒤 승인하거나 수정 요청을 남겨 주세요.',
    kind: 'choice',
    questions: ['현재 공동 일정을 어떻게 처리할까요?'],
    options: ['이 일정 승인', '활동량 수정 요청', '이동량 수정 요청', '장소 변경 요청'],
    return: { page: 'trip', tab: 'schedule' }
  }
};

export const SCALE_LABELS = ['전혀 아니다', '아니다', '보통', '그렇다', '매우 그렇다'];

export const feed = [
  {
    name: '지우', type: 'WCAS · 즉흥 도시형', photo: 'photo-1500648767791-00dcc994a43e', meta: '오늘 · 부산',
    title: '영도 골목에서 세 시간을 걸었습니다.',
    text: '계획 없이 걷다가 작은 책방과 이름 없는 카페를 찾은 여행 기록입니다.',
    tags: ['영도', '골목 산책', '즉흥'],
    pics: ['photo-1538485399081-7c89757c343f', 'photo-1528127269322-539801943592', 'photo-1519501025264-65ba15a82390']
  },
  {
    name: '민', type: 'WCAF · 시장 탐험형', photo: 'photo-1507003211169-0a1dd7228f2d', meta: '3일 전 · 기장',
    title: '기장시장에서 아침부터 저녁까지.',
    text: '시장 음식과 해안 액티비티를 하루에 묶어 다녀온 기록입니다.',
    tags: ['기장시장', '해안', '액티비티'],
    pics: ['photo-1504674900247-0877df9cc836', 'photo-1534274867514-d5b47ef89ed7', 'photo-1488646953014-85cb44e25828']
  }
];

export const places: [string, string, string, number, number, number][] = [
  ['영도 흰여울문화마을', '반대 성향 체험', 'photo-1538485399081-7c89757c343f', 82, 91, 86],
  ['부평깡통시장', '공통 미식 선호', 'photo-1504674900247-0877df9cc836', 94, 76, 84],
  ['송도 해상케이블카', '활동·전망 조합', 'photo-1544550285-f813152fb2fd', 71, 88, 79]
];

export const proposals: [string, string, number, number, number][] = [
  ['균형형', '공통 선호를 중심으로 차이를 반씩 반영', 86, 82, 84],
  ['도전형', '서로의 반대 성향을 한 번씩 경험', 74, 91, 88],
  ['안정형', '각자의 핵심 선호를 우선 보장', 91, 76, 79]
];

export const STAGE_LABEL: Record<TaskKey, [string, string]> = {
  concession: ['조율 중', '양보 범위 작성'],
  rule: ['조율 중', 'Odd Rule 선택'],
  proposal: ['조율안 확인', '조율안 비교'],
  places: ['여행지 선택', '여행지 선택'],
  approval: ['승인 대기', '일정 승인'],
  done: ['여행 준비 완료', '완료']
};
