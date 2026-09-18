import { describe, expect, it } from 'vitest';
import { emptyInput, parseTags, toPostInput, validatePost } from './communityModel';

const input = () => ({ ...emptyInput(), title: '나의 첫 여행', body: '동행과 함께 걸으며 남긴 여행 기록입니다.', region: '강릉', tags: ['바다'] });

describe('community post input', () => {
  it('accepts a complete post and rejects what the server would also reject', () => {
    expect(validatePost(input())).toBeUndefined();
    expect(validatePost({ ...input(), title: '   ' })).toBe('제목을 1~80자로 작성해 주세요.');
    expect(validatePost({ ...input(), title: '가'.repeat(81) })).toBe('제목을 1~80자로 작성해 주세요.');
    expect(validatePost({ ...input(), body: '짧다' })).toBe('본문을 10~10,000자로 작성해 주세요.');
    expect(validatePost({ ...input(), region: '가'.repeat(31) })).toBe('여행 지역은 30자까지 입력할 수 있어요.');
    expect(validatePost({ ...input(), tags: ['가', '나', '다', '라', '마', '바'] })).toBe('태그는 각 20자, 최대 5개까지 입력해 주세요.');
    expect(validatePost({ ...input(), tags: ['가'.repeat(21)] })).toBe('태그는 각 20자, 최대 5개까지 입력해 주세요.');
  });

  it('parses tags from a free-form line without duplicates or hashes', () => {
    expect(parseTags('#바다, 바다 책방,, 느린여행')).toEqual(['바다', '책방', '느린여행']);
    expect(parseTags('   ')).toEqual([]);
  });

  it('copies only the editable fields, leaving the original tag array untouched', () => {
    const source = input();
    const copy = toPostInput(source);
    copy.tags.push('추가');
    expect(source.tags).toEqual(['바다']);
    expect(Object.keys(copy).sort()).toEqual(['allowComments', 'body', 'category', 'image', 'imageCaption', 'region', 'tags', 'title']);
  });
});
