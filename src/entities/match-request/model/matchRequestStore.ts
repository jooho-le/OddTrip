import { create } from 'zustand';
import type { MatchAcceptResult, MatchRequest, MatchRequestCreate } from '../../../types';
import { matchRequestService } from '../api/matchRequestService';

type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

interface MatchRequestState {
  received: MatchRequest[];
  sent: MatchRequest[];
  status: RequestStatus;
  actionId?: string;
  error?: string;
  load: () => Promise<void>;
  create: (input: MatchRequestCreate) => Promise<MatchRequest | undefined>;
  accept: (requestId: string) => Promise<MatchAcceptResult | undefined>;
  reject: (requestId: string) => Promise<boolean>;
  cancel: (requestId: string) => Promise<boolean>;
  clearError: () => void;
}

export const useMatchRequestStore = create<MatchRequestState>((set, get) => ({
  received: [],
  sent: [],
  status: 'idle',

  async load() {
    set({ status: 'loading', error: undefined });
    try {
      const [received, sent] = await Promise.all([
        matchRequestService.listReceived(),
        matchRequestService.listSent(),
      ]);
      set({ received: received.data, sent: sent.data, status: 'success' });
    } catch (error) {
      set({ status: 'error', error: messageOf(error, '매칭 요청을 불러오지 못했습니다.') });
    }
  },

  async create(input) {
    set({ actionId: input.receiverId, error: undefined });
    try {
      const response = await matchRequestService.create(input);
      set((state) => ({ sent: [response.data, ...state.sent], actionId: undefined }));
      return response.data;
    } catch (error) {
      set({ actionId: undefined, error: messageOf(error, '동행 요청을 보내지 못했습니다.') });
      return undefined;
    }
  },

  async accept(requestId) {
    set({ actionId: requestId, error: undefined });
    try {
      const response = await matchRequestService.accept(requestId);
      set((state) => ({
        received: state.received.map((request) => request.id === requestId ? { ...request, status: 'accepted' } : request),
        actionId: undefined,
      }));
      return response.data;
    } catch (error) {
      set({ actionId: undefined, error: messageOf(error, '동행 요청을 수락하지 못했습니다.') });
      return undefined;
    }
  },

  async reject(requestId) {
    set({ actionId: requestId, error: undefined });
    try {
      const response = await matchRequestService.reject(requestId);
      set((state) => ({
        received: state.received.map((request) => request.id === requestId ? response.data : request),
        actionId: undefined,
      }));
      return true;
    } catch (error) {
      set({ actionId: undefined, error: messageOf(error, '동행 요청을 거절하지 못했습니다.') });
      return false;
    }
  },

  async cancel(requestId) {
    set({ actionId: requestId, error: undefined });
    try {
      const response = await matchRequestService.cancel(requestId);
      set((state) => ({
        sent: state.sent.map((request) => request.id === requestId ? response.data : request),
        actionId: undefined,
      }));
      return true;
    } catch (error) {
      set({ actionId: undefined, error: messageOf(error, '동행 요청을 취소하지 못했습니다.') });
      return false;
    }
  },

  clearError() {
    if (get().error) set({ error: undefined });
  },
}));

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
