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
import { safetyService } from '../entities/chat/api/safetyService';
import { notificationService } from '../entities/notification/api/notificationService';
import { communityService } from '../entities/community/api/communityService';
import { locationShareService } from '../entities/location-share/api/locationShareService';
import { adminService } from '../admin/api/adminService';
import { registrationDecisions } from '../entities/consent/api/consentService';
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

  it('sends signup consents in the register payload without a separate local consent record', async () => {
    const auth = { accessToken: 'a', refreshToken: 'r', tokenType: 'bearer', user: { id: 'u1', nickname: '여행자' } };
    const consents = registrationDecisions(true);
    mocks.apiRequest.mockResolvedValueOnce({ data: auth });

    await oddtripService.register({
      email: 'user@example.com',
      password: 'password123',
      nickname: '여행자',
      consents,
    });

    expect(mocks.apiRequest).toHaveBeenCalledWith(expect.objectContaining({
      url: '/api/auth/register',
      method: 'POST',
      data: expect.objectContaining({ consents }),
    }));
    expect(localStorage.setItem).not.toHaveBeenCalledWith(expect.stringMatching(/consent/i), expect.anything());
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

  it('connects the notification list, badge and read endpoints', async () => {
    mocks.apiRequest.mockResolvedValue({ data: {} });
    await notificationService.list({ limit: 20 });
    await notificationService.unreadCount();
    await notificationService.markRead();
    await notificationService.markRead(['n-1']);

    expect(mocks.apiRequest.mock.calls.map(([config]) => [config.method, config.url])).toEqual([
      ['GET', '/api/notifications'],
      ['GET', '/api/notifications/unread-count'],
      ['PUT', '/api/notifications/read'],
      ['PUT', '/api/notifications/read'],
    ]);
    // Omitting the ids marks everything read; passing them scopes the update.
    expect(mocks.apiRequest.mock.calls[2][0].data).toEqual({});
    expect(mocks.apiRequest.mock.calls[3][0].data).toEqual({ notificationIds: ['n-1'] });
  });

  it('carries notifications over the existing chat socket', () => {
    const event: import('../entities/chat/api/chatService').ChatSocketEvent = {
      event: 'notification.created',
      data: {
        id: 'n-1',
        type: 'match_request.received',
        title: '가나님이 동행을 요청했어요',
        body: '같이 가요!',
        link: '/matches?tab=received',
        payload: { requestId: 'req-1' },
        read: false,
        createdAt: '2026-09-09T00:00:00',
      },
    };

    expect(event.data.link).toBe('/matches?tab=received');
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

  it('connects message and user reports to their safety endpoints', async () => {
    await chatService.reportMessage('room-1', 'message-1', { reason: 'harassment', details: '반복적인 욕설' });
    await safetyService.reportUser('user-2', { reason: 'fraud', details: '송금을 요구함' });

    expect(mocks.apiRequest.mock.calls.map(([config]) => [config.method, config.url, config.data])).toEqual([
      ['POST', '/api/chat/rooms/room-1/messages/message-1/reports', { reason: 'harassment', details: '반복적인 욕설' }],
      ['POST', '/api/users/user-2/reports', { reason: 'fraud', details: '송금을 요구함' }],
    ]);
  });

  it('connects trip, shared preference, place, and itinerary APIs', async () => {
    mocks.apiRequest.mockResolvedValueOnce({ data: [] });
    await oddtripService.getTrips();
    await oddtripService.getTrip('trip-1');
    await oddtripService.createTrip({ matchId: 'match-1', region: '부산', startDate: '2026-09-20', endDate: '2026-09-22' });
    await oddtripService.updateTrip('trip-1', { title: '부산 여행' });
    await oddtripService.cancelTrip('trip-1');
    await oddtripService.getPreferences('trip-1');
    await oddtripService.savePreferences('trip-1', { places: [], activities: [], foods: [], pace: 50, budget: 50, indoorPreferred: false, hiddenSpots: false });
    await oddtripService.getAttractions('trip-1');
    await oddtripService.toggleAttraction('trip-1', 'place-1', { saved: true });
    await oddtripService.getItinerary('trip-1');
    await oddtripService.generateItinerary('trip-1');
    await oddtripService.getApproval('trip-1');
    await oddtripService.respondApproval('trip-1', 'change_request', '이동량을 줄여 주세요.');

    expect(mocks.apiRequest.mock.calls.map(([config]) => [config.method, config.url])).toEqual([
      ['GET', '/api/trips'],
      ['GET', '/api/trips/trip-1'],
      ['POST', '/api/trips'],
      ['PATCH', '/api/trips/trip-1'],
      ['DELETE', '/api/trips/trip-1'],
      ['GET', '/api/trips/trip-1/preferences'],
      ['PUT', '/api/trips/trip-1/preferences'],
      ['GET', '/api/trips/trip-1/attractions'],
      ['PATCH', '/api/trips/trip-1/attractions/place-1'],
      ['GET', '/api/trips/trip-1/itinerary'],
      ['POST', '/api/trips/trip-1/itinerary/generate'],
      ['GET', '/api/trips/trip-1/approval'],
      ['PUT', '/api/trips/trip-1/approval/me'],
    ]);
    expect(mocks.apiRequest.mock.calls[12][0].data).toEqual({ action: 'change_request', comment: '이동량을 줄여 주세요.' });
  });

  it('connects per-user preferences and the proposal lifecycle', async () => {
    const preferences = { places: ['바다'], activities: ['산책'], foods: ['시장 음식'], pace: 45, budget: 60, indoorPreferred: false, hiddenSpots: true };
    await oddtripService.saveMyPreferences('trip-1', preferences);
    await oddtripService.getPairPreferences('trip-1');
    await oddtripService.getPreferenceProposals('trip-1');
    await oddtripService.createPreferenceProposal('trip-1', preferences);
    await oddtripService.respondPreferenceProposal('trip-1', 'proposal-1', 'accept');
    await oddtripService.respondPreferenceProposal('trip-1', 'proposal-2', 'reject');

    expect(mocks.apiRequest.mock.calls.map(([config]) => [config.method, config.url])).toEqual([
      ['PUT', '/api/trips/trip-1/preferences/me'],
      ['GET', '/api/trips/trip-1/preferences/pair'],
      ['GET', '/api/trips/trip-1/preferences/proposals'],
      ['POST', '/api/trips/trip-1/preferences/proposals'],
      ['POST', '/api/trips/trip-1/preferences/proposals/proposal-1/accept'],
      ['POST', '/api/trips/trip-1/preferences/proposals/proposal-2/reject'],
    ]);
  });

  it('connects private concession submissions and the Odd Rule lifecycle', async () => {
    const answers = {
      pace: 'keep',
      budget: 'flexible',
      food: 'yield',
      activities: 'flexible',
    } as const;
    await oddtripService.getConcessions('trip-1');
    await oddtripService.saveConcessions('trip-1', answers, '예산은 조율할 수 있어요.', true);
    await oddtripService.getOddRules('trip-1');
    await oddtripService.proposeOddRule('trip-1', {
      ruleKey: 'one-veto-each',
      title: '각자 거절권 한 번',
      description: '서로 한 번씩 선택을 제외할 수 있습니다.',
    });
    await oddtripService.respondOddRule('trip-1', 'rule-1', 'accept');
    await oddtripService.respondOddRule('trip-1', 'rule-2', 'reject');

    expect(mocks.apiRequest.mock.calls.map(([config]) => [config.method, config.url])).toEqual([
      ['GET', '/api/trips/trip-1/concessions'],
      ['PUT', '/api/trips/trip-1/concessions/me'],
      ['GET', '/api/trips/trip-1/odd-rules'],
      ['POST', '/api/trips/trip-1/odd-rules/proposals'],
      ['POST', '/api/trips/trip-1/odd-rules/proposals/rule-1/accept'],
      ['POST', '/api/trips/trip-1/odd-rules/proposals/rule-2/reject'],
    ]);
    expect(mocks.apiRequest.mock.calls[1][0].data).toEqual({
      answers,
      note: '예산은 조율할 수 있어요.',
      submit: true,
    });
  });

  it('connects password change and single-use reset endpoints', async () => {
    mocks.apiRequest.mockResolvedValueOnce({ data: { success: true } });
    await oddtripService.changePassword('old-password', 'new-password');
    await oddtripService.requestPasswordReset('user@example.com');
    await oddtripService.resetPassword('reset-token-value-1234567890', 'new-password');

    expect(mocks.apiRequest.mock.calls.map(([config]) => [config.method, config.url])).toEqual([
      ['POST', '/api/auth/change-password'],
      ['POST', '/api/auth/password-reset/request'],
      ['POST', '/api/auth/password-reset/confirm'],
    ]);
    expect(mocks.apiRequest.mock.calls[0][0].data).toEqual({
      currentPassword: 'old-password',
      newPassword: 'new-password',
    });
    expect(mocks.clearSession).toHaveBeenCalledOnce();
  });

  it('connects admin lists, report review, and sanction requests', async () => {
    await adminService.stats();
    await adminService.users({ q: '은진', status: 'active', limit: 20, offset: 0 });
    await adminService.trips({ status: 'planning', limit: 20, offset: 20 });
    await adminService.reports({ status: 'pending', reason: 'spam', limit: 20, offset: 0 });
    await adminService.report('report-1');
    await adminService.reviewReport('report-1', { status: 'resolved', note: '확인 완료' });
    await adminService.sanctions('user-1');
    await adminService.issueSanction('user-1', { type: 'suspension', reason: '반복 위반', days: 7, reportId: 'report-1' });
    await adminService.releaseSanction('sanction-1');

    expect(mocks.apiRequest.mock.calls.map(([config]) => [config.method, config.url])).toEqual([
      ['GET', '/api/admin/stats'],
      ['GET', '/api/admin/users'],
      ['GET', '/api/admin/trips'],
      ['GET', '/api/admin/reports'],
      ['GET', '/api/admin/reports/report-1'],
      ['PATCH', '/api/admin/reports/report-1'],
      ['GET', '/api/admin/users/user-1/sanctions'],
      ['POST', '/api/admin/users/user-1/sanctions'],
      ['DELETE', '/api/admin/sanctions/sanction-1'],
    ]);
  });

  it('connects the travel review board to the community endpoints', async () => {
    mocks.apiRequest.mockResolvedValue({ data: { items: [], page: 1, size: 4, total: 0, totalPages: 1 } });
    const input = { title: '강릉에서 보낸 이틀', body: '바다를 따라 걷다가 들어간 책방이 좋았다.', category: '여행기' as const, region: '강릉', tags: ['바다'], image: '', imageCaption: '', allowComments: true };

    await communityService.listPosts({ category: '여행 팁', q: '강릉', view: 'saved', sort: 'popular', page: 2, size: 4 });
    await communityService.getPost('post-1');
    await communityService.createPost(input, { draftKey: 'new', tripId: 'trip-1' });
    await communityService.updatePost('post-1', input, { draftKey: 'post-1' });
    await communityService.setReaction('post-1', 'like', true);
    await communityService.createComment('post-1', '책방 이름이 궁금해요.');
    await communityService.deleteComment('post-1', 'comment-1');
    await communityService.saveDraft('trip:trip-1', input);
    await communityService.deleteDraft('trip:trip-1');
    await communityService.deletePost('post-1');

    expect(mocks.apiRequest.mock.calls.map(([config]) => [config.method, config.url])).toEqual([
      ['GET', '/api/community/posts'],
      ['GET', '/api/community/posts/post-1'],
      ['POST', '/api/community/posts'],
      ['PUT', '/api/community/posts/post-1'],
      ['PUT', '/api/community/posts/post-1/like'],
      ['POST', '/api/community/posts/post-1/comments'],
      ['DELETE', '/api/community/posts/post-1/comments/comment-1'],
      ['PUT', '/api/community/drafts/trip%3Atrip-1'],
      ['DELETE', '/api/community/drafts/trip%3Atrip-1'],
      ['DELETE', '/api/community/posts/post-1'],
    ]);
    // 목록 조건은 질의 문자열로 나가고, 기본값(전체 보기)은 보내지 않는다.
    expect(mocks.apiRequest.mock.calls[0][0].params).toEqual({ category: '여행 팁', q: '강릉', view: 'saved', sort: 'popular', page: 2, size: 4 });
    // 작성은 초안 키를 함께 보내 같은 요청에서 임시저장을 정리하게 한다.
    expect(mocks.apiRequest.mock.calls[2][0].params).toEqual({ draftKey: 'new' });
    expect(mocks.apiRequest.mock.calls[2][0].data).toMatchObject({ title: '강릉에서 보낸 이틀', category: '여행기', region: '강릉', tags: ['바다'], allowComments: true, tripId: 'trip-1' });
    // 비어 있는 사진·설명은 빈 문자열이 아니라 null로 보낸다.
    expect(mocks.apiRequest.mock.calls[2][0].data.image).toBeNull();
    // 공감은 토글이 아니라 원하는 상태를 보낸다.
    expect(mocks.apiRequest.mock.calls[4][0].data).toEqual({ value: true });
  });

  it('reads community list defaults so the board never blanks on a partial response', async () => {
    mocks.apiRequest.mockResolvedValue({ data: { items: [{ id: 'post-1', author: { id: 'u1', nickname: '여행자' }, category: '여행기', title: '제목', body: '본문', likeCount: 3, commentCount: 1, liked: true, region: null, image: null, tags: null }] } });

    const page = await communityService.listPosts();

    expect(page.items[0]).toMatchObject({ id: 'post-1', likeCount: 3, commentCount: 1, liked: true, saved: false, mine: false });
    // 서버의 null은 화면이 다루는 빈 문자열·빈 배열로 바꾼다.
    expect(page.items[0]).toMatchObject({ region: '', image: '', tags: [] });
    expect(page.items[0].comments).toBeNull();
    expect(page.totalPages).toBe(1);
  });

  it('connects outward location sharing to its endpoints', async () => {
    mocks.apiRequest.mockResolvedValue({ data: { share: null, durationChoices: [6, 24, 72] } });

    await locationShareService.getActive();
    await locationShareService.start(6, 'trip-1');
    await locationShareService.extend('share-1', 24);
    await locationShareService.ping('share-1', { latitude: 37.5, longitude: 127.0, accuracy: 12 });
    await locationShareService.view('tok3n');
    await locationShareService.stop('share-1');

    expect(mocks.apiRequest.mock.calls.map(([config]) => [config.method, config.url])).toEqual([
      ['GET', '/api/me/location-share'],
      ['POST', '/api/me/location-share'],
      ['POST', '/api/me/location-share/share-1/extend'],
      ['POST', '/api/me/location-share/share-1/ping'],
      // 링크를 받은 사람이 여는 자리. 로그인 없이 열린다.
      ['GET', '/api/share/tok3n'],
      ['DELETE', '/api/me/location-share/share-1'],
    ]);
    // 동의 없이는 서버가 시작하지 않으므로 화면의 확인 절차를 그대로 실어 보낸다.
    expect(mocks.apiRequest.mock.calls[1][0].data).toEqual({ durationHours: 6, consent: true, tripId: 'trip-1' });
    expect(mocks.apiRequest.mock.calls[3][0].data).toEqual({ latitude: 37.5, longitude: 127.0, accuracy: 12 });
  });

  it('labels missing and static fallback sources without inventing provenance', () => {
    expect(sourceLabel()).toBe('출처 미제공');
    expect(sourceLabel('FALLBACK')).toBe('출처 미제공');
    expect(sourceLabel('KTO')).toBe('출처 · KTO');
  });
});
