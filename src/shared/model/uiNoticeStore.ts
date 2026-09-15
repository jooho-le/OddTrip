import { create } from 'zustand';

export type UiNoticeKind = 'demo' | 'coming-soon' | 'info';

export type UiNotice = {
  kind: UiNoticeKind;
  title: string;
  message: string;
};

type UiNoticeState = {
  notice?: UiNotice;
  showDemoOnce: (key: string, message: string) => void;
  showComingSoon: (feature: string, detail?: string) => void;
  showInfo: (title: string, message: string) => void;
  close: () => void;
};

const seenDemoNotices = new Set<string>();
const sessionKey = (key: string) => 'oddtrip.ui-notice.' + key;

export const useUiNoticeStore = create<UiNoticeState>((set) => ({
  notice: undefined,
  showDemoOnce(key, message) {
    const alreadySeen = seenDemoNotices.has(key)
      || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(sessionKey(key)) === '1');
    if (alreadySeen) return;
    seenDemoNotices.add(key);
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(sessionKey(key), '1');
    set({ notice: { kind: 'demo', title: '체험 화면 안내', message } });
  },
  showComingSoon(feature, detail) {
    set({
      notice: {
        kind: 'coming-soon',
        title: '현재 준비 중인 기능입니다.',
        message: detail ?? `${feature} 관련 화면과 동작을 준비하고 있습니다. 준비가 끝나면 이곳에서 바로 이용할 수 있습니다.`,
      },
    });
  },
  showInfo(title, message) {
    set({ notice: { kind: 'info', title, message } });
  },
  close() {
    set({ notice: undefined });
  },
}));
