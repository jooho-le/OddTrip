import { beforeEach, describe, expect, it } from 'vitest';
import { useNotificationStore } from '../../entities/notification/model/notificationStore';
import { useUiNoticeStore } from './uiNoticeStore';

describe('uiNoticeStore', () => {
  beforeEach(() => {
    useUiNoticeStore.setState({ notice: undefined });
    useNotificationStore.getState().reset();
  });

  it('uses the agreed coming-soon message without app notification state', () => {
    useNotificationStore.setState({ unreadCount: 2 });
    useUiNoticeStore.getState().showComingSoon('일정 승인');
    expect(useUiNoticeStore.getState().notice).toMatchObject({
      kind: 'coming-soon',
      title: '현재 준비 중인 기능입니다.',
    });
    expect(useNotificationStore.getState().unreadCount).toBe(2);
  });
});
