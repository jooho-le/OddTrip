import type {
  ChatMessage,
  ChatMessagePage,
  ChatReportReason,
  ChatRoom,
  ChatRoomPage,
} from '../../../types';
import { apiRequest, SESSION_KEYS, API_BASE_URL } from '../../../shared/api/client';
import type { AppNotification } from '../../notification/api/notificationService';

export const chatService = {
  getRooms(params: { status?: 'active' | 'closed'; before?: string; limit?: number } = {}) {
    return apiRequest<ChatRoomPage>({ url: '/api/chat/rooms', method: 'GET', params });
  },

  getRoom(roomId: string) {
    return apiRequest<ChatRoom>({ url: `/api/chat/rooms/${roomId}`, method: 'GET' });
  },

  getMessages(roomId: string, params: { beforeSequence?: number; limit?: number } = {}) {
    return apiRequest<ChatMessagePage>({ url: `/api/chat/rooms/${roomId}/messages`, method: 'GET', params });
  },

  sendMessage(roomId: string, body: { clientMessageId: string; content: string; type?: 'text' }) {
    return apiRequest<ChatMessage>({
      url: `/api/chat/rooms/${roomId}/messages`,
      method: 'POST',
      data: { type: 'text', ...body },
    });
  },

  deleteMessage(roomId: string, messageId: string) {
    return apiRequest<ChatMessage>({ url: `/api/chat/rooms/${roomId}/messages/${messageId}`, method: 'DELETE' });
  },

  reportMessage(roomId: string, messageId: string, body: { reason: ChatReportReason; details?: string }) {
    return apiRequest<{ id: string; status: string }>({
      url: `/api/chat/rooms/${roomId}/messages/${messageId}/reports`,
      method: 'POST',
      data: body,
    });
  },

  markRead(roomId: string, lastReadSequence: number) {
    return apiRequest<{ roomId: string; userId: string; lastReadSequence: number }>({
      url: `/api/chat/rooms/${roomId}/read`,
      method: 'PUT',
      data: { lastReadSequence },
    });
  },

  getUnreadCount() {
    return apiRequest<{ count: number }>({ url: '/api/chat/unread-count', method: 'GET' });
  },

  hideRoom(roomId: string) {
    return apiRequest<{ roomId: string; hiddenAt: string }>({ url: `/api/chat/rooms/${roomId}`, method: 'DELETE' });
  },

  getOrCreateRoomForMatch(matchId: string) {
    return apiRequest<ChatRoom>({ url: `/api/matches/${matchId}/chat-room`, method: 'POST' });
  },

  blockCounterpart(userId: string) {
    return apiRequest<{ id: string; status: string }>({ url: `/api/users/${userId}/block`, method: 'POST' });
  },
};

export function buildChatSocketUrl(): string | null {
  const token = localStorage.getItem(SESSION_KEYS.accessToken);
  if (!token) return null;
  const wsBase = API_BASE_URL.replace(/^http/, 'ws');
  return `${wsBase}/api/chat/ws?token=${encodeURIComponent(token)}`;
}

export type ChatSocketEvent =
  | { event: 'message.created'; data: ChatMessage }
  | { event: 'message.deleted'; data: ChatMessage }
  | { event: 'system.created'; data: ChatMessage }
  | { event: 'room.read'; data: { roomId: string; userId: string; lastReadSequence: number } }
  | { event: 'chat.room_created'; data: { requestId: string; matchId: string; roomId: string; tripId: string; userIds: string[] } }
  | { event: 'room.closed'; data: { roomId: string; closedAt?: string } }
  | { event: 'match.ended'; data: { matchId: string; roomId: string | null; status: string; endedAt: string } }
  | { event: 'user.blocked'; data: { matchId: string } }
  | { event: 'notification.created'; data: AppNotification }
  | { event: 'pong'; data?: undefined };
