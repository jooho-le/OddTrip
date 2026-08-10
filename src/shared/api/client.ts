import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import type { ApiResponse, AuthResponse } from '../../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
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
    if (!refreshToken) return Promise.reject(new Error('로그인이 필요합니다.'));

    original._retried = true;
    refreshRequest ??= axios
      .post<ApiResponse<AuthResponse>>(`${API_BASE_URL}/api/auth/refresh`, { refreshToken })
      .then(({ data }) => {
        saveSession(data.data);
        return data.data.accessToken;
      })
      .catch((refreshError) => {
        clearSession();
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

export async function apiRequest<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
  const response = await apiClient.request<ApiResponse<T>>(config);
  return response.data;
}

function normalizeApiError(error: unknown) {
  if (!axios.isAxiosError(error)) return error instanceof Error ? error : new Error('API 요청에 실패했습니다.');
  const detail = error.response?.data?.error ?? error.response?.data?.detail;
  const message = Array.isArray(detail) ? '입력값을 확인해주세요.' : detail;
  if (message) return new Error(String(message));
  if (error.code === 'ECONNABORTED') return new Error('요청 시간이 초과되었습니다.');
  if (!error.response) return new Error('서버에 연결할 수 없습니다.');
  return new Error('API 요청에 실패했습니다.');
}
