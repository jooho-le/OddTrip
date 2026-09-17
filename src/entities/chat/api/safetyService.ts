import type { BlockedUser, ChatReportReason } from '../../../types';
import { apiRequest } from '../../../shared/api/client';

export const safetyService = {
  getBlocks() {
    return apiRequest<BlockedUser[]>({ url: '/api/me/blocks' });
  },
  unblock(userId: string) {
    return apiRequest({ url: `/api/users/${userId}/block`, method: 'DELETE' });
  },
  reportUser(userId: string, body: { reason: ChatReportReason; details?: string }) {
    return apiRequest<{ id: string; status: string }>({
      url: `/api/users/${userId}/reports`,
      method: 'POST',
      data: body,
    });
  },
};
