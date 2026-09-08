import type { MatchAcceptResult, MatchRequest } from '../../../types';
import { API_BASE_URL, apiRequest, SESSION_KEYS } from '../../../shared/api/client';

export const matchRequestService = {
  create(input: { receiverId: string; region: string; startDate: string; endDate: string; greetingMessage: string }) {
    return apiRequest<MatchRequest>({ url: '/api/match-requests', method: 'POST', data: input });
  },
  received() {
    return apiRequest<MatchRequest[]>({ url: '/api/match-requests/received' });
  },
  sent() {
    return apiRequest<MatchRequest[]>({ url: '/api/match-requests/sent' });
  },
  accept(requestId: string) {
    return apiRequest<MatchAcceptResult>({ url: `/api/match-requests/${requestId}/accept`, method: 'POST' });
  },
  reject(requestId: string) {
    return apiRequest<MatchRequest>({ url: `/api/match-requests/${requestId}/reject`, method: 'POST' });
  },
  cancel(requestId: string) {
    return apiRequest<MatchRequest>({ url: `/api/match-requests/${requestId}/cancel`, method: 'POST' });
  },
};

export function matchRequestSocketUrl() {
  const token = localStorage.getItem(SESSION_KEYS.accessToken);
  return token ? `${API_BASE_URL.replace(/^http/, 'ws')}/api/chat/ws?token=${encodeURIComponent(token)}` : null;
}
