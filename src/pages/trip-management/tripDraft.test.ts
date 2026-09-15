import { describe, expect, it } from 'vitest';
import { durationLabel, validateTripDraft, type TripDraft } from '.';

const valid: TripDraft = {
  title: '부산 산책',
  region: '부산광역시',
  startDate: '2026-10-01',
  endDate: '2026-10-03',
};

describe('trip draft validation', () => {
  it('requires all fields and prevents a reversed range', () => {
    expect(validateTripDraft({ ...valid, title: '' })).toContain('모두 입력');
    expect(validateTripDraft({ ...valid, endDate: '2026-09-30' })).toContain('빠를 수 없습니다');
  });

  it('enforces the backend 30-day boundary in the frontend form', () => {
    expect(validateTripDraft({ ...valid, endDate: '2026-10-30' })).toBe('');
    expect(validateTripDraft({ ...valid, endDate: '2026-10-31' })).toContain('최대 30일');
  });

  it('describes an inclusive date range without implying persistence', () => {
    expect(durationLabel(valid.startDate, valid.endDate)).toBe('3일 · 2박');
    expect(durationLabel('', '')).toBe('날짜를 선택해 주세요');
  });
});
