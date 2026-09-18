import { apiRequest } from '../../../shared/api/client';
import { CATEGORIES, type Author, type Category, type CommunityComment, type CommunityPost, type CommunityPostPage, type Draft, type PostInput } from '../../../features/community/communityModel';

export type PostListQuery = {
  category?: string;
  q?: string;
  view?: 'all' | 'mine' | 'saved';
  sort?: 'latest' | 'popular';
  page?: number;
  size?: number;
};

const BASE = '/api/community';

/** 서버는 비어 있는 항목을 null로 준다. 화면은 빈 문자열을 기대하므로 경계에서 맞춘다. */
const text = (value: unknown) => typeof value === 'string' ? value : '';

function toCategory(value: unknown): Category {
  return CATEGORIES.includes(value as Category) ? value as Category : CATEGORIES[0];
}

function toAuthor(value: any): Author {
  return { id: text(value?.id), nickname: text(value?.nickname), avatarUrl: value?.avatarUrl ?? null };
}

function toComment(raw: any): CommunityComment {
  return {
    id: text(raw?.id),
    postId: text(raw?.postId),
    author: toAuthor(raw?.author),
    body: text(raw?.body),
    createdAt: text(raw?.createdAt),
    mine: Boolean(raw?.mine),
  };
}

function toPost(raw: any): CommunityPost {
  return {
    id: text(raw?.id),
    author: toAuthor(raw?.author),
    tripId: raw?.tripId ?? null,
    category: toCategory(raw?.category),
    title: text(raw?.title),
    body: text(raw?.body),
    region: text(raw?.region),
    tags: Array.isArray(raw?.tags) ? raw.tags.map(text) : [],
    image: text(raw?.image),
    imageCaption: text(raw?.imageCaption),
    allowComments: raw?.allowComments !== false,
    likeCount: Number(raw?.likeCount ?? 0),
    commentCount: Number(raw?.commentCount ?? 0),
    liked: Boolean(raw?.liked),
    saved: Boolean(raw?.saved),
    mine: Boolean(raw?.mine),
    createdAt: text(raw?.createdAt),
    updatedAt: text(raw?.updatedAt),
    comments: Array.isArray(raw?.comments) ? raw.comments.map(toComment) : null,
  };
}

function toDraft(raw: any): Draft {
  return {
    draftKey: text(raw?.draftKey),
    updatedAt: text(raw?.updatedAt),
    input: {
      title: text(raw?.title),
      body: text(raw?.body),
      category: toCategory(raw?.category),
      region: text(raw?.region),
      tags: Array.isArray(raw?.tags) ? raw.tags.map(text) : [],
      image: text(raw?.image),
      imageCaption: text(raw?.imageCaption),
      allowComments: raw?.allowComments !== false,
    },
  };
}

function toPayload(input: PostInput, tripId?: string | null) {
  return {
    title: input.title,
    body: input.body,
    category: input.category,
    region: input.region || null,
    tags: input.tags,
    image: input.image || null,
    imageCaption: input.imageCaption || null,
    allowComments: input.allowComments,
    ...(tripId ? { tripId } : {}),
  };
}

export const communityService = {
  async listPosts(query: PostListQuery = {}): Promise<CommunityPostPage> {
    const response = await apiRequest<any>({
      url: `${BASE}/posts`,
      method: 'GET',
      params: {
        ...(query.category && query.category !== '전체' ? { category: query.category } : {}),
        ...(query.q ? { q: query.q } : {}),
        ...(query.view && query.view !== 'all' ? { view: query.view } : {}),
        ...(query.sort ? { sort: query.sort } : {}),
        ...(query.page ? { page: query.page } : {}),
        ...(query.size ? { size: query.size } : {}),
      },
    });
    const page = response.data ?? {};
    return {
      items: Array.isArray(page.items) ? page.items.map(toPost) : [],
      page: Number(page.page ?? 1),
      size: Number(page.size ?? 0),
      total: Number(page.total ?? 0),
      totalPages: Number(page.totalPages ?? 1),
    };
  },

  async getPost(postId: string): Promise<CommunityPost> {
    const response = await apiRequest<any>({ url: `${BASE}/posts/${encodeURIComponent(postId)}`, method: 'GET' });
    return toPost(response.data);
  },

  async createPost(input: PostInput, options: { draftKey?: string; tripId?: string | null } = {}): Promise<CommunityPost> {
    const response = await apiRequest<any>({
      url: `${BASE}/posts`,
      method: 'POST',
      params: options.draftKey ? { draftKey: options.draftKey } : undefined,
      data: toPayload(input, options.tripId),
    });
    return toPost(response.data);
  },

  async updatePost(postId: string, input: PostInput, options: { draftKey?: string } = {}): Promise<CommunityPost> {
    const response = await apiRequest<any>({
      url: `${BASE}/posts/${encodeURIComponent(postId)}`,
      method: 'PUT',
      params: options.draftKey ? { draftKey: options.draftKey } : undefined,
      data: toPayload(input),
    });
    return toPost(response.data);
  },

  async deletePost(postId: string): Promise<void> {
    await apiRequest<unknown>({ url: `${BASE}/posts/${encodeURIComponent(postId)}`, method: 'DELETE' });
  },

  /** 공감·저장은 토글이 아니라 원하는 상태를 보낸다. 연타해도 결과가 뒤집히지 않는다. */
  async setReaction(postId: string, field: 'like' | 'save', value: boolean): Promise<void> {
    await apiRequest<unknown>({ url: `${BASE}/posts/${encodeURIComponent(postId)}/${field}`, method: 'PUT', data: { value } });
  },

  async createComment(postId: string, body: string): Promise<CommunityComment> {
    const response = await apiRequest<any>({
      url: `${BASE}/posts/${encodeURIComponent(postId)}/comments`,
      method: 'POST',
      data: { body },
    });
    return toComment(response.data);
  },

  async deleteComment(postId: string, commentId: string): Promise<void> {
    await apiRequest<unknown>({
      url: `${BASE}/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
      method: 'DELETE',
    });
  },

  async listDrafts(): Promise<Draft[]> {
    const response = await apiRequest<any>({ url: `${BASE}/drafts`, method: 'GET' });
    const items = response.data?.items;
    return Array.isArray(items) ? items.map(toDraft) : [];
  },

  async saveDraft(draftKey: string, input: PostInput): Promise<Draft> {
    const response = await apiRequest<any>({
      url: `${BASE}/drafts/${encodeURIComponent(draftKey)}`,
      method: 'PUT',
      data: toPayload(input),
    });
    return toDraft(response.data);
  },

  async deleteDraft(draftKey: string): Promise<void> {
    await apiRequest<unknown>({ url: `${BASE}/drafts/${encodeURIComponent(draftKey)}`, method: 'DELETE' });
  },
};

export type CommunityServiceApi = typeof communityService;
