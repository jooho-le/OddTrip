import { describe, expect, it } from 'vitest';
import type { MatchRequest, TripSummary } from '../../types';
import { COMMUNITY_SAMPLES } from '../../features/community/communitySamples';
import { selectCommunityHomePosts, selectScheduleRequests, sortTripsByRecent } from './homeFeed';

const user = { id: 'u1', email: 'one@example.com', nickname: '하나', role: 'user' as const };
const counterpart = { id: 'u2', email: 'two@example.com', nickname: '둘', role: 'user' as const };

function request(id: string, startDate: string, endDate: string, status: MatchRequest['status'] = 'pending'): MatchRequest {
  return {
    id,
    requesterId: user.id,
    receiverId: counterpart.id,
    region: '서울',
    startDate,
    endDate,
    greetingMessage: '함께 여행해요.',
    status,
    createdAt: `${startDate}T09:00:00Z`,
    requester: user,
    receiver: counterpart,
    counterpart,
    matchLevel: '추천',
    recommendationScore: 80,
    differences: [],
    complements: [],
  };
}

function trip(tripId: string, createdAt?: string): TripSummary {
  return {
    tripId,
    matchId: `match-${tripId}`,
    status: 'planning',
    attractionCount: 0,
    savedCount: 0,
    itineraryDayCount: 0,
    createdAt,
  };
}

describe('home feed data', () => {
  it('ranks community stories by reactions for the recommended tab', () => {
    const posts = selectCommunityHomePosts(COMMUNITY_SAMPLES, 'recommended');
    expect(posts.slice(0, 3).map((item) => item.id)).toEqual(['story-1', 'story-2', 'story-3']);
  });

  it('filters community stories by the active travel region', () => {
    const posts = selectCommunityHomePosts(COMMUNITY_SAMPLES, 'region', '강릉');
    expect(posts.map((item) => item.id)).toEqual(['story-1']);
    expect(selectCommunityHomePosts(COMMUNITY_SAMPLES, 'region')).toEqual([]);
  });

  it('sorts actual trips by their latest creation date', () => {
    expect(sortTripsByRecent([
      trip('old', '2026-08-01T00:00:00Z'),
      trip('unknown'),
      trip('new', '2026-09-10T00:00:00Z'),
    ]).map((item) => item.tripId)).toEqual(['new', 'old', 'unknown']);
  });

  it('shows only active requests whose dates overlap the current trip', () => {
    const activeTrip = { ...trip('active'), startDate: '2026-09-20', endDate: '2026-09-24' };
    const visible = selectScheduleRequests(
      [request('overlap', '2026-09-18', '2026-09-21'), request('ended', '2026-09-01', '2026-09-02', 'rejected')],
      [request('outside', '2026-10-01', '2026-10-02')],
      activeTrip,
      new Date('2026-09-15T00:00:00'),
    );
    expect(visible.map(({ request: item }) => item.id)).toEqual(['overlap']);
  });

  it('falls back to upcoming requests and removes duplicate ids when the trip has no dates', () => {
    const duplicate = request('same', '2026-09-19', '2026-09-20');
    const visible = selectScheduleRequests(
      [duplicate, request('past', '2026-09-01', '2026-09-03')],
      [duplicate, request('next', '2026-09-25', '2026-09-26', 'accepted')],
      undefined,
      new Date('2026-09-15T00:00:00'),
    );
    expect(visible.map(({ request: item }) => item.id)).toEqual(['same', 'next']);
    expect(visible[0].direction).toBe('received');
  });
});
