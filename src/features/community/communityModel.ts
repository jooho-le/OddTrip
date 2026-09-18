export const CATEGORIES = ['여행기', '여행 팁', '질문', '동행 후기'] as const;
export type Category = typeof CATEGORIES[number];
export type Author = { id: string; nickname: string; avatarUrl?: string | null };
export type PostInput = {
  title: string; body: string; category: Category; region: string; tags: string[];
  image: string; imageCaption: string; allowComments: boolean;
};
export type CommunityComment = { id: string; postId: string; author: Author; body: string; createdAt: string; mine: boolean };
export type CommunityPost = PostInput & {
  id: string; author: Author; tripId: string | null; createdAt: string; updatedAt: string;
  // 공감 수는 내 공감을 포함한 전체다. liked·saved·mine은 요청한 사람 기준이다.
  likeCount: number; commentCount: number; liked: boolean; saved: boolean; mine: boolean;
  // 목록 응답에는 없고 상세 응답에만 담긴다.
  comments: CommunityComment[] | null;
};
export type CommunityPostPage = { items: CommunityPost[]; page: number; size: number; total: number; totalPages: number };
// 초안 키는 새 글이 'new', 수정 초안이 글 id, 여행에서 시작한 글이 'trip:<tripId>'다.
export type Draft = { draftKey: string; updatedAt: string; input: PostInput };
export const emptyInput = (): PostInput => ({ title: '', body: '', category: '여행기', region: '', tags: [], image: '', imageCaption: '', allowComments: true });

export const toPostInput = (source: PostInput): PostInput => ({
  title: source.title, body: source.body, category: source.category, region: source.region,
  tags: [...source.tags], image: source.image, imageCaption: source.imageCaption, allowComments: source.allowComments,
});

// 서버도 같은 한도를 확인한다. 여기서 먼저 걸러 주는 이유는 왕복 한 번을 아끼고
// 입력 옆에 바로 이유를 보여 주기 위해서이지, 서버 검증을 대신하기 위해서가 아니다.
export function validatePost(input: PostInput): string | undefined {
  if (!input.title.trim() || input.title.trim().length > 80) return '제목을 1~80자로 작성해 주세요.';
  if (input.body.trim().length < 10 || input.body.length > 10000) return '본문을 10~10,000자로 작성해 주세요.';
  if (!CATEGORIES.includes(input.category)) return '카테고리를 선택해 주세요.';
  if (input.region.length > 30) return '여행 지역은 30자까지 입력할 수 있어요.';
  if (input.tags.length > 5 || input.tags.some((tag) => tag.length > 20)) return '태그는 각 20자, 최대 5개까지 입력해 주세요.';
  return undefined;
}

export function parseTags(text: string) {
  return [...new Set(text.split(/[,#\s]+/).map((tag) => tag.trim()).filter(Boolean))];
}
