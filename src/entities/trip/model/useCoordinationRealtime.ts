import { useEffect, useRef } from 'react';
import { subscribeRealtime } from '../../../shared/realtime/socketBus';

const COORDINATION_EVENTS = new Set([
  'preference.updated',
  'preference.proposal_created',
  'preference.proposal_responded',
]);

export function useCoordinationRealtime(tripId: string | undefined, refresh: () => Promise<void>) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!tripId) return;
    return subscribeRealtime((event) => {
      const data = event.data as { tripId?: string } | undefined;
      if (COORDINATION_EVENTS.has(event.event) && data?.tripId === tripId) void refreshRef.current();
    });
  }, [tripId]);
}
