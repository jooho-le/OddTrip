import { imageUrl } from '../prototype/designContent';
import { emptyInput, type Category, type CommunityPost } from './communityModel';

// Original illustrative writing, not imported Naver posts. Photos are mood
// references from the existing design asset set, not evidence of these trips.
const stories: { title: string; category: Category; region: string; nickname: string; image: string; tags: string[]; body: string }[] = [
  {
    title: '계획을 조금 비웠더니, 여행이 더 선명해졌다', category: '여행기', region: '강릉', nickname: '느린걸음',
    image: 'photo-1507525428034-b723cf961d3e', tags: ['바다', '느린여행', '강릉'],
    body: '이번 여행에서는 하루에 한 곳만 정하기로 했다. 나머지 시간은 그곳에서 마음이 가는 쪽으로 걸어보기. 빼곡했던 일정표에 여백을 남기는 건 생각보다 큰 용기가 필요했다.\n\n바다 앞에 앉아 커피가 식을 때까지 이야기를 나눴다. 사진을 좋아하는 동행은 파도를 찍고, 나는 읽다 만 책을 펼쳤다. 같은 장소에서 꼭 같은 일을 하지 않아도 함께 여행할 수 있다는 걸 알았다.\n\n다음 여행에도 한 칸은 비워 두려고 한다. 우연히 발견한 골목이나 조금 더 머물고 싶은 풍경을 위해서. 여러분은 여행에서 어떤 시간을 가장 오래 기억하나요?',
  },
  {
    title: '걷는 사람과 쉬는 사람, 둘 다 좋았던 주말', category: '동행 후기', region: '서울', nickname: '모퉁이',
    image: 'photo-1534274867514-d5b47ef89ed7', tags: ['동행', '산책', '서로다른취향'],
    body: '나는 낯선 골목을 오래 걷는 편이고, 동행은 한 공간에 머무는 시간을 좋아한다. 처음에는 여행 속도가 맞지 않을까 걱정했다.\n\n그래서 오전에는 함께 산책하고, 오후에는 각자 고른 카페에서 쉬었다. 저녁에 다시 만나 서로 발견한 작은 장면을 나누니 하루를 두 번 여행한 기분이었다.\n\n잘 맞는 동행은 취향이 같은 사람만은 아닌 것 같다. 서로 다른 속도를 먼저 이야기할 수 있는 사람이면 충분했다.',
  },
  {
    title: '가볍게 떠나는 1박 2일, 가방에 남긴 것들', category: '여행 팁', region: '국내', nickname: '작은배낭',
    image: 'photo-1488646953014-85cb44e25828', tags: ['짐싸기', '주말여행', '체크리스트'],
    body: '짐을 줄이기 위해 가장 먼저 한 일은 여행 중 실제로 쓸 장면을 떠올리는 것이었다. 혹시 모르니 챙기는 물건보다 하루의 동선에 필요한 물건을 골랐다.\n\n편한 신발, 얇은 겉옷, 충전기, 개인 상비품. 나머지는 숙소에서 제공하는지 미리 확인했다. 작은 파우치에 자주 쓰는 물건을 모아두면 이동할 때 가방을 전부 열지 않아도 된다.\n\n각자의 건강과 여행 환경에 필요한 준비물은 다르니 이 목록은 참고만 해 주세요. 여러분의 가방에서 절대 빠지지 않는 한 가지는 무엇인가요?',
  },
  {
    title: '비 오는 날에는 어떤 여행을 하시나요?', category: '질문', region: '부산', nickname: '다음정거장',
    image: '', tags: ['비오는날', '실내여행', '부산'],
    body: '바다를 따라 걷는 여행을 준비하고 있는데 비 소식이 있어요. 일정을 모두 바꾸기보다 실내에서 오래 머물 수 있는 곳을 한두 군데 더 찾아두려고 합니다.\n\n여러분은 비 오는 날 어떤 곳에서 시간을 보내시나요? 작은 전시나 서점, 창밖을 보며 쉴 수 있는 공간처럼 각자의 경험을 들려주세요.',
  },
  {
    title: '목적지보다 오래 기억에 남은 기차 안의 시간', category: '여행기', region: '전주', nickname: '창가자리',
    image: 'photo-1469854523086-cc02fe5d8800', tags: ['기차여행', '기록', '주말여행'],
    body: '출발하는 날 아침에는 언제나 조금 서두르게 된다. 자리에 앉고 창밖의 풍경이 움직이기 시작하면 그제야 여행이 시작됐다는 실감이 난다.\n\n이어폰을 한쪽씩 나눠 끼고 같은 음악을 들었다. 대단한 대화는 없었지만 서로 좋아하는 노래를 알게 됐다. 도착하기 전부터 이미 좋은 여행이었다.\n\n사진첩을 정리하다 보니 목적지에서 찍은 사진보다 흔들리는 창밖 사진에 더 오래 머물렀다.',
  },
  {
    title: '첫 동행 전에 함께 이야기해 보면 좋은 세 가지', category: '여행 팁', region: '국내', nickname: '여행의온도',
    image: '', tags: ['첫동행', '여행준비', '대화'],
    body: '같이 여행하기 전에 어떤 이야기를 나눠야 할지 막막할 때가 있다. 나는 하루의 시작 시간, 식사 예산, 혼자 쉬고 싶은 시간을 먼저 이야기한다.\n\n여행 계획은 장소 목록만으로 완성되지 않는다. 예상보다 피곤한 날에는 어떻게 할지, 의견이 다르면 어떤 방식으로 결정할지도 가볍게 나눠보자.\n\n모든 취향이 같을 필요는 없다. 서로 중요하게 생각하는 한 가지를 기억하는 것부터 시작해도 좋다.',
  },
];

export const COMMUNITY_SAMPLES: CommunityPost[] = stories.map((story, index) => ({
  ...emptyInput(), ...story, image: story.image ? imageUrl(story.image, 1000) : '', imageCaption: story.image ? '여행 분위기 참고 이미지 · Unsplash' : '',
  id: `story-${index + 1}`, author: { id: `sample-author-${index + 1}`, nickname: story.nickname },
  createdAt: `2026-09-${String(15 - index).padStart(2, '0')}T03:00:00.000Z`, updatedAt: `2026-09-${String(15 - index).padStart(2, '0')}T03:00:00.000Z`,
  likes: [24, 18, 12, 3, 9, 7][index], liked: false, saved: false, sample: true, comments: [],
}));
