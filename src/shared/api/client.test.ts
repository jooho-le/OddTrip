import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const state: { rejectResponse?: (error: unknown) => Promise<unknown> } = {};
  const apiClient = {
    interceptors: {
      request: { use: vi.fn() },
      response: {
        use: vi.fn((_fulfilled: unknown, rejected: (error: unknown) => Promise<unknown>) => {
          state.rejectResponse = rejected;
        }),
      },
    },
    request: vi.fn(),
  };
  const axios = {
    create: vi.fn(() => apiClient),
    post: vi.fn(),
    isAxiosError: vi.fn(() => false),
  };
  return { state, apiClient, axios };
});

vi.mock('axios', () => ({ default: mocks.axios }));

import { SESSION_KEYS } from './client';

describe('session refresh interceptor', () => {
  const values = new Map<string, string>();
  const dispatchEvent = vi.fn();

  beforeEach(() => {
    values.clear();
    vi.clearAllMocks();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => values.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => values.set(key, value)),
        removeItem: vi.fn((key: string) => values.delete(key)),
      },
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        sessionStorage: { setItem: vi.fn() },
        dispatchEvent,
      },
    });
    Object.defineProperty(globalThis, 'CustomEvent', {
      configurable: true,
      value: class CustomEventStub {
        constructor(readonly type: string) {}
      },
    });
    mocks.apiClient.request.mockResolvedValue({ data: { data: { ok: true } } });
  });

  it('refreshes once and retries the original request with the new access token', async () => {
    values.set(SESSION_KEYS.refreshToken, 'refresh-token');
    mocks.axios.post.mockResolvedValue({
      data: {
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          tokenType: 'bearer',
          user: { id: 'user-1', nickname: '여행자' },
        },
      },
    });
    const original = { url: '/api/trips', method: 'GET', headers: {} };

    await mocks.state.rejectResponse?.({ config: original, response: { status: 401 } });

    expect(mocks.axios.post).toHaveBeenCalledWith(expect.stringContaining('/api/auth/refresh'), { refreshToken: 'refresh-token' });
    expect(localStorage.setItem).toHaveBeenCalledWith(SESSION_KEYS.accessToken, 'new-access-token');
    expect(mocks.apiClient.request).toHaveBeenCalledWith(expect.objectContaining({
      _retried: true,
      headers: expect.objectContaining({ Authorization: 'Bearer new-access-token' }),
    }));
  });

  it('clears the session and announces expiry when no refresh token exists', async () => {
    await expect(mocks.state.rejectResponse?.({
      config: { url: '/api/trips', method: 'GET', headers: {} },
      response: { status: 401 },
    })).rejects.toThrow('세션이 만료되었습니다');

    expect(localStorage.removeItem).toHaveBeenCalledWith(SESSION_KEYS.accessToken);
    expect(window.sessionStorage.setItem).toHaveBeenCalledWith('oddtrip.sessionExpired', '1');
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'oddtrip:session-expired' }));
  });
});
