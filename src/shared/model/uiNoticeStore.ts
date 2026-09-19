import { create } from 'zustand';

export type UiNoticeKind = 'coming-soon' | 'info';

export type UiNotice = {
  kind: UiNoticeKind;
  title: string;
  message: string;
};

type UiNoticeState = {
  notice?: UiNotice;
  showComingSoon: (feature: string, detail?: string) => void;
  showInfo: (title: string, message: string) => void;
  close: () => void;
};

export const useUiNoticeStore = create<UiNoticeState>((set) => ({
  notice: undefined,
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
