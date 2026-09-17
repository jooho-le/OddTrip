import { describe, expect, it } from 'vitest';
import type { ItineraryDay, ItineraryItem, ItineraryItemType } from '../../types';
import { collectScheduleMapStops } from './scheduleMapStops';

function item(id: string, type: ItineraryItemType, patch: Partial<ItineraryItem> = {}): ItineraryItem {
  return {
    id,
    day: 1,
    time: '10:00',
    type,
    title: id,
    location: '',
    duration: '60분',
    description: '',
    aiReason: '',
    ...patch,
  };
}

describe('collectScheduleMapStops', () => {
  it('includes every place-backed stop regardless of itinerary type', () => {
    const itinerary: ItineraryDay[] = [{
      day: 1,
      title: '첫째 날',
      weather: '',
      caution: '',
      items: [
        item('museum', 'place', { placeId: 'place-1', latitude: 37.5, longitude: 127 }),
        item('restaurant', 'meal', { placeId: 'place-2', latitude: 37.6, longitude: 127.1 }),
        item('lodging', 'rest', { placeId: 'place-3', latitude: 37.7, longitude: 127.2 }),
        item('move', 'move'),
        item('generic-meal', 'meal'),
      ],
    }];

    expect(collectScheduleMapStops(itinerary).map((stop) => stop.id)).toEqual([
      'museum',
      'restaurant',
      'lodging',
    ]);
  });

  it('keeps a coordinate-backed stop even when a legacy response has no place id', () => {
    const itinerary: ItineraryDay[] = [{
      day: 2,
      title: '둘째 날',
      weather: '',
      caution: '',
      items: [item('legacy-place', 'meal', { latitude: 35.1, longitude: 129.1 })],
    }];

    expect(collectScheduleMapStops(itinerary)).toHaveLength(1);
    expect(collectScheduleMapStops(itinerary)[0].day).toBe(2);
  });
});
