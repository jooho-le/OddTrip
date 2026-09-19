import { create } from 'zustand';
import type { ChatMessage, ChatReportReason, ChatRoom } from '../../../types';
import { buildChatSocketUrl, chatService, type ChatSocketEvent } from '../api/chatService';
import { useNotificationStore } from '../../notification/model/notificationStore';

type Status = 'idle' | 'loading' | 'success' | 'error';
export type LocalChatMessage = ChatMessage & { pending?: boolean };

interface ChatState {
  rooms: ChatRoom[];
  roomsStatus: Status;
  roomsNextBefore?: string | null;
  messagesByRoom: Record<string, LocalChatMessage[]>;
  messagesNextBefore: Record<string, number | null | undefined>;
  messagesStatus: Record<string, Status>;
  counterpartRead: Record<string, number>;
  unreadTotal: number;
  activeRoomId?: string;
  error?: string;
  socket: WebSocket | null;
  socketRefCount: number;
  socketStatus: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline';

  loadRooms: (status?: 'active' | 'closed', options?: { more?: boolean }) => Promise<void>;
  loadRoom: (roomId: string) => Promise<ChatRoom | undefined>;
  loadMessages: (roomId: string, options?: { more?: boolean }) => Promise<void>;
  sendMessage: (roomId: string, content: string) => Promise<void>;
  deleteMessage: (roomId: string, messageId: string) => Promise<void>;
  reportMessage: (roomId: string, messageId: string, reason: ChatReportReason, details?: string) => Promise<boolean>;
  markRead: (roomId: string) => Promise<void>;
  hideRoom: (roomId: string) => Promise<void>;
  loadUnreadCount: () => Promise<void>;
  setActiveRoom: (roomId: string | undefined) => void;
  clearError: () => void;
  connectSocket: () => void;
  disconnectSocket: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  rooms: [],
  roomsStatus: 'idle',
  messagesByRoom: {},
  messagesNextBefore: {},
  messagesStatus: {},
  counterpartRead: {},
  unreadTotal: 0,
  socket: null,
  socketRefCount: 0,
  socketStatus: 'idle',

  async loadRooms(status, options = {}) {
    const { more = false } = options;
    const before = more ? get().roomsNextBefore ?? undefined : undefined;
    set({ roomsStatus: 'loading', error: undefined });
    try {
      const response = await chatService.getRooms({ status, before, limit: 30 });
      set((state) => ({
        rooms: more ? [...state.rooms, ...response.data.items] : response.data.items,
        roomsNextBefore: response.data.nextBefore,
        roomsStatus: 'success',
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '채팅방 목록을 불러오지 못했습니다.', roomsStatus: 'error' });
    }
  },

  async loadRoom(roomId) {
    try {
      const response = await chatService.getRoom(roomId);
      set((state) => ({
        rooms: upsertRoom(state.rooms, response.data),
        counterpartRead: {
          ...state.counterpartRead,
          [roomId]: response.data.counterpartLastReadSequence,
        },
      }));
      return response.data;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '채팅방 정보를 불러오지 못했습니다.' });
      return undefined;
    }
  },

  async loadMessages(roomId, options = {}) {
    const { more = false } = options;
    const current = get();
    if (current.messagesStatus[roomId] === 'loading') return;

    set((state) => ({ messagesStatus: { ...state.messagesStatus, [roomId]: 'loading' } }));
    try {
      const beforeSequence = more ? current.messagesNextBefore[roomId] ?? undefined : undefined;
      const response = await chatService.getMessages(roomId, { beforeSequence: beforeSequence ?? undefined, limit: 30 });
      // The API contract already returns messages in ascending sequence order.
      const incoming = response.data.items;
      set((state) => ({
        messagesByRoom: {
          ...state.messagesByRoom,
          [roomId]: more ? [...incoming, ...(state.messagesByRoom[roomId] ?? [])] : incoming,
        },
        messagesNextBefore: { ...state.messagesNextBefore, [roomId]: response.data.nextBeforeSequence },
        messagesStatus: { ...state.messagesStatus, [roomId]: 'success' },
      }));
    } catch (error) {
      set((state) => ({
        error: error instanceof Error ? error.message : '메시지를 불러오지 못했습니다.',
        messagesStatus: { ...state.messagesStatus, [roomId]: 'error' },
      }));
    }
  },

  async sendMessage(roomId, content) {
    const trimmed = content.trim();
    if (!trimmed) return;

    const clientMessageId = crypto.randomUUID();
    const optimistic: LocalChatMessage = {
      id: `temp-${clientMessageId}`,
      roomId,
      sequence: Number.MAX_SAFE_INTEGER,
      clientMessageId,
      type: 'text',
      content: trimmed,
      createdAt: new Date().toISOString(),
      deleted: false,
      pending: true,
    };
    set((state) => ({
      messagesByRoom: { ...state.messagesByRoom, [roomId]: [...(state.messagesByRoom[roomId] ?? []), optimistic] },
    }));

    try {
      const response = await chatService.sendMessage(roomId, { clientMessageId, content: trimmed });
      set((state) => ({
        messagesByRoom: {
          ...state.messagesByRoom,
          [roomId]: replaceOptimistic(state.messagesByRoom[roomId] ?? [], clientMessageId, response.data),
        },
        rooms: bumpLastMessage(state.rooms, roomId, response.data),
      }));
    } catch (error) {
      set((state) => ({
        error: error instanceof Error ? error.message : '메시지를 보내지 못했습니다.',
        messagesByRoom: {
          ...state.messagesByRoom,
          [roomId]: (state.messagesByRoom[roomId] ?? []).filter((message) => message.clientMessageId !== clientMessageId),
        },
      }));
    }
  },

  async deleteMessage(roomId, messageId) {
    try {
      const response = await chatService.deleteMessage(roomId, messageId);
      set((state) => ({
        messagesByRoom: {
          ...state.messagesByRoom,
          [roomId]: (state.messagesByRoom[roomId] ?? []).map((message) => (message.id === messageId ? { ...message, ...response.data } : message)),
        },
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '메시지를 삭제하지 못했습니다.' });
    }
  },

  async reportMessage(roomId, messageId, reason, details) {
    try {
      await chatService.reportMessage(roomId, messageId, { reason, details });
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '신고를 접수하지 못했습니다.' });
      return false;
    }
  },

  async markRead(roomId) {
    const messages = get().messagesByRoom[roomId] ?? [];
    const lastSequence = [...messages].reverse().find((message) => message.sequence < Number.MAX_SAFE_INTEGER)?.sequence;
    const room = get().rooms.find((item) => item.id === roomId);
    const target = lastSequence ?? room?.lastMessage?.sequence;
    if (target === undefined) return;

    try {
      await chatService.markRead(roomId, target);
      set((state) => ({
        rooms: state.rooms.map((item) => (item.id === roomId ? { ...item, unreadCount: 0 } : item)),
        unreadTotal: Math.max(0, state.unreadTotal - (room?.unreadCount ?? 0)),
      }));
    } catch {
      // Best-effort: an unread badge lingering a bit longer isn't worth surfacing an error toast for.
    }
  },

  async hideRoom(roomId) {
    try {
      await chatService.hideRoom(roomId);
      set((state) => ({ rooms: state.rooms.filter((item) => item.id !== roomId) }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '채팅방을 숨기지 못했습니다.' });
    }
  },

  async loadUnreadCount() {
    try {
      const response = await chatService.getUnreadCount();
      set({ unreadTotal: response.data.count });
    } catch {
      // Silent: the badge just won't update this cycle.
    }
  },

  setActiveRoom(roomId) {
    set({ activeRoomId: roomId });
  },

  clearError() {
    set({ error: undefined });
  },

  connectSocket() {
    const state = get();
    set({ socketRefCount: state.socketRefCount + 1 });
    if (state.socket) return;
    openChatSocket(set, get);
  },

  disconnectSocket() {
    const nextCount = Math.max(0, get().socketRefCount - 1);
    set({ socketRefCount: nextCount });
    if (nextCount === 0) {
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
      reconnectAttempt = 0;
      get().socket?.close();
      set({ socket: null, socketStatus: 'idle' });
    }
  },
}));

let reconnectTimer: number | undefined;
let reconnectAttempt = 0;

function openChatSocket(
  set: (partial: Partial<ChatState> | ((state: ChatState) => Partial<ChatState>)) => void,
  get: () => ChatState,
) {
  if (get().socket || get().socketRefCount <= 0) return;
  const url = buildChatSocketUrl();
  if (!url) {
    set({ socketStatus: 'offline' });
    return;
  }

  set({ socketStatus: reconnectAttempt ? 'reconnecting' : 'connecting' });
  const socket = new WebSocket(url);
  set({ socket });

  socket.onopen = () => {
    reconnectAttempt = 0;
    set((current) => current.socket === socket ? { socketStatus: 'connected' } : {});
  };
  socket.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data) as ChatSocketEvent;
      handleSocketEvent(parsed, set, get);
    } catch {
      // Ignore malformed frames rather than crashing the socket handler.
    }
  };
  socket.onerror = () => {
    set((current) => current.socket === socket ? { socketStatus: 'offline' } : {});
  };
  socket.onclose = () => {
    if (get().socket !== socket) return;
    set({ socket: null });
    if (get().socketRefCount <= 0) {
      set({ socketStatus: 'idle' });
      return;
    }
    scheduleReconnect(set, get);
  };
}

function scheduleReconnect(
  set: (partial: Partial<ChatState> | ((state: ChatState) => Partial<ChatState>)) => void,
  get: () => ChatState,
) {
  if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
  reconnectAttempt += 1;
  const delay = Math.min(1_000 * 2 ** (reconnectAttempt - 1), 15_000);
  set({ socketStatus: 'reconnecting' });
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = undefined;
    openChatSocket(set, get);
  }, delay);
}

function handleSocketEvent(
  event: ChatSocketEvent,
  set: (partial: Partial<ChatState> | ((state: ChatState) => Partial<ChatState>)) => void,
  get: () => ChatState,
) {
  if (event.event === 'message.created' || event.event === 'system.created') {
    const message = event.data;
    const state = get();
    const isActive = state.activeRoomId === message.roomId;
    set((current) => ({
      messagesByRoom: current.messagesByRoom[message.roomId]
        ? {
            ...current.messagesByRoom,
            [message.roomId]: appendIfNew(current.messagesByRoom[message.roomId], message),
          }
        : current.messagesByRoom,
      rooms: bumpLastMessage(current.rooms, message.roomId, message, !isActive),
      unreadTotal: isActive ? current.unreadTotal : current.unreadTotal + 1,
    }));
    if (isActive) void get().markRead(message.roomId);
    return;
  }

  if (event.event === 'message.deleted') {
    const message = event.data;
    set((current) => ({
      messagesByRoom: current.messagesByRoom[message.roomId]
        ? {
            ...current.messagesByRoom,
            [message.roomId]: current.messagesByRoom[message.roomId].map((item) => (item.id === message.id ? { ...item, ...message } : item)),
          }
        : current.messagesByRoom,
    }));
    return;
  }

  if (event.event === 'room.read') {
    const { roomId, lastReadSequence, userId } = event.data;
    set((current) => (current.rooms.some((room) => room.id === roomId && room.counterpart.id === userId)
      ? { counterpartRead: { ...current.counterpartRead, [roomId]: lastReadSequence } }
      : {}));
    return;
  }

  if (event.event === 'chat.room_created') {
    void get().loadRooms();
    return;
  }

  if (event.event === 'room.closed') {
    const { roomId } = event.data;
    set((current) => ({ rooms: current.rooms.map((room) => (room.id === roomId ? { ...room, status: 'closed' } : room)) }));
    if (get().activeRoomId === roomId) void get().loadMessages(roomId);
    return;
  }

  if (event.event === 'match.ended') {
    const { matchId, roomId } = event.data;
    set((current) => ({ rooms: current.rooms.map((room) => (room.matchId === matchId ? { ...room, status: 'closed' } : room)) }));
    const closedRoomId = roomId ?? get().rooms.find((room) => room.matchId === matchId)?.id;
    if (closedRoomId && get().activeRoomId === closedRoomId) void get().loadMessages(closedRoomId);
    return;
  }

  if (event.event === 'user.blocked') {
    const { matchId } = event.data;
    set((current) => ({ rooms: current.rooms.map((room) => (room.matchId === matchId ? { ...room, status: 'closed' } : room)) }));
  }

  // Notifications ride the chat socket rather than opening a second one. The
  // row is already durable server-side, so a dropped frame only costs
  // immediacy: the tray still shows it on the next poll.
  if (event.event === 'notification.created') {
    useNotificationStore.getState().receive(event.data);
  }
}

function upsertRoom(rooms: ChatRoom[], room: ChatRoom) {
  const exists = rooms.some((item) => item.id === room.id);
  return exists ? rooms.map((item) => (item.id === room.id ? room : item)) : [room, ...rooms];
}

function bumpLastMessage(rooms: ChatRoom[], roomId: string, message: ChatMessage, incrementUnread = false) {
  return rooms.map((room) =>
    room.id === roomId
      ? { ...room, lastMessage: message, updatedAt: message.createdAt, unreadCount: incrementUnread ? room.unreadCount + 1 : room.unreadCount }
      : room,
  );
}

function appendIfNew(messages: LocalChatMessage[], message: ChatMessage) {
  if (messages.some((item) => item.clientMessageId === message.clientMessageId)) {
    return messages.map((item) => (item.clientMessageId === message.clientMessageId ? message : item));
  }
  return [...messages, message];
}

function replaceOptimistic(messages: LocalChatMessage[], clientMessageId: string, confirmed: ChatMessage) {
  return messages.map((item) => (item.clientMessageId === clientMessageId ? confirmed : item));
}
