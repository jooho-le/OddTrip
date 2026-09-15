import type { BlockedUser } from '../../../types';
import { apiRequest } from '../../../shared/api/client';

export const safetyService = {
  getBlocks() {
    return apiRequest<BlockedUser[]>({ url: '/api/me/blocks' });
  },
  unblock(userId: string) {
    return apiRequest({ url: `/api/users/${userId}/block`, method: 'DELETE' });
  },
};
