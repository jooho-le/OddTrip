import { describe, expect, it } from 'vitest';
import { createCommunityRepository, emptyInput, parseTags, selectBestPosts, selectPosts, storageKey } from './communityModel';
import { COMMUNITY_SAMPLES } from './communitySamples';

function setup() {
  const items = new Map<string, string>();
  const storage = { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => { items.set(key, value); } };
  const author = { id: 'traveler-a', nickname: '여행자' };
  const repository = createCommunityRepository(storage, author, COMMUNITY_SAMPLES);
  return { items, storage, author, repository };
}
const input = () => ({ ...emptyInput(), title: '나의 첫 여행', body: '동행과 함께 걸으며 남긴 여행 기록입니다.', region: '강릉', tags: ['바다'] });

describe('local community adapter', () => {
  it('keeps drafts across reloads, publishes once, clears the draft, and supports edit/delete', () => {
    const { repository, storage, author } = setup();
    repository.saveDraft(input());
    const reloaded = createCommunityRepository(storage, author, COMMUNITY_SAMPLES);
    expect(reloaded.load().drafts.new.input.title).toBe('나의 첫 여행');
    const published = reloaded.publish(input());
    expect(published.data.drafts.new).toBeUndefined();
    expect(published.data.posts[0].author).toEqual(author);
    repository.toggle(published.id, 'saved');
    repository.comment(published.id, '함께 걷고 싶어요.');
    const edited = repository.publish({ ...input(), title: '수정한 여행' }, published.id);
    expect(edited.data.posts[0].saved).toBe(true);
    expect(edited.data.posts[0].comments).toHaveLength(1);
    expect(repository.remove(published.id).posts.some((post) => post.id === published.id)).toBe(false);
  });
  it('keeps a trip-based draft separate from the generic new-post draft', () => {
    const { repository } = setup();
    repository.saveDraft(input());
    repository.saveDraft({ ...input(), title: '강릉 여행 초안' }, 'trip:trip-1');
    const beforePublish = repository.load();
    expect(beforePublish.drafts.new.input.title).toBe('나의 첫 여행');
    expect(beforePublish.drafts['trip:trip-1'].input.title).toBe('강릉 여행 초안');

    const published = repository.publish({ ...input(), title: '강릉 여행 완성' }, undefined, 'trip:trip-1').data;
    expect(published.drafts['trip:trip-1']).toBeUndefined();
    expect(published.drafts.new.input.title).toBe('나의 첫 여행');
  });
  it('isolates accounts and never edits seed fixtures', () => {
    const { repository, storage } = setup();
    repository.publish(input());
    repository.toggle('story-1', 'liked');
    const other = createCommunityRepository(storage, { id: 'traveler-b', nickname: '다른 여행자' }, COMMUNITY_SAMPLES).load();
    expect(other.posts).toHaveLength(COMMUNITY_SAMPLES.length);
    expect(other.posts[0].liked).toBe(false);
    expect(COMMUNITY_SAMPLES[0].liked).toBe(false);
  });
  it('rejects editing samples, invalid content, and comments on closed posts', () => {
    const { repository } = setup();
    expect(() => repository.publish(input(), 'story-1')).toThrow('내가 작성한');
    expect(() => repository.remove('story-1')).toThrow('내가 작성한');
    expect(() => repository.publish({ ...input(), body: ' ' })).toThrow('본문');
    const { id } = repository.publish({ ...input(), allowComments: false });
    expect(() => repository.comment(id, '댓글입니다.')).toThrow('댓글을 받지');
  });
  it('toggles likes and saves reversibly without drifting counts', () => {
    const { repository } = setup();
    repository.toggle('story-1', 'liked');
    const data = repository.toggle('story-1', 'liked');
    expect(data.posts[0].likes).toBe(24);
    expect(data.posts[0].liked).toBe(false);
    repository.toggle('story-1', 'saved');
    expect(repository.toggle('story-1', 'saved').posts[0].saved).toBe(false);
  });
  it('filters by category, title, region, tag, author, mine and saved', () => {
    const { repository, author } = setup();
    const { id } = repository.publish(input());
    const data = repository.toggle(id, 'saved');
    expect(selectPosts(data.posts, { userId: author.id, view: 'mine', query: '바다', category: '여행기' }).map((post) => post.id)).toEqual([id]);
    expect(selectPosts(data.posts, { userId: author.id, view: 'saved' })).toHaveLength(1);
    expect(selectPosts(data.posts, { userId: author.id, query: '없는검색어' })).toHaveLength(0);
    expect(parseTags('바다, #강릉 바다')).toEqual(['바다', '강릉']);
  });
  it('selects best posts by reactions without mutating the source order', () => {
    const posts = structuredClone(COMMUNITY_SAMPLES.slice(0, 3));
    posts[1].comments = [
      { id: 'comment-1', author: { id: 'reader', nickname: '독자' }, body: '좋아요', createdAt: '2026-09-16T00:00:00.000Z' },
      { id: 'comment-2', author: { id: 'reader', nickname: '독자' }, body: '도움됐어요', createdAt: '2026-09-16T00:01:00.000Z' },
      { id: 'comment-3', author: { id: 'reader', nickname: '독자' }, body: '저장했어요', createdAt: '2026-09-16T00:02:00.000Z' },
      { id: 'comment-4', author: { id: 'reader', nickname: '독자' }, body: '고마워요', createdAt: '2026-09-16T00:03:00.000Z' },
    ];
    const originalOrder = posts.map((post) => post.id);

    expect(selectBestPosts(posts, 2).map((post) => post.id)).toEqual(['story-2', 'story-1']);
    expect(posts.map((post) => post.id)).toEqual(originalOrder);
  });
  it('preserves corrupt data and does not silently overwrite it', () => {
    const { repository, items, author } = setup();
    for (const raw of ['broken json', '{"version":1,"posts":[{}],"drafts":{}}']) {
      items.set(storageKey(author.id), raw);
      expect(() => repository.load()).toThrow('자료');
      expect(() => repository.publish(input())).toThrow('자료');
      expect(items.get(storageKey(author.id))).toBe(raw);
    }
  });
  it('does not lose a draft or report success when storage is full', () => {
    const { repository, storage, author } = setup();
    repository.saveDraft(input());
    const full = createCommunityRepository({ ...storage, setItem: () => { throw new Error('quota'); } }, author, COMMUNITY_SAMPLES);
    expect(() => full.publish(input())).toThrow('저장하지 못했어요');
    expect(repository.load().drafts.new).toBeDefined();
    expect(repository.load().posts).toHaveLength(COMMUNITY_SAMPLES.length);
  });
  it('editing stale content preserves newer comments/reactions and draft deletion keeps the published post', () => {
    const { repository } = setup();
    const { id, data } = repository.publish(input());
    const stale = data.posts[0];
    repository.comment(id, '새로 달린 댓글');
    repository.toggle(id, 'liked');
    const changed = repository.publish({ ...stale, title: '수정 제목' }, id).data.posts[0];
    expect(changed.comments).toHaveLength(1);
    expect(changed.liked).toBe(true);
    repository.saveDraft(input(), id);
    const after = repository.removeDraft(id);
    expect(after.drafts[id]).toBeUndefined();
    expect(after.posts.find((post) => post.id === id)?.title).toBe('수정 제목');
  });
});
