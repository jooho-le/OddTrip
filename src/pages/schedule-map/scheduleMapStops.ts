import type { ItineraryDay, ItineraryItem } from '../../types';

export type ScheduleMapStop = ItineraryItem & { day: number };

export function collectScheduleMapStops(itinerary: ItineraryDay[]): ScheduleMapStop[] {
  return itinerary.flatMap((day) => day.items
    .filter((item) => Boolean(item.placeId) || hasCoordinates(item))
    .map((item) => ({ ...item, day: day.day })));
}

function hasCoordinates(item: ItineraryItem) {
  return item.latitude != null && item.longitude != null;
}
