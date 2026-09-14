// 관광지·TTI 화면용 예시 데이터. 두 화면은 아직 조회 API가 없다.
// 회원·여행·신고 목데이터는 실 API로 대체되어 제거했다.

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
