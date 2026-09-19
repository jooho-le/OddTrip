import { useEffect, useRef } from 'react';
import { subscribeRealtime } from '../../../shared/realtime/socketBus';

const COORDINATION_EVENTS = new Set([
  'preference.updated',
  'preference.proposal_created',
  'preference.proposal_responded',
]);
const APPROVAL_EVENTS = new Set(['itinerary.approval_updated']);
const TRIP_LIFECYCLE_EVENTS = new Set(['trip.created', 'trip.updated', 'trip.cancelled']);

export function useCoordinationRealtime(tripId: string | undefined, refresh: () => Promise<void>) {
  useTripEventRefresh(tripId, refresh, COORDINATION_EVENTS);
}

export function useApprovalRealtime(tripId: string | undefined, refresh: () => Promise<void>) {
  useTripEventRefresh(tripId, refresh, APPROVAL_EVENTS);
}

export function useTripLifecycleRealtime(tripId: string | undefined, refresh: () => Promise<void>) {
  useTripEventRefresh(tripId, refresh, TRIP_LIFECYCLE_EVENTS);
}

export function useTripListRealtime(refresh: () => Promise<void>) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => subscribeRealtime((event) => {
    if (TRIP_LIFECYCLE_EVENTS.has(event.event)) void refreshRef.current();
  }), []);
}

function useTripEventRefresh(tripId: string | undefined, refresh: () => Promise<void>, events: Set<string>) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!tripId) return;
    return subscribeRealtime((event) => {
      const data = event.data as { tripId?: string } | undefined;
      if (events.has(event.event) && data?.tripId === tripId) void refreshRef.current();
    });
  }, [tripId, events]);
}
