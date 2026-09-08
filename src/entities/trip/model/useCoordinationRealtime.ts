import { useEffect, useRef } from 'react';
import { API_BASE_URL, SESSION_KEYS } from '../../../shared/api/client';

const COORDINATION_EVENTS = new Set([
  'preference.updated',
  'preference.proposal_created',
  'preference.proposal_responded',
]);

export function useCoordinationRealtime(tripId: string | undefined, refresh: () => Promise<void>) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    const token = localStorage.getItem(SESSION_KEYS.accessToken);
    if (!tripId || !token) return;

    let socket: WebSocket | undefined;
    let reconnectTimer: number | undefined;
    let stopped = false;
    let attempt = 0;

    const connect = () => {
      const wsBase = API_BASE_URL.replace(/^http/, 'ws');
      socket = new WebSocket(`${wsBase}/api/chat/ws?token=${encodeURIComponent(token)}`);
      socket.onopen = () => { attempt = 0; };
      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as { event?: string; data?: { tripId?: string } };
          if (event.event && COORDINATION_EVENTS.has(event.event) && event.data?.tripId === tripId) {
            void refreshRef.current();
          }
        } catch {
          // Ignore frames that do not follow the API event envelope.
        }
      };
      socket.onclose = () => {
        if (stopped) return;
        attempt += 1;
        reconnectTimer = window.setTimeout(connect, Math.min(1000 * 2 ** (attempt - 1), 15000));
      };
    };

    connect();
    return () => {
      stopped = true;
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [tripId]);
}
