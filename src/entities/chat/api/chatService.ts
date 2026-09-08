import type { ChatMessage, ChatReportReason, ChatRoom } from '../../../types';
import { apiRequest } from '../../../shared/api/client';

export const chatService = {
  listRooms(status?: 'active' | 'closed') {
    return apiRequest<{ items: ChatRoom[]; nextBefore?: string | null }>({ url: '/api/chat/rooms', params: { status, limit: 100 } });
  },
  getRoom(roomId: string) {
    return apiRequest<ChatRoom>({ url: `/api/chat/rooms/${roomId}` });
  },
  getMessages(roomId: string, beforeSequence?: number) {
    return apiRequest<{ items: ChatMessage[]; nextBeforeSequence?: number | null }>({ url: `/api/chat/rooms/${roomId}/messages`, params: { beforeSequence, limit: 50 } });
  },
  sendMessage(roomId: string, content: string) {
    return apiRequest<ChatMessage>({ url: `/api/chat/rooms/${roomId}/messages`, method: 'POST', data: { clientMessageId: crypto.randomUUID(), type: 'text', content } });
  },
  deleteMessage(roomId: string, messageId: string) {
    return apiRequest<ChatMessage>({ url: `/api/chat/rooms/${roomId}/messages/${messageId}`, method: 'DELETE' });
  },
  reportMessage(roomId: string, messageId: string, reason: ChatReportReason, details?: string) {
    return apiRequest<{ id: string }>({ url: `/api/chat/rooms/${roomId}/messages/${messageId}/reports`, method: 'POST', data: { reason, details } });
  },
  markRead(roomId: string, lastReadSequence: number) {
    return apiRequest({ url: `/api/chat/rooms/${roomId}/read`, method: 'PUT', data: { lastReadSequence } });
  },
  getUnreadCount() {
    return apiRequest<{ count: number }>({ url: '/api/chat/unread-count' });
  },
  hideRoom(roomId: string) {
    return apiRequest({ url: `/api/chat/rooms/${roomId}`, method: 'DELETE' });
  },
  endMatch(matchId: string) {
    return apiRequest({ url: `/api/matches/${matchId}/end`, method: 'POST' });
  },
  blockUser(userId: string) {
    return apiRequest({ url: `/api/users/${userId}/block`, method: 'POST' });
  },
};

export type ChatSocketEnvelope = {
  event: string;
  data?: { roomId?: string; matchId?: string; userId?: string; lastReadSequence?: number } & Partial<ChatMessage>;
};
