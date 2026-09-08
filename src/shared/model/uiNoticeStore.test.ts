import { beforeEach, describe, expect, it } from 'vitest';
import { useUiNoticeStore } from './uiNoticeStore';

describe('uiNoticeStore', () => {
  beforeEach(() => {
    useUiNoticeStore.setState({ notice: undefined });
  });

  it('uses the agreed coming-soon message without app notification state', () => {
    useUiNoticeStore.getState().showComingSoon('일정 승인');
    expect(useUiNoticeStore.getState().notice).toMatchObject({
      kind: 'coming-soon',
      title: '현재 준비 중인 기능입니다.',
    });
  });

  it('shows the same demo disclosure once per browser session', () => {
    useUiNoticeStore.getState().showDemoOnce('test-demo-notice', '첫 안내');
    expect(useUiNoticeStore.getState().notice?.message).toBe('첫 안내');

    useUiNoticeStore.getState().close();
    useUiNoticeStore.getState().showDemoOnce('test-demo-notice', '두 번째 안내');
    expect(useUiNoticeStore.getState().notice).toBeUndefined();
  });
});
