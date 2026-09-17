export const CATEGORIES = ['여행기', '여행 팁', '질문', '동행 후기'] as const;
export type Category = typeof CATEGORIES[number];
export type Author = { id: string; nickname: string };
export type PostInput = {
  title: string; body: string; category: Category; region: string; tags: string[];
  image: string; imageCaption: string; allowComments: boolean;
};
export type CommunityComment = { id: string; author: Author; body: string; createdAt: string };
export type CommunityPost = PostInput & {
  id: string; author: Author; createdAt: string; updatedAt: string;
  likes: number; liked: boolean; saved: boolean; comments: CommunityComment[]; sample: boolean;
};
export type Draft = { input: PostInput; updatedAt: string };
export type CommunityData = { version: 1; posts: CommunityPost[]; drafts: Record<string, Draft> };
export const emptyInput = (): PostInput => ({ title: '', body: '', category: '여행기', region: '', tags: [], image: '', imageCaption: '', allowComments: true });
export const storageKey = (userId: string) => `oddtrip.community.v1.${encodeURIComponent(userId)}`;

export const toPostInput = (source: PostInput): PostInput => ({
  title: source.title, body: source.body, category: source.category, region: source.region,
  tags: [...source.tags], image: source.image, imageCaption: source.imageCaption, allowComments: source.allowComments,
});

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

export function selectPosts(posts: CommunityPost[], options: { category?: string; query?: string; view?: string; sort?: string; userId: string }) {
  const query = (options.query ?? '').trim().toLocaleLowerCase();
  return posts.filter((post) =>
    (!options.category || options.category === '전체' || post.category === options.category)
    && (options.view !== 'saved' || post.saved)
    && (options.view !== 'mine' || post.author.id === options.userId)
    && (!query || [post.title, post.body, post.region, post.author.nickname, ...post.tags].join(' ').toLocaleLowerCase().includes(query))
  ).sort((a, b) => options.sort === 'popular'
    ? (b.likes + Number(b.liked)) - (a.likes + Number(a.liked)) || b.createdAt.localeCompare(a.createdAt)
    : b.createdAt.localeCompare(a.createdAt));
}

export function selectBestPosts(posts: CommunityPost[], limit = 3) {
  return [...posts]
    .sort((a, b) => {
      const engagementA = a.likes + Number(a.liked) + a.comments.length * 2;
      const engagementB = b.likes + Number(b.liked) + b.comments.length * 2;
      return engagementB - engagementA || b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, Math.max(0, limit));
}

// This adapter intentionally has no HTTP dependency. Replace it with the agreed
// community API when available; never send sample IDs into production reports.
export function createCommunityRepository(storage: Pick<Storage, 'getItem' | 'setItem'>, author: Author, seeds: CommunityPost[]) {
  const key = storageKey(author.id);
  const load = (): CommunityData => {
    const raw = storage.getItem(key);
    if (!raw) return { version: 1, posts: structuredClone(seeds), drafts: {} };
    let value: unknown;
    try { value = JSON.parse(raw); } catch { throw new Error('저장된 커뮤니티 자료를 읽을 수 없습니다. 기존 자료는 보존되어 있어요.'); }
    if (!isData(value)) throw new Error('저장된 커뮤니티 자료의 형식을 확인할 수 없습니다. 기존 자료는 보존되어 있어요.');
    return value;
  };
  const change = (mutate: (data: CommunityData) => void) => {
    const data = load();
    mutate(data);
    try { storage.setItem(key, JSON.stringify(data)); }
    catch { throw new Error('브라우저에 저장하지 못했어요. 저장 공간과 브라우저 설정을 확인해 주세요. 작성 중인 내용은 화면에 남아 있습니다.'); }
    return data;
  };
  const find = (data: CommunityData, id: string) => {
    const post = data.posts.find((item) => item.id === id);
    if (!post) throw new Error('글이 삭제되었거나 이 브라우저에 없는 글입니다.');
    return post;
  };
  const own = (post: CommunityPost) => {
    if (post.sample || post.author.id !== author.id) throw new Error('내가 작성한 글만 변경할 수 있습니다.');
  };
  return {
    key, load,
    publish(input: PostInput, id?: string, draftId?: string) {
      const error = validatePost(input);
      if (error) throw new Error(error);
      const postId = id ?? crypto.randomUUID();
      const data = change((data) => {
        const now = new Date().toISOString();
        const clean = { ...toPostInput(input), title: input.title.trim(), body: input.body.trim(), region: input.region.trim() };
        if (id) { const post = find(data, id); own(post); Object.assign(post, clean, { updatedAt: now }); }
        else data.posts.unshift({ ...clean, id: postId, author, createdAt: now, updatedAt: now, likes: 0, liked: false, saved: false, comments: [], sample: false });
        delete data.drafts[draftId ?? id ?? 'new'];
      });
      return { data, id: postId };
    },
    saveDraft(input: PostInput, id = 'new') {
      return change((data) => { if (id !== 'new' && !id.startsWith('trip:')) own(find(data, id)); data.drafts[id] = { input: toPostInput(input), updatedAt: new Date().toISOString() }; });
    },
    removeDraft(id: string) {
      return change((data) => { delete data.drafts[id]; });
    },
    remove(id: string) {
      return change((data) => { own(find(data, id)); data.posts = data.posts.filter((post) => post.id !== id); delete data.drafts[id]; });
    },
    toggle(id: string, field: 'liked' | 'saved') {
      return change((data) => { const post = find(data, id); post[field] = !post[field]; });
    },
    comment(id: string, body: string) {
      if (!body.trim() || body.length > 1000) throw new Error('댓글을 1~1,000자로 작성해 주세요.');
      return change((data) => {
        const post = find(data, id);
        if (!post.allowComments) throw new Error('댓글을 받지 않는 글입니다.');
        post.comments.push({ id: crypto.randomUUID(), author, body: body.trim(), createdAt: new Date().toISOString() });
      });
    },
    removeComment(id: string, commentId: string) {
      return change((data) => {
        const post = find(data, id);
        const comment = post.comments.find((item) => item.id === commentId);
        if (!comment || comment.author.id !== author.id) throw new Error('내가 작성한 댓글만 삭제할 수 있습니다.');
        post.comments = post.comments.filter((item) => item.id !== commentId);
      });
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function isAuthor(value: unknown): value is Author { return isRecord(value) && typeof value.id === 'string' && typeof value.nickname === 'string'; }
function isInput(value: unknown): value is PostInput & Record<string, unknown> {
  return isRecord(value) && ['title', 'body', 'region', 'image', 'imageCaption'].every((key) => typeof value[key] === 'string')
    && CATEGORIES.includes(value.category as Category) && typeof value.allowComments === 'boolean'
    && Array.isArray(value.tags) && value.tags.every((tag) => typeof tag === 'string');
}
function isData(value: unknown): value is CommunityData {
  return isRecord(value) && value.version === 1 && Array.isArray(value.posts) && isRecord(value.drafts)
    && Object.values(value.drafts).every((draft) => isRecord(draft) && typeof draft.updatedAt === 'string' && isInput(draft.input))
    && value.posts.every((post) => isInput(post) && isRecord(post) && typeof post.id === 'string' && isAuthor(post.author)
      && typeof post.createdAt === 'string' && typeof post.updatedAt === 'string' && typeof post.likes === 'number'
      && typeof post.liked === 'boolean' && typeof post.saved === 'boolean' && typeof post.sample === 'boolean'
      && Array.isArray(post.comments) && post.comments.every((comment) => isRecord(comment) && typeof comment.id === 'string'
        && isAuthor(comment.author) && typeof comment.body === 'string' && typeof comment.createdAt === 'string'));
}
