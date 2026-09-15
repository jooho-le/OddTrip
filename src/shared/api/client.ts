import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import type { ApiResponse, AuthResponse } from '../../types';

/** An API failure that kept its HTTP status, so callers can tell an unmet
 * precondition (403) from a genuine error without matching on message text. */
export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
export const SESSION_KEYS = {
  userId: 'oddtrip.userId',
  accessToken: 'oddtrip.authToken',
  refreshToken: 'oddtrip.refreshToken'
} as const;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  headers: { Accept: 'application/json' }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(SESSION_KEYS.accessToken);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshRequest: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isCredentialRequest = ['/api/auth/login', '/api/auth/register', '/api/auth/logout'].some((path) => original?.url?.includes(path));
    if (error.response?.status !== 401 || !original || original._retried || isCredentialRequest || original.url?.includes('/api/auth/refresh')) {
      return Promise.reject(normalizeApiError(error));
    }

    const refreshToken = localStorage.getItem(SESSION_KEYS.refreshToken);
    if (!refreshToken) {
      clearSession();
      announceSessionExpired();
      return Promise.reject(new Error('세션이 만료되었습니다. 다시 로그인해주세요.'));
    }

    original._retried = true;
    refreshRequest ??= axios
      .post<ApiResponse<AuthResponse>>(`${API_BASE_URL}/api/auth/refresh`, { refreshToken })
      .then(({ data }) => {
        saveSession(data.data);
        return data.data.accessToken;
      })
      .catch((refreshError) => {
        clearSession();
        announceSessionExpired();
        throw normalizeApiError(refreshError);
      })
      .finally(() => { refreshRequest = null; });

    const token = await refreshRequest;
    original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
    return apiClient.request(original);
  }
);

export function saveSession(data: AuthResponse) {
  localStorage.setItem(SESSION_KEYS.accessToken, data.accessToken);
  localStorage.setItem(SESSION_KEYS.refreshToken, data.refreshToken);
  localStorage.setItem(SESSION_KEYS.userId, data.user.id);
}

export function clearSession() {
  Object.values(SESSION_KEYS).forEach((key) => localStorage.removeItem(key));
}

function announceSessionExpired() {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem('oddtrip.sessionExpired', '1');
    window.dispatchEvent(new CustomEvent('oddtrip:session-expired'));
  }
}

export async function apiRequest<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
  const response = await apiClient.request<ApiResponse<T>>(config);
  return response.data;
}

function normalizeApiError(error: unknown) {
  if (!axios.isAxiosError(error)) return error instanceof Error ? error : new Error('API 요청에 실패했습니다.');
  const status = error.response?.status;
  const detail = error.response?.data?.error ?? error.response?.data?.detail;
  const message = Array.isArray(detail) ? '입력값을 확인해주세요.' : detail;
  if (message) return new ApiError(String(message), status);
  if (error.code === 'ECONNABORTED') return new ApiError('요청 시간이 초과되었습니다.', status);
  if (!error.response) return new ApiError('서버에 연결할 수 없습니다.', status);
  return new ApiError('API 요청에 실패했습니다.', status);
}
