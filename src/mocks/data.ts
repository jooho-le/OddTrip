import type { Attraction, ItineraryDay, MatchCandidate, SafetyAlert, UserProfile } from '../types';

export const currentUser: UserProfile = {
  id: 'user-1',
  nickname: '민서',
  avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80',
  homeRegion: 'Seoul'
};

export const matchCandidates: MatchCandidate[] = [
  {
    id: 'm1',
    nickname: '도윤',
    ageRange: '20대 후반',
    region: 'Busan',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80',
    ttiCode: 'WCAS',
    summary: '명소와 체험을 시간표로 정리해 안정적으로 여행합니다.',
    compatibility: '당신의 즉흥성과 도윤님의 실행력이 균형을 만듭니다.',
    matchLevel: '완전 반대',
    recommendationScore: 96,
    differences: ['계획 밀도', '활동 강도', '명소 선호'],
    complements: ['놓칠 수 있는 예약을 챙겨줌', '즉흥 동선을 현실적인 일정으로 정리']
  },
  {
    id: 'm2',
    nickname: '서아',
    ageRange: '30대 초반',
    region: 'Jeju',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=240&q=80',
    ttiCode: 'WCAH',
    summary: '숨은 장소를 좋아하지만 예산과 동선을 꼼꼼히 봅니다.',
    compatibility: '둘 다 로컬한 장소를 좋아해 취향 합의가 빠릅니다.',
    matchLevel: '부분 반대',
    recommendationScore: 88,
    differences: ['예산 판단', '사전 예약'],
    complements: ['즉흥 선택의 리스크를 낮춤', '로컬 취향은 함께 확장']
  },
  {
    id: 'm3',
    nickname: '준호',
    ageRange: '20대 중반',
    region: 'Gangneung',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=240&q=80',
    ttiCode: 'PCAH',
    summary: '안전한 선택 안에서 활동적인 경험을 찾습니다.',
    compatibility: '휴식과 활동의 중간 속도를 만들기 좋습니다.',
    matchLevel: '추천',
    recommendationScore: 82,
    differences: ['일정 강도', '체험 선호'],
    complements: ['느슨한 일정에 활력을 더함', '검증된 선택으로 실패 확률 감소']
  }
];

export const attractions: Attraction[] = [
  {
    id: 'a1',
    name: '청수당 익선',
    category: '카페',
    imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=80',
    description: '한옥 골목 안에서 조용히 쉬어갈 수 있는 감성 카페.',
    reason: '휴식형 사용자에게는 긴 머무름을, 활동형 동행자에게는 주변 골목 탐색을 제공합니다.',
    tags: ['실내', '휴식형', '숨은 명소'],
    indoor: true,
    active: false,
    famous: false,
    saved: false,
    excluded: false
  },
  {
    id: 'a2',
    name: '북촌 전망 산책로',
    category: '산책',
    imageUrl: 'https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=900&q=80',
    description: '서울의 오래된 지붕선과 도심 풍경을 함께 보는 코스.',
    reason: '유명 코스와 로컬 골목을 자연스럽게 연결해 서로의 취향을 절충합니다.',
    tags: ['실외', '활동형', '유명'],
    indoor: false,
    active: true,
    famous: true,
    saved: true,
    excluded: false
  },
  {
    id: 'a3',
    name: '국립현대미술관 서울',
    category: '전시',
    imageUrl: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=900&q=80',
    description: '날씨 영향을 덜 받으며 대화를 만들기 좋은 전시 공간.',
    reason: '비 예보가 있을 때도 일정 안정성이 높고, 각자 속도로 관람할 수 있습니다.',
    tags: ['실내', '휴식형', '유명'],
    indoor: true,
    active: false,
    famous: true,
    saved: false,
    excluded: false
  },
  {
    id: 'a4',
    name: '성수 공방 체험',
    category: '체험',
    imageUrl: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=900&q=80',
    description: '가죽 키링과 향을 직접 만드는 예약형 체험.',
    reason: '활동형 동행자에게는 몰입감을, 조용한 타입에게는 대화 부담이 적은 시간을 줍니다.',
    tags: ['실내', '활동형', '숨은 명소'],
    indoor: true,
    active: true,
    famous: false,
    saved: false,
    excluded: false
  }
];

export const itineraryDays: ItineraryDay[] = [
  {
    day: 1,
    title: '북촌과 익선의 균형 잡힌 시작',
    weather: '흐림, 오후 약한 비 가능성 40%',
    caution: '오후 4시 이후 실내 대체 코스를 우선 배치했습니다.',
    items: [
      { id: 'i1', day: 1, time: '10:00', type: 'place', title: '북촌 전망 산책로', location: '북촌', duration: '80분', moveTime: '도보 12분', description: '전망 포인트와 골목을 연결하는 산책.', aiReason: '명소 선호와 숨은 골목 취향을 동시에 만족합니다.' },
      { id: 'i2', day: 1, time: '12:00', type: 'meal', title: '한식 점심', location: '안국', duration: '60분', description: '대기 적은 검증 식당을 우선 추천.', aiReason: '새 메뉴 도전과 안정 선택의 중간값입니다.' },
      { id: 'i3', day: 1, time: '14:00', type: 'rest', title: '청수당 익선', location: '익선동', duration: '70분', description: '비가 오면 오래 머무를 수 있는 카페.', aiReason: '휴식형 속도를 회복하고 대화 시간을 만듭니다.' }
    ]
  },
  {
    day: 2,
    title: '전시와 체험으로 만드는 합의',
    weather: '맑음, 체감 24도',
    caution: '오전 이동이 많아 편한 신발을 권장합니다.',
    items: [
      { id: 'i4', day: 2, time: '09:30', type: 'move', title: '성수 이동', location: '지하철', duration: '35분', description: '환승 1회 기준 이동.', aiReason: '피로도를 낮추기 위해 출근 피크 이후로 배치했습니다.' },
      { id: 'i5', day: 2, time: '10:30', type: 'place', title: '성수 공방 체험', location: '성수', duration: '120분', description: '예약 기반 실내 체험.', aiReason: '활동성과 안정성을 동시에 충족합니다.' },
      { id: 'i6', day: 2, time: '15:00', type: 'place', title: '국립현대미술관 서울', location: '소격동', duration: '100분', description: '각자 속도로 볼 수 있는 전시.', aiReason: '대화와 개인 시간을 모두 만들 수 있습니다.' }
    ]
  },
  {
    day: 3,
    title: '가벼운 마무리와 선택형 여유',
    weather: '맑음, 미세먼지 보통',
    caution: '체크아웃 이후 짐 보관 위치를 먼저 확인하세요.',
    items: [
      { id: 'i7', day: 3, time: '10:30', type: 'meal', title: '브런치', location: '서촌', duration: '70분', description: '예약 없이 가능한 브런치 후보.', aiReason: '마지막 날 변동성을 고려해 부담을 낮췄습니다.' },
      { id: 'i8', day: 3, time: '12:30', type: 'rest', title: '서촌 자유 산책', location: '서촌', duration: '90분', description: '상점, 책방, 골목을 자유롭게 선택.', aiReason: '서로 다른 속도를 허용하는 마무리 코스입니다.' }
    ]
  }
];

export const safetyAlerts: SafetyAlert[] = [
  { id: 's1', level: 'warning', title: '오후 소나기 가능', message: '오늘 16:00 이후 강수 확률이 올라갑니다.', action: '실내 전시와 카페를 대체 일정으로 준비', time: '오늘 09:20' },
  { id: 's2', level: 'info', title: '행사로 인한 혼잡', message: '북촌 주요 골목에 단체 방문객이 예상됩니다.', action: '전망 산책로를 30분 앞당기기', time: '오늘 10:05' },
  { id: 's3', level: 'danger', title: '강풍 예비 알림', message: '내일 한강 인근 야외 활동은 체감 위험이 있습니다.', action: '실내 공방 체험으로 자동 조정 제안', time: '어제 22:40' }
];
