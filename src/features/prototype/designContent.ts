/**
 * Immutable presentation content taken from the 0562bbe HTML redesign.
 *
 * Runtime entities never live here. API-backed screens use these values only
 * for decorative fallback imagery and for explicitly disclosed demo flows.
 */

export const imageUrl = (id: string, width: number, quality = 80) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=${quality}`;

export const PROFILE_FALLBACKS = [
  'photo-1494790108377-be9c29b29330',
  'photo-1500648767791-00dcc994a43e',
  'photo-1507003211169-0a1dd7228f2d',
  'photo-1534528741775-53994a69daeb',
  'photo-1506794778202-cad84cf45f1d',
] as const;

export const FEED_THUMB_FALLBACKS = [
  ['photo-1538485399081-7c89757c343f', 'photo-1528127269322-539801943592', 'photo-1519501025264-65ba15a82390'],
  ['photo-1504674900247-0877df9cc836', 'photo-1534274867514-d5b47ef89ed7', 'photo-1488646953014-85cb44e25828'],
  ['photo-1510414842594-a61c69b5ae57', 'photo-1529156069898-49953e39b3ac', 'photo-1469854523086-cc02fe5d8800'],
] as const;

export const TRIP_IMAGE_FALLBACKS = [
  'photo-1538485399081-7c89757c343f',
  'photo-1535189043414-47a3c49a0bed',
  'photo-1542931287-023b922fa89b',
] as const;

export const PLACE_IMAGE_FALLBACKS = [
  'photo-1538485399081-7c89757c343f',
  'photo-1504674900247-0877df9cc836',
  'photo-1544550285-f813152fb2fd',
] as const;

export const PROPOSAL_DEMOS = [
  ['균형형', '공통 선호를 중심으로 차이를 반씩 반영', 86, 82, 84],
  ['도전형', '서로의 반대 성향을 한 번씩 경험', 74, 91, 88],
  ['안정형', '각자의 핵심 선호를 우선 보장', 91, 76, 79],
] as const;

export type SurveyKey = 'tti' | 'preference' | 'concession' | 'rule' | 'approval';

export type SurveyDesignSpec = {
  title: string;
  code: string;
  note: string;
  kind: 'scale' | 'choice';
  questions: string[];
  options?: string[][];
  returnTo: '/home' | '/trip/coordination' | '/trip/schedule';
};

export const SURVEY_DESIGNS: Record<Exclude<SurveyKey, 'tti'>, SurveyDesignSpec> = {
  preference: {
    title: '독립 선택 조사서',
    code: 'ODDTRIP FORM 02 · PRIVATE PREFERENCE',
    note: 'HTML의 독립 선택 문서 구조를 유지합니다. 현재 저장 범위는 백엔드가 지원하는 여행 공동 선호입니다.',
    kind: 'choice',
    questions: [
      '이번 여행에서 가장 원하는 장소 분위기는?',
      '하루에 적당한 방문 장소 수는?',
      '식사 선택에서 가장 중요한 기준은?',
      '반드시 포함하고 싶은 활동은?',
    ],
    options: [
      ['자연·해안', '도시·전시', '음식·시장', '체험·활동'],
      ['1~2곳', '3곳', '4곳', '5곳 이상'],
      ['현지성', '가격', '분위기', '익숙함'],
      ['산책', '전시', '미식', '액티비티'],
    ],
    returnTo: '/trip/coordination',
  },
  concession: {
    title: '양보 범위 조사서',
    code: 'ODDTRIP FORM 03 · PRIVATE CONCESSION',
    note: '각 항목이 나에게 얼마나 중요한지 표시해 주세요. 이 화면의 응답은 아직 서버에 저장되지 않습니다.',
    kind: 'scale',
    questions: [
      '아침 시작 시간을 늦게 잡는 것은 괜찮다.',
      '상대가 고른 장소를 하루 한 곳 포함할 수 있다.',
      '예산이 10% 늘어나는 것을 허용할 수 있다.',
      '이동 시간이 길어져도 꼭 가고 싶은 곳을 우선한다.',
    ],
    returnTo: '/trip/coordination',
  },
  rule: {
    title: 'Odd Rule 선택서',
    code: 'ODDTRIP FORM 04 · AGREEMENT RULE',
    note: '차이가 생겼을 때 적용할 둘만의 규칙을 비교합니다. 실제 합의 저장 기능은 아직 준비 중입니다.',
    kind: 'choice',
    questions: ['우리 여행에 적용할 조율 방식은?'],
    options: [['반반 혼합', '오전·오후 분할', '하루씩 번갈아 선택', '각자 핵심 1개 보장']],
    returnTo: '/trip/coordination',
  },
  approval: {
    title: '일정 확인·승인서',
    code: 'ODDTRIP FORM 05 · FINAL APPROVAL',
    note: '최종 일정의 이동량, 예산, 장소 구성을 확인합니다. 양쪽 승인과 수정 요청 저장은 아직 준비 중입니다.',
    kind: 'choice',
    questions: ['현재 공동 일정을 어떻게 처리할까요?'],
    options: [['이 일정 승인', '활동량 수정 요청', '이동량 수정 요청', '장소 변경 요청']],
    returnTo: '/trip/schedule',
  },
};

export const SCALE_LABELS = ['전혀 아니다', '아니다', '보통', '그렇다', '매우 그렇다'] as const;
