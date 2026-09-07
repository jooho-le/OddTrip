import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  saveSession: vi.fn(),
  clearSession: vi.fn(),
}));

vi.mock('../shared/api/client', () => ({
  API_BASE_URL: 'http://localhost:8000',
  SESSION_KEYS: {
    userId: 'oddtrip.userId',
    accessToken: 'oddtrip.authToken',
    refreshToken: 'oddtrip.refreshToken',
  },
  apiRequest: mocks.apiRequest,
  saveSession: mocks.saveSession,
  clearSession: mocks.clearSession,
}));

import { oddtripService } from '../entities/trip/api/oddtripService';
import { matchRequestService } from '../entities/match-request/api/matchRequestService';
import { chatService } from '../entities/chat/api/chatService';
import { sourceLabel } from '../shared/lib/sourceLabel';

describe('frontend API contracts', () => {
  beforeEach(() => {
    mocks.apiRequest.mockReset();
    mocks.saveSession.mockReset();
    mocks.clearSession.mockReset();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => key === 'oddtrip.authToken' ? 'access-token' : key === 'oddtrip.userId' ? 'user-1' : null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    });
    mocks.apiRequest.mockResolvedValue({ data: {} });
  });

  it('connects authentication and TTI to the current endpoints', async () => {
    const auth = { accessToken: 'a', refreshToken: 'r', tokenType: 'bearer', user: { id: 'u1', nickname: '은진' } };
    mocks.apiRequest.mockResolvedValueOnce({ data: auth }).mockResolvedValueOnce({ data: { code: 'PNFH' } });

    await oddtripService.login('user@example.com', 'password123');
    await oddtripService.calculateTtiResult([{ questionId: 'q1', axis: 'PW', value: -2 }]);

    expect(mocks.apiRequest).toHaveBeenNthCalledWith(1, expect.objectContaining({ url: '/api/auth/login', method: 'POST', data: { email: 'user@example.com', password: 'password123' } }));
    expect(mocks.saveSession).toHaveBeenCalledWith(auth);
    expect(mocks.apiRequest).toHaveBeenNthCalledWith(2, expect.objectContaining({ url: '/api/tti/calculate', method: 'POST' }));
  });

  it('uses the current match-request lifecycle and per-user history endpoints', async () => {
    mocks.apiRequest.mockResolvedValue({ data: {} });
    await matchRequestService.create({ receiverId: 'u2', region: '부산', startDate: '2026-09-20', endDate: '2026-09-22', greetingMessage: '같이 여행해요.' });
    await matchRequestService.listReceived('pending');
    await matchRequestService.listSent();
    await matchRequestService.accept('req-1');
    await matchRequestService.reject('req-2');
    await matchRequestService.cancel('req-3');
    await matchRequestService.endMatch('match-1');
    await matchRequestService.hideMatch('match-1');

    expect(mocks.apiRequest.mock.calls.map(([config]) => [config.method, config.url])).toEqual([
      ['POST', '/api/match-requests'],
      ['GET', '/api/match-requests/received'],
      ['GET', '/api/match-requests/sent'],
      ['POST', '/api/match-requests/req-1/accept'],
      ['POST', '/api/match-requests/req-2/reject'],
      ['POST', '/api/match-requests/req-3/cancel'],
      ['POST', '/api/matches/match-1/end'],
      ['DELETE', '/api/me/matches/match-1'],
    ]);
    expect('acceptMatch' in oddtripService).toBe(false);
  });

  it('uses the latest room-created websocket event contract', () => {
    const event: import('../entities/chat/api/chatService').ChatSocketEvent = {
      event: 'chat.room_created',
      data: { requestId: 'req-1', matchId: 'match-1', roomId: 'room-1', tripId: 'trip-1', userIds: ['u1', 'u2'] },
    };

    expect(event.event).toBe('chat.room_created');
    expect(event.data.userIds).toEqual(['u1', 'u2']);
  });

  it('connects room list, history, send, read, and unread APIs', async () => {
    await chatService.getRooms({ status: 'active' });
    await chatService.getMessages('room-1', { limit: 30 });
    await chatService.sendMessage('room-1', { clientMessageId: 'client-1', content: '안녕하세요' });
    await chatService.markRead('room-1', 4);
    await chatService.getUnreadCount();

    expect(mocks.apiRequest.mock.calls.map(([config]) => [config.method, config.url])).toEqual([
      ['GET', '/api/chat/rooms'],
      ['GET', '/api/chat/rooms/room-1/messages'],
      ['POST', '/api/chat/rooms/room-1/messages'],
      ['PUT', '/api/chat/rooms/room-1/read'],
      ['GET', '/api/chat/unread-count'],
    ]);
  });

  it('connects trip, shared preference, place, and itinerary APIs', async () => {
    await oddtripService.getTrips();
    await oddtripService.getPreferences('trip-1');
    await oddtripService.savePreferences('trip-1', { places: [], activities: [], foods: [], pace: 50, budget: 50, indoorPreferred: false, hiddenSpots: false });
    await oddtripService.getAttractions('trip-1');
    await oddtripService.toggleAttraction('trip-1', 'place-1', { saved: true });
    await oddtripService.getItinerary('trip-1');
    await oddtripService.generateItinerary('trip-1');

    expect(mocks.apiRequest.mock.calls.map(([config]) => [config.method, config.url])).toEqual([
      ['GET', '/api/trips'],
      ['GET', '/api/trips/trip-1/preferences'],
      ['PUT', '/api/trips/trip-1/preferences'],
      ['GET', '/api/trips/trip-1/attractions'],
      ['PATCH', '/api/trips/trip-1/attractions/place-1'],
      ['GET', '/api/trips/trip-1/itinerary'],
      ['POST', '/api/trips/trip-1/itinerary/generate'],
    ]);
  });

  it('labels missing and static fallback sources without inventing provenance', () => {
    expect(sourceLabel()).toBe('출처 미제공');
    expect(sourceLabel('FALLBACK')).toBe('DEMO · FALLBACK');
    expect(sourceLabel('KTO')).toBe('출처 · KTO');
  });
});
