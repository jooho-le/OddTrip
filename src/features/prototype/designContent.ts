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
  'photo-1528127269322-539801943592',
  'photo-1504674900247-0877df9cc836',
  'photo-1544550285-f813152fb2fd',
] as const;

export const PROPOSAL_DEMOS = [
  ['균형안', '공통 선호를 중심으로 차이를 반씩 반영', 86, 82, 84],
  ['도전안', '서로의 반대 성향을 한 번씩 경험', 74, 91, 88],
  ['안정안', '각자의 핵심 선호를 우선 보장', 91, 76, 79],
] as const;

export type SurveyKey = 'tti' | 'preference';

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
    title: '공동 선호 조사서',
    code: 'ODDTRIP FORM 02 · PRIVATE PREFERENCE',
    note: '각자의 답은 따로 저장됩니다. 두 사람 모두 제출하면 AI가 공통점과 차이를 함께 반영해 여행 장소와 이동 순서를 포함한 일정표를 자동으로 만듭니다.',
    kind: 'choice',
    questions: [
      '이번 여행에서 가장 원하는 장소 분위기는?',
      '하루에 적당한 방문 장소 수는?',
      '식사 선택에서 가장 중요한 기준은?',
      '반드시 포함하고 싶은 활동은?',
    ],
    options: [
      ['자연·해안', '전시·도시', '로컬·시장', '체험·활동'],
      ['1~2곳', '3곳', '4곳', '5곳 이상'],
      ['메뉴', '가격', '분위기', '접근성'],
      ['산책', '전시', '미식', '액티비티'],
    ],
    returnTo: '/trip/coordination',
  },
};

export const SCALE_LABELS = ['전혀 아니다', '아니다', '보통', '그렇다', '매우 그렇다'] as const;
