import type { ApiResponse, Attraction, ItineraryDay, JointPreference, MatchCandidate, SafetyAlert, TtiAnswer, TtiQuestion, TtiResult, UserProfile } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
const USER_ID_STORAGE_KEY = 'oddtrip.userId';

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
}

export interface OddtripService {
  getCurrentUser(): Promise<ApiResponse<UserProfile>>;
  getTtiQuestions(): Promise<ApiResponse<TtiQuestion[]>>;
  calculateTtiResult(answers: TtiAnswer[]): Promise<ApiResponse<TtiResult>>;
  getMatches(): Promise<ApiResponse<MatchCandidate[]>>;
  acceptMatch(matchedUserId: string): Promise<ApiResponse<AcceptMatchResponse>>;
  savePreferences(tripId: string, preferences: JointPreference): Promise<ApiResponse<JointPreference>>;
  getAttractions(tripId: string): Promise<ApiResponse<Attraction[]>>;
  generatePublicAttractions(tripId: string, request?: PublicAttractionRequest): Promise<ApiResponse<Attraction[]>>;
  toggleAttraction(tripId: string, attractionId: string, patch: Partial<Pick<Attraction, 'saved' | 'excluded'>>): Promise<ApiResponse<Attraction>>;
  getItinerary(tripId: string): Promise<ApiResponse<ItineraryDay[]>>;
  generateItinerary(tripId: string): Promise<ApiResponse<ItineraryDay[]>>;
  getSafetyAlerts(tripId: string): Promise<ApiResponse<SafetyAlert[]>>;
}

export const oddtripService: OddtripService = {
  async getCurrentUser() {
    const existingUserId = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (existingUserId) {
      try {
        return await request<UserProfile>('/api/users/me', { userId: existingUserId });
      } catch {
        localStorage.removeItem(USER_ID_STORAGE_KEY);
      }
    }

    const response = await request<UserProfile>('/api/users', {
      method: 'POST',
      body: {
        nickname: '민서',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80',
        homeRegion: 'Seoul'
      }
    });
    localStorage.setItem(USER_ID_STORAGE_KEY, response.data.id);
    return response;
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
      body: preferences
    });
  },

  getAttractions(tripId) {
    return request<Attraction[]>(`/api/trips/${tripId}/attractions`);
  },

  generatePublicAttractions(tripId, requestBody = {}) {
    return request<Attraction[]>(`/api/trips/${tripId}/attractions/generate-public`, {
      method: 'POST',
      auth: true,
      body: {
        areaCode: '1',
        keywords: ['전시', '골목', '카페'],
        contentTypeIds: ['12', '14', '15', '28', '32', '39'],
        rowsPerType: 10,
        limit: 8,
        ...requestBody
      }
    });
  },

  toggleAttraction(tripId, attractionId, patch) {
    return request<Attraction>(`/api/trips/${tripId}/attractions/${attractionId}`, {
      method: 'PATCH',
      body: patch
    });
  },

  getItinerary(tripId) {
    return request<ItineraryDay[]>(`/api/trips/${tripId}/itinerary`);
  },

  generateItinerary(tripId) {
    return request<ItineraryDay[]>(`/api/trips/${tripId}/itinerary/generate`, {
      method: 'POST',
      auth: true
    });
  },

  getSafetyAlerts(tripId) {
    return request<SafetyAlert[]>(`/api/trips/${tripId}/safety`);
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
  const headers: HeadersInit = { Accept: 'application/json' };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.auth || options.userId) {
    if (!userId) throw new Error('사용자 ID가 없습니다. 먼저 사용자를 생성해야 합니다.');
    headers['X-User-Id'] = userId;
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
