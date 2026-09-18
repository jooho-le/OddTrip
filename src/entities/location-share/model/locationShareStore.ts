import { create } from 'zustand';
import { ApiError } from '../../../shared/api/client';
import { locationShareService, type LocationShare } from '../api/locationShareService';

/** 좌표를 올리는 주기. 걷는 속도에서 20초면 충분하고, 배터리도 덜 먹는다. */
const PING_INTERVAL = 20_000;

type Permission = 'unknown' | 'granted' | 'denied' | 'unavailable';

type LocationShareState = {
  share: LocationShare | null;
  durationChoices: number[];
  loading: boolean;
  busy: boolean;
  error: string;
  permission: Permission;
  lastSentAt: string | null;
  load: () => Promise<void>;
  start: (durationHours: number, tripId?: string | null) => Promise<boolean>;
  extend: (durationHours: number) => Promise<boolean>;
  stop: () => Promise<void>;
};

// 위치 수집은 화면이 아니라 여기에 붙어 있다. 탭을 벗어나거나 다른 메뉴로
// 이동해도 공유가 끊기면 안 되기 때문이다. 페이지를 완전히 닫으면 멈춘다.
let watchId: number | null = null;
let timer: number | null = null;
let latest: GeolocationPosition | null = null;
let onVisible: (() => void) | null = null;

function message(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function stopBroadcast() {
  if (watchId !== null) navigator.geolocation?.clearWatch(watchId);
  if (timer !== null) window.clearInterval(timer);
  if (onVisible) document.removeEventListener('visibilitychange', onVisible);
  watchId = null;
  timer = null;
  onVisible = null;
  latest = null;
}

function beginBroadcast(shareId: string, set: (partial: Partial<LocationShareState>) => void, reload: () => Promise<void>) {
  stopBroadcast();
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    set({ permission: 'unavailable' });
    return;
  }

  const send = async () => {
    if (!latest) return;
    try {
      await locationShareService.ping(shareId, {
        latitude: latest.coords.latitude,
        longitude: latest.coords.longitude,
        accuracy: latest.coords.accuracy,
      });
      set({ lastSentAt: new Date().toISOString() });
    } catch (error) {
      // 만료되었거나 다른 기기에서 껐다. 계속 보내 봐야 소용없으므로 멈추고
      // 서버 상태를 다시 읽는다.
      if (error instanceof ApiError && (error.status === 409 || error.status === 404)) {
        stopBroadcast();
        void reload();
      }
    }
  };

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const first = latest === null;
      latest = position;
      set({ permission: 'granted' });
      // 첫 좌표는 기다리지 않고 바로 올린다. 링크를 먼저 보낸 상대가 빈 지도를
      // 오래 보고 있지 않도록.
      if (first) void send();
    },
    (error) => set({ permission: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable' }),
    { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
  );
  timer = window.setInterval(() => void send(), PING_INTERVAL);
  // 다른 앱을 보다가 돌아온 순간을 잡는다. 모바일은 화면을 벗어나면 타이머가
  // 멈추므로, 돌아왔을 때 다음 주기를 기다리지 않고 바로 한 번 올린다.
  onVisible = () => { if (document.visibilityState === 'visible') void send(); };
  document.addEventListener('visibilitychange', onVisible);
}

export const useLocationShareStore = create<LocationShareState>((set, get) => ({
  share: null,
  durationChoices: [6, 24, 72],
  loading: false,
  busy: false,
  error: '',
  permission: 'unknown',
  lastSentAt: null,

  async load() {
    set({ loading: true, error: '' });
    try {
      const { share, durationChoices } = await locationShareService.getActive();
      set({ share, durationChoices, loading: false });
      if (share) beginBroadcast(share.id, set, () => get().load());
      else stopBroadcast();
    } catch (error) {
      set({ loading: false, error: message(error, '위치 공유 상태를 불러오지 못했습니다.') });
    }
  },

  async start(durationHours, tripId) {
    set({ busy: true, error: '' });
    try {
      const share = await locationShareService.start(durationHours, tripId);
      set({ share, busy: false, lastSentAt: null });
      beginBroadcast(share.id, set, () => get().load());
      return true;
    } catch (error) {
      set({ busy: false, error: message(error, '위치 공유를 시작하지 못했습니다.') });
      return false;
    }
  },

  async extend(durationHours) {
    const current = get().share;
    if (!current) return false;
    set({ busy: true, error: '' });
    try {
      set({ share: await locationShareService.extend(current.id, durationHours), busy: false });
      return true;
    } catch (error) {
      set({ busy: false, error: message(error, '공유 시간을 연장하지 못했습니다.') });
      return false;
    }
  },

  async stop() {
    const current = get().share;
    if (!current) return;
    set({ busy: true, error: '' });
    try {
      await locationShareService.stop(current.id);
      stopBroadcast();
      set({ share: null, busy: false, lastSentAt: null });
    } catch (error) {
      set({ busy: false, error: message(error, '위치 공유를 끄지 못했습니다.') });
    }
  },
}));

/** 로그아웃·세션 만료에서 부른다. 공유 상태만 비우고 서버 링크는 그대로 둔다. */
export function resetLocationShare() {
  stopBroadcast();
  useLocationShareStore.setState({ share: null, lastSentAt: null, error: '', permission: 'unknown' });
}
