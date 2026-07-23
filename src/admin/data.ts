export type AdminUserStatus = 'active' | 'suspended' | 'withdrawn';

export interface AdminUser {
  id: string;
  nickname: string;
  email: string;
  region: string;
  ttiCode: string;
  joinedAt: string;
  status: AdminUserStatus;
  matches: number;
  trips: number;
}

export interface AdminTrip {
  id: string;
  title: string;
  travelers: string[];
  region: string;
  period: string;
  status: 'planning' | 'confirmed' | 'completed' | 'cancelled';
  attractions: number;
  itineraryItems: number;
  createdAt: string;
}

export const adminUsers: AdminUser[] = [
  { id: 'u-1024', nickname: '지우', email: 'jiwoo@oddtrip.kr', region: '서울', ttiCode: 'PNFH', joinedAt: '2026.07.22', status: 'active', matches: 4, trips: 2 },
  { id: 'u-1023', nickname: '민재', email: 'minjae@oddtrip.kr', region: '부산', ttiCode: 'WCAS', joinedAt: '2026.07.21', status: 'active', matches: 3, trips: 1 },
  { id: 'u-1022', nickname: '서아', email: 'seoa@oddtrip.kr', region: '제주', ttiCode: 'WCAH', joinedAt: '2026.07.20', status: 'active', matches: 8, trips: 4 },
  { id: 'u-1021', nickname: '도윤', email: 'doyun@oddtrip.kr', region: '부산', ttiCode: 'WCAS', joinedAt: '2026.07.18', status: 'suspended', matches: 2, trips: 1 },
  { id: 'u-1020', nickname: '하린', email: 'harin@oddtrip.kr', region: '강릉', ttiCode: 'PNAS', joinedAt: '2026.07.17', status: 'active', matches: 5, trips: 3 },
  { id: 'u-1019', nickname: '준호', email: 'junho@oddtrip.kr', region: '강릉', ttiCode: 'PCAH', joinedAt: '2026.07.15', status: 'withdrawn', matches: 1, trips: 0 },
];

export const adminTrips: AdminTrip[] = [
  { id: 'TRIP-2407-018', title: '부산 로컬 2박 3일', travelers: ['지우', '민재'], region: '부산', period: '07.26 - 07.28', status: 'confirmed', attractions: 8, itineraryItems: 14, createdAt: '2026.07.22' },
  { id: 'TRIP-2407-017', title: '강릉 바다와 골목', travelers: ['하린', '서아'], region: '강릉', period: '08.02 - 08.04', status: 'planning', attractions: 6, itineraryItems: 0, createdAt: '2026.07.21' },
  { id: 'TRIP-2407-016', title: '전주 취향 탐험', travelers: ['도윤', '준호'], region: '전주', period: '07.20 - 07.21', status: 'completed', attractions: 9, itineraryItems: 11, createdAt: '2026.07.17' },
  { id: 'TRIP-2407-015', title: '서울 문화 산책', travelers: ['민재', '하린'], region: '서울', period: '08.09 - 08.10', status: 'cancelled', attractions: 4, itineraryItems: 6, createdAt: '2026.07.15' },
];

export const adminAttractions = [
  { name: '흰여울문화마을', region: '부산 영도구', category: '관광지', source: 'TourAPI', hiddenScore: 84, congestion: 32, used: 18 },
  { name: 'F1963', region: '부산 수영구', category: '문화시설', source: 'TourAPI', hiddenScore: 71, congestion: 41, used: 14 },
  { name: '보수동 책방골목', region: '부산 중구', category: '관광지', source: 'TourAPI', hiddenScore: 89, congestion: 27, used: 12 },
  { name: '아르떼뮤지엄 강릉', region: '강원 강릉시', category: '문화시설', source: 'OpenAI', hiddenScore: 36, congestion: 78, used: 11 },
  { name: '전주수목원', region: '전북 전주시', category: '자연', source: 'TourAPI', hiddenScore: 76, congestion: 35, used: 9 },
];

export const ttiQuestions = [
  { id: 'q1', axis: 'PW', prompt: '여행 첫날 숙소에 도착했다. 당신이 더 끌리는 방식은?', order: 1, active: true },
  { id: 'q2', axis: 'NC', prompt: '새로운 도시에서 점심 장소를 고른다면?', order: 2, active: true },
  { id: 'q3', axis: 'FA', prompt: '여행 중 가장 만족스러운 순간은?', order: 3, active: true },
  { id: 'q4', axis: 'HS', prompt: '유명 관광지와 작은 동네 명소 중 고른다면?', order: 4, active: true },
  { id: 'q5', axis: 'PW', prompt: '비가 와서 일정이 틀어졌을 때 더 편한 쪽은?', order: 5, active: true },
];
