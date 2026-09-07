import type { MatchAcceptResult, MatchRequest, MatchRequestCreate, MatchRequestStatus } from '../../../types';
import { apiRequest } from '../../../shared/api/client';

export const matchRequestService = {
  create(input: MatchRequestCreate) {
    return apiRequest<MatchRequest>({
      url: '/api/match-requests',
      method: 'POST',
      data: input,
    });
  },

  listReceived(status?: MatchRequestStatus) {
    return apiRequest<MatchRequest[]>({
      url: '/api/match-requests/received',
      method: 'GET',
      params: status ? { status, limit: 100 } : { limit: 100 },
    });
  },

  listSent(status?: MatchRequestStatus) {
    return apiRequest<MatchRequest[]>({
      url: '/api/match-requests/sent',
      method: 'GET',
      params: status ? { status, limit: 100 } : { limit: 100 },
    });
  },

  get(requestId: string) {
    return apiRequest<MatchRequest>({ url: `/api/match-requests/${requestId}`, method: 'GET' });
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

  endMatch(matchId: string) {
    return apiRequest<{ matchId: string; roomId?: string | null; status: 'ended'; endedAt: string }>({
      url: `/api/matches/${matchId}/end`,
      method: 'POST',
    });
  },

  hideMatch(matchId: string) {
    return apiRequest<{ matchId: string; hiddenAt: string }>({
      url: `/api/me/matches/${matchId}`,
      method: 'DELETE',
    });
  },
};
