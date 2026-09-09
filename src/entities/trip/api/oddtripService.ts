import type { AgentRunRequest, AgentRunResponse, ApiResponse, Attraction, AuthResponse, ConflictResolution, ItineraryDay, JointPreference, MatchCandidate, PairPreferences, PreferenceProposal, SafetyAlert, TripSummary, TtiAnswer, TtiQuestion, TtiResult, UserProfile } from '../../../types';
import { apiRequest, clearSession, saveSession, SESSION_KEYS } from '../../../shared/api/client';

function storeSession(data: AuthResponse) {
  saveSession(data);
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
  getTrips(): Promise<ApiResponse<TripSummary[]>>;
  getPreferences(tripId: string): Promise<ApiResponse<JointPreference>>;
  savePreferences(tripId: string, preferences: JointPreference): Promise<ApiResponse<JointPreference>>;
  saveMyPreferences(tripId: string, preferences: JointPreference): Promise<ApiResponse<{ userId: string; preferences: JointPreference; updatedAt?: string }>>;
  getPairPreferences(tripId: string): Promise<ApiResponse<PairPreferences>>;
  getPreferenceProposals(tripId: string): Promise<ApiResponse<PreferenceProposal[]>>;
  createPreferenceProposal(tripId: string, preferences: JointPreference): Promise<ApiResponse<PreferenceProposal>>;
  respondPreferenceProposal(tripId: string, proposalId: string, action: 'accept' | 'reject'): Promise<ApiResponse<PreferenceProposal>>;
  resolveConflict(tripId: string, conflicts: string[]): Promise<ApiResponse<ConflictResolution>>;
  getAttractions(tripId: string): Promise<ApiResponse<Attraction[]>>;
  generatePublicAttractions(tripId: string, request?: PublicAttractionRequest): Promise<ApiResponse<Attraction[]>>;
  runTravelAgent(tripId: string, request?: AgentRunRequest): Promise<ApiResponse<AgentRunResponse>>;
  toggleAttraction(tripId: string, attractionId: string, patch: Partial<Pick<Attraction, 'saved' | 'excluded'>>): Promise<ApiResponse<Attraction>>;
  getItinerary(tripId: string): Promise<ApiResponse<ItineraryDay[]>>;
  generateItinerary(tripId: string): Promise<ApiResponse<ItineraryDay[]>>;
  getSafetyAlerts(tripId: string): Promise<ApiResponse<SafetyAlert[]>>;
  updateProfile(input: { nickname?: string; homeRegion?: string; avatarUrl?: string }): Promise<ApiResponse<UserProfile>>;
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
    const refreshToken = localStorage.getItem(SESSION_KEYS.refreshToken);
    // 로컬 세션을 먼저 비웁니다. 서버 호출을 기다리면 응답/타임아웃(최대 20초)까지
    // localStorage에 토큰이 남아, 그 사이 RequireAuth 가드가 여전히 로그인 상태로 판단합니다.
    clearSession();
    if (refreshToken) {
      await request('/api/auth/logout', { method: 'POST', body: { refreshToken } }).catch(() => undefined);
    }
  },

  hasAuthToken() {
    return Boolean(localStorage.getItem(SESSION_KEYS.accessToken));
  },

  async getCurrentUser() {
    if (localStorage.getItem(SESSION_KEYS.accessToken)) {
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

  getTrips() {
    return request<TripSummary[]>('/api/trips', { auth: true });
  },

  getPreferences(tripId) {
    return request<JointPreference>(`/api/trips/${tripId}/preferences`, { auth: true });
  },

  savePreferences(tripId, preferences) {
    return request<JointPreference>(`/api/trips/${tripId}/preferences`, {
      method: 'PUT',
      auth: true,
      body: preferences
    });
  },

  saveMyPreferences(tripId, preferences) {
    return request(`/api/trips/${tripId}/preferences/me`, {
      method: 'PUT', auth: true, body: preferences
    });
  },

  getPairPreferences(tripId) {
    return request<PairPreferences>(`/api/trips/${tripId}/preferences/pair`, { auth: true });
  },

  getPreferenceProposals(tripId) {
    return request<PreferenceProposal[]>(`/api/trips/${tripId}/preferences/proposals`, { auth: true });
  },

  createPreferenceProposal(tripId, preferences) {
    return request<PreferenceProposal>(`/api/trips/${tripId}/preferences/proposals`, {
      method: 'POST', auth: true, body: { preferences }
    });
  },

  respondPreferenceProposal(tripId, proposalId, action) {
    return request<PreferenceProposal>(`/api/trips/${tripId}/preferences/proposals/${proposalId}/${action}`, {
      method: 'POST', auth: true
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
  },

  updateProfile(input) {
    return request<UserProfile>('/api/users/me', { method: 'PATCH', auth: true, body: input });
  }
};

async function request<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
    body?: unknown;
    auth?: boolean;
    userId?: string;
  } = {},
): Promise<ApiResponse<T>> {
  const userId = options.userId ?? localStorage.getItem(SESSION_KEYS.userId);
  if ((options.auth || options.userId) && !localStorage.getItem(SESSION_KEYS.accessToken) && !userId) {
    throw new Error('로그인이 필요합니다.');
  }
  return apiRequest<T>({
    url: path,
    method: options.method ?? 'GET',
    data: options.body,
    headers: !localStorage.getItem(SESSION_KEYS.accessToken) && userId ? { 'X-User-Id': userId } : undefined
  });
}
