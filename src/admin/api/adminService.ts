import { apiRequest } from '../../shared/api/client';

export type AdminUserStatus = 'active' | 'suspended' | 'withdrawn';
export type AdminTripStatus = 'planning' | 'confirmed' | 'completed' | 'cancelled';
export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';
export type SanctionType =
  | 'warning'
  | 'matching_restriction'
  | 'suspension'
  | 'ban'
  | 'withdrawal';

export interface AdminUser {
  id: string;
  nickname: string;
  email: string | null;
  region: string | null;
  ttiCode: string | null;
  joinedAt: string;
  status: AdminUserStatus;
  role: string;
  matches: number;
  trips: number;
}

export interface AdminUserDetail extends AdminUser {
  withdrawnAt: string | null;
  /** 항목별 현행 동의 여부. 성인 확인 등을 운영 화면에서 보기 위한 요약. */
  consents: Record<string, boolean>;
}

export interface AdminTrip {
  id: string;
  title: string | null;
  region: string | null;
  startDate: string | null;
  endDate: string | null;
  status: AdminTripStatus;
  travelers: string[];
  attractions: number;
  itineraryItems: number;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  withdrawnUsers: number;
  totalTrips: number;
  activeTrips: number;
  totalMatches: number;
  matchAcceptanceRate: number;
  ttiCompletionRate: number;
  ttiDistribution: { code: string; count: number }[];
}

export interface ReportPerson {
  id: string;
  nickname: string;
  email: string | null;
  status: string;
}

export interface AdminReport {
  id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  reporter: ReportPerson;
  reportedUser: ReportPerson;
  roomId: string | null;
  messageId: string | null;
  reportedUserReportCount: number;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
}

export interface AdminReportDetail extends AdminReport {
  messageContent: string | null;
  relatedReports: AdminReport[];
}

export interface AdminSanction {
  id: string;
  userId: string;
  type: SanctionType;
  reason: string;
  note: string | null;
  expiresAt: string | null;
  releasedAt: string | null;
  releasedBy: string | null;
  reportId: string | null;
  issuedBy: string | null;
  createdAt: string;
  active: boolean;
}

interface Page<T> {
  items: T[];
  total: number;
}

export const REPORT_REASON_LABELS: Record<string, string> = {
  spam: '스팸·광고',
  harassment: '괴롭힘',
  sexual_content: '성적 콘텐츠',
  hate: '혐오·차별',
  fraud: '사기·금전 요구',
  personal_information: '개인정보 침해',
  other: '기타',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: '미처리',
  reviewing: '검토 중',
  resolved: '조치함',
  dismissed: '조치 없음',
};

export const SANCTION_LABELS: Record<SanctionType, string> = {
  warning: '경고',
  matching_restriction: '매칭 제한',
  suspension: '일시 정지',
  ban: '영구 정지',
  withdrawal: '강제 탈퇴',
};

/** 기간을 입력받아야 하는 제재. 나머지는 기간 개념이 없다. */
export const TIMED_SANCTIONS: SanctionType[] = ['matching_restriction', 'suspension'];

export const adminService = {
  stats() {
    return apiRequest<AdminStats>({ url: '/api/admin/stats', method: 'GET' });
  },

  users(params: { q?: string; status?: string; limit?: number; offset?: number } = {}) {
    return apiRequest<Page<AdminUser>>({ url: '/api/admin/users', method: 'GET', params });
  },

  user(id: string) {
    return apiRequest<AdminUserDetail>({ url: `/api/admin/users/${id}`, method: 'GET' });
  },

  trips(params: { q?: string; status?: string; limit?: number; offset?: number } = {}) {
    return apiRequest<Page<AdminTrip>>({ url: '/api/admin/trips', method: 'GET', params });
  },

  trip(id: string) {
    return apiRequest<AdminTrip>({ url: `/api/admin/trips/${id}`, method: 'GET' });
  },

  reports(params: { status?: string; reason?: string; reportedUserId?: string; limit?: number; offset?: number } = {}) {
    return apiRequest<Page<AdminReport> & { pending: number }>({
      url: '/api/admin/reports',
      method: 'GET',
      params,
    });
  },

  report(id: string) {
    return apiRequest<AdminReportDetail>({ url: `/api/admin/reports/${id}`, method: 'GET' });
  },

  reviewReport(id: string, body: { status: 'reviewing' | 'resolved' | 'dismissed'; note?: string }) {
    return apiRequest<AdminReportDetail>({ url: `/api/admin/reports/${id}`, method: 'PATCH', data: body });
  },

  sanctions(userId: string) {
    return apiRequest<{ items: AdminSanction[] }>({
      url: `/api/admin/users/${userId}/sanctions`,
      method: 'GET',
    });
  },

  issueSanction(
    userId: string,
    body: { type: SanctionType; reason: string; note?: string; days?: number; reportId?: string },
  ) {
    return apiRequest<AdminSanction>({
      url: `/api/admin/users/${userId}/sanctions`,
      method: 'POST',
      data: body,
    });
  },

  releaseSanction(id: string) {
    return apiRequest<AdminSanction>({ url: `/api/admin/sanctions/${id}`, method: 'DELETE' });
  },
};
