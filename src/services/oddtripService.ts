import type { AgentRunRequest, AgentRunResponse, ApiResponse, Attraction, AuthResponse, ConflictResolution, ItineraryDay, JointPreference, MatchCandidate, SafetyAlert, TtiAnswer, TtiQuestion, TtiResult, UserProfile } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
const USER_ID_STORAGE_KEY = 'oddtrip.userId';
const AUTH_TOKEN_STORAGE_KEY = 'oddtrip.authToken';

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
  logout(): void;
  hasAuthToken(): boolean;
  getCurrentUser(): Promise<ApiResponse<UserProfile>>;
  getTtiQuestions(): Promise<ApiResponse<TtiQuestion[]>>;
  calculateTtiResult(answers: TtiAnswer[]): Promise<ApiResponse<TtiResult>>;
  getMatches(): Promise<ApiResponse<MatchCandidate[]>>;
  acceptMatch(matchedUserId: string): Promise<ApiResponse<AcceptMatchResponse>>;
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
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, response.data.accessToken);
    localStorage.setItem(USER_ID_STORAGE_KEY, response.data.user.id);
    return response;
  },

  async register(input) {
    const response = await request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: input
    });
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, response.data.accessToken);
    localStorage.setItem(USER_ID_STORAGE_KEY, response.data.user.id);
    return response;
  },

  logout() {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_ID_STORAGE_KEY);
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

  getMatches() {
    return request<MatchCandidate[]>('/api/matches', { auth: true });
  },

  acceptMatch(matchedUserId) {
    return request<AcceptMatchResponse>(`/api/matches/${matchedUserId}/accept`, {
      method: 'POST',
      auth: true
    });
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

async function request<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
    body?: unknown;
    auth?: boolean;
    userId?: string;
  } = {}
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

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error ?? payload?.detail ?? 'API 요청에 실패했습니다.';
    throw new Error(Array.isArray(message) ? '입력값을 확인해주세요.' : message);
  }

  return payload as ApiResponse<T>;
}
