import { apiRequest } from '../../../shared/api/client';

export type LocationShare = {
  id: string;
  tripId: string | null;
  token: string;
  displayName: string;
  expiresAt: string;
  createdAt: string;
  viewCount: number;
  lastViewedAt: string | null;
  lastPositionAt: string | null;
};

/** 링크를 받은 사람이 보는 값. 위치 말고는 아무것도 들어 있지 않다. */
export type LocationView = {
  displayName: string;
  status: 'live' | 'stale' | 'lost' | 'waiting' | 'ended';
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  updatedAt: string | null;
  expiresAt: string | null;
};

const BASE = '/api/me/location-share';

export const locationShareService = {
  async getActive(): Promise<{ share: LocationShare | null; durationChoices: number[] }> {
    const response = await apiRequest<any>({ url: BASE, method: 'GET' });
    return {
      share: response.data?.share ?? null,
      durationChoices: response.data?.durationChoices ?? [6, 24, 72],
    };
  },

  async start(durationHours: number, tripId?: string | null): Promise<LocationShare> {
    const response = await apiRequest<LocationShare>({
      url: BASE,
      method: 'POST',
      // 동의 없이는 서버가 시작하지 않는다. 화면의 확인 절차와 짝이다.
      data: { durationHours, consent: true, ...(tripId ? { tripId } : {}) },
    });
    return response.data;
  },

  async extend(shareId: string, durationHours: number): Promise<LocationShare> {
    const response = await apiRequest<LocationShare>({
      url: `${BASE}/${encodeURIComponent(shareId)}/extend`,
      method: 'POST',
      data: { durationHours },
    });
    return response.data;
  },

  async ping(shareId: string, position: { latitude: number; longitude: number; accuracy?: number | null }): Promise<LocationShare> {
    const response = await apiRequest<LocationShare>({
      url: `${BASE}/${encodeURIComponent(shareId)}/ping`,
      method: 'POST',
      data: position,
    });
    return response.data;
  },

  async stop(shareId: string): Promise<void> {
    await apiRequest<unknown>({ url: `${BASE}/${encodeURIComponent(shareId)}`, method: 'DELETE' });
  },

  /** 공개 조회. 로그인하지 않은 사람이 부른다. */
  async view(token: string): Promise<LocationView> {
    const response = await apiRequest<LocationView>({
      url: `/api/share/${encodeURIComponent(token)}`,
      method: 'GET',
    });
    return response.data;
  },
};

/** 받는 사람에게 보낼 주소. 서버는 배포 주소를 모르므로 화면에서 만든다. */
export function shareUrl(token: string) {
  return `${window.location.origin}/s/${token}`;
}
