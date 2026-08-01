import type { AgentRunRequest, AgentRunResponse, ApiResponse, Attraction, AuthResponse, ConflictResolution, ItineraryDay, JointPreference, MatchCandidate, SafetyAlert, TripSummary, TtiAnswer, TtiQuestion, TtiResult, UserProfile } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
const USER_ID_STORAGE_KEY = 'oddtrip.userId';
const AUTH_TOKEN_STORAGE_KEY = 'oddtrip.authToken';
const REFRESH_TOKEN_STORAGE_KEY = 'oddtrip.refreshToken';

function storeSession(data: AuthResponse) {
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.accessToken);
  localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, data.refreshToken);
  localStorage.setItem(USER_ID_STORAGE_KEY, data.user.id);
}

function clearSession() {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_ID_STORAGE_KEY);
}

interface AcceptMatchResponse {
  matchId: string;
  tripId: string | null;
}

interface PublicAttractionRequest {
  areaCode?: string;
  sigunguCode?: string;
  keywords?: string[];
  contentTypeIds?: string[];
  rowsPerType?: number;
  limit?: number;
  fast?: boolean;
}

export interface OddtripService {
  login(email: string, password: string): Promise<ApiResponse<AuthResponse>>;
  register(input: { email: string; password: string; nickname: string; homeRegion?: string; avatarUrl?: string }): Promise<ApiResponse<AuthResponse>>;
  logout(): Promise<void>;
  hasAuthToken(): boolean;
  getCurrentUser(): Promise<ApiResponse<UserProfile>>;
  getTtiQuestions(): Promise<ApiResponse<TtiQuestion[]>>;
  calculateTtiResult(answers: TtiAnswer[]): Promise<ApiResponse<TtiResult>>;
  getTtiResult(): Promise<ApiResponse<TtiResult | null>>;
  getMatches(): Promise<ApiResponse<MatchCandidate[]>>;
  acceptMatch(matchedUserId: string): Promise<ApiResponse<AcceptMatchResponse>>;
  getTrips(): Promise<ApiResponse<TripSummary[]>>;
  savePreferences(tripId: string, preferences: JointPreference): Promise<ApiResponse<JointPreference>>;
  resolveConflict(tripId: string, conflicts: string[]): Promise<ApiResponse<ConflictResolution>>;
  getAttractions(tripId: string): Promise<ApiResponse<Attraction[]>>;
  generatePublicAttractions(tripId: string, request?: PublicAttractionRequest): Promise<ApiResponse<Attraction[]>>;
  runTravelAgent(tripId: string, request?: AgentRunRequest): Promise<ApiResponse<AgentRunResponse>>;
  toggleAttraction(tripId: string, attractionId: string, patch: Partial<Pick<Attraction, 'saved' | 'excluded'>>): Promise<ApiResponse<Attraction>>;
  getItinerary(tripId: string): Promise<ApiResponse<ItineraryDay[]>>;
  generateItinerary(tripId: string): Promise<ApiResponse<ItineraryDay[]>>;
  getSafetyAlerts(tripId: string): Promise<ApiResponse<SafetyAlert[]>>;
}

export const oddtripService: OddtripService = {
  async login(email, password) {
    const response = await request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    storeSession(response.data);
    return response;
  },

  async register(input) {
    const response = await request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: input
    });
    storeSession(response.data);
    return response;
  },

  async logout() {
    // Tell the server first so the refresh token stops working; clear locally
    // either way, since the user's intent is to be signed out.
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    if (refreshToken) {
      await request('/api/auth/logout', { method: 'POST', body: { refreshToken } }).catch(() => undefined);
    }
    clearSession();
  },

  hasAuthToken() {
    return Boolean(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY));
  },

  async getCurrentUser() {
    if (localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)) {
      return request<UserProfile>('/api/auth/me', { auth: true });
    }
    throw new Error('로그인이 필요합니다.');
  },

  getTtiQuestions() {
    return request<TtiQuestion[]>('/api/tti/questions');
  },

  calculateTtiResult(answers) {
    return request<TtiResult>('/api/tti/calculate', {
      method: 'POST',
      auth: true,
      body: { answers }
    });
  },

  getTtiResult() {
    return request<TtiResult | null>('/api/tti/result', { auth: true });
  },

  getMatches() {
    return request<MatchCandidate[]>('/api/matches', { auth: true });
  },

  acceptMatch(matchedUserId) {
    return request<AcceptMatchResponse>(`/api/matches/${matchedUserId}/accept`, {
      method: 'POST',
      auth: true
    });
  },

  getTrips() {
    return request<TripSummary[]>('/api/trips', { auth: true });
  },

  savePreferences(tripId, preferences) {
    return request<JointPreference>(`/api/trips/${tripId}/preferences`, {
      method: 'PUT',
      auth: true,
      body: preferences
    });
  },

  resolveConflict(tripId, conflicts) {
    return request<ConflictResolution>(`/api/trips/${tripId}/resolve-conflict`, {
      method: 'POST',
      auth: true,
      body: { conflicts }
    });
  },

  getAttractions(tripId) {
    return request<Attraction[]>(`/api/trips/${tripId}/attractions`, { auth: true });
  },

  generatePublicAttractions(tripId, requestBody = {}) {
    return request<Attraction[]>(`/api/trips/${tripId}/attractions/generate-public`, {
      method: 'POST',
      auth: true,
      body: {
        areaCode: '1',
        keywords: ['전시', '카페'],
        contentTypeIds: ['12', '14', '15', '28', '32', '39'],
        rowsPerType: 5,
        limit: 6,
        fast: true,
        ...requestBody
      }
    });
  },

  runTravelAgent(tripId, requestBody = {}) {
    return request<AgentRunResponse>(`/api/trips/${tripId}/agent/run`, {
      method: 'POST',
      auth: true,
      body: {
        areaCode: '1',
        keywords: ['전시', '카페'],
        contentTypeIds: ['12', '14', '15', '28', '32', '39'],
        days: 3,
        budget: 60,
        pace: 55,
        generateItinerary: false,
        ...requestBody
      }
    });
  },

  toggleAttraction(tripId, attractionId, patch) {
    return request<Attraction>(`/api/trips/${tripId}/attractions/${attractionId}`, {
      method: 'PATCH',
      auth: true,
      body: patch
    });
  },

  getItinerary(tripId) {
    return request<ItineraryDay[]>(`/api/trips/${tripId}/itinerary`, { auth: true });
  },

  generateItinerary(tripId) {
    return request<ItineraryDay[]>(`/api/trips/${tripId}/itinerary/generate`, {
      method: 'POST',
      auth: true
    });
  },

  getSafetyAlerts(tripId) {
    return request<SafetyAlert[]>(`/api/trips/${tripId}/safety`, { auth: true });
  }
};

/**
 * Swap the refresh token for a fresh pair.
 *
 * Concurrent 401s share one in-flight call, otherwise several parallel
 * requests would each rotate the token and invalidate each other's result.
 */
let refreshInFlight: Promise<boolean> | null = null;

function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    if (!refreshToken) return false;
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      if (!response.ok) return false;
      const payload = await response.json();
      storeSession(payload.data);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function request<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
    body?: unknown;
    auth?: boolean;
    userId?: string;
  } = {},
  isRetry = false
): Promise<ApiResponse<T>> {
  const userId = options.userId ?? localStorage.getItem(USER_ID_STORAGE_KEY);
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  const headers: HeadersInit = { Accept: 'application/json' };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.auth || options.userId) {
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      if (!userId) throw new Error('로그인이 필요합니다.');
      headers['X-User-Id'] = userId;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });

  // The access token is short lived, so a 401 usually just means it expired.
  // Refresh once and replay; if that fails the session is genuinely over and
  // we clear it, rather than leaving a dead token to 401 forever.
  if (response.status === 401 && (options.auth || options.userId) && !isRetry) {
    if (await refreshAccessToken()) {
      return request<T>(path, options, true);
    }
    clearSession();
    throw new Error('로그인이 필요합니다.');
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error ?? payload?.detail ?? 'API 요청에 실패했습니다.';
    throw new Error(Array.isArray(message) ? '입력값을 확인해주세요.' : message);
  }

  return payload as ApiResponse<T>;
}
