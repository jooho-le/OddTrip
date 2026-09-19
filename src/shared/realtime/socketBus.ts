import { API_BASE_URL, SESSION_KEYS } from '../api/client';

export interface RealtimeEvent<T = Record<string, unknown>> {
  event: string;
  data?: T;
}

type Listener = (event: RealtimeEvent) => void;

const listeners = new Set<Listener>();
let socket: WebSocket | undefined;
let reconnectTimer: number | undefined;
let reconnectAttempt = 0;

export function subscribeRealtime(listener: Listener) {
  listeners.add(listener);
  connect();
  return () => {
    listeners.delete(listener);
    if (!listeners.size) close();
  };
}

function connect() {
  if (socket || !listeners.size) return;
  const token = localStorage.getItem(SESSION_KEYS.accessToken);
  if (!token) return;
  socket = new WebSocket(`${API_BASE_URL.replace(/^http/, 'ws')}/api/chat/ws?token=${encodeURIComponent(token)}`);
  socket.onopen = () => { reconnectAttempt = 0; };
  socket.onmessage = (message) => {
    try {
      const event = JSON.parse(message.data) as RealtimeEvent;
      listeners.forEach((listener) => listener(event));
    } catch { /* Ignore frames outside the event envelope. */ }
  };
  socket.onclose = () => {
    socket = undefined;
    if (!listeners.size) return;
    reconnectAttempt += 1;
    reconnectTimer = window.setTimeout(connect, Math.min(1000 * 2 ** (reconnectAttempt - 1), 15000));
  };
}

function close() {
  if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
  reconnectTimer = undefined;
  reconnectAttempt = 0;
  const current = socket;
  socket = undefined;
  current?.close();
}
