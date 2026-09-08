export type TtiAxis = 'PW' | 'NC' | 'FA' | 'HS';
export type TtiLetter = 'P' | 'W' | 'N' | 'C' | 'F' | 'A' | 'H' | 'S';
export type TtiCode = `${'P' | 'W'}${'N' | 'C'}${'F' | 'A'}${'H' | 'S'}`;

export interface UserProfile {
  id: string;
  email?: string | null;
  nickname: string;
  avatarUrl?: string | null;
  homeRegion?: string | null;
  ttiCode?: TtiCode;
}

export interface TtiQuestion {
  id: string;
  axis: TtiAxis;
  prompt: string;
  leftLabel: string;
  rightLabel: string;
  leftLetter: TtiLetter;
  rightLetter: TtiLetter;
}

export interface TtiAnswer {
  questionId: string;
  axis: TtiAxis;
  value: number;
}

export interface AxisScore {
  axis: TtiAxis;
  leftLetter: TtiLetter;
  rightLetter: TtiLetter;
  score: number;
}

export interface TtiResult {
  code: TtiCode;
  oppositeCode: TtiCode;
  title: string;
  description: string;
  strengths: string[];
  axisScores: AxisScore[];
}

export interface TravelTypeSample {
  code: TtiCode;
  title: string;
  description: string;
  keywords: string[];
}

export interface MatchCandidate {
  id: string;
  nickname: string;
  ageRange: string;
  region: string;
  avatarUrl?: string | null;
  ttiCode: TtiCode;
  summary: string;
  compatibility: string;
  matchLevel: '완전 반대' | '부분 반대' | '추천';
  recommendationScore: number;
  differences: string[];
  complements: string[];
}

export interface JointPreference {
  places: string[];
  activities: string[];
  foods: string[];
  pace: number;
  budget: number;
  indoorPreferred: boolean;
  hiddenSpots: boolean;
}

export interface PersonalPreferenceRecord {
  userId: string;
  preferences: JointPreference;
  updatedAt?: string | null;
}

export interface PreferenceListComparison {
  common: string[];
  onlyMine: string[];
  onlyCounterpart: string[];
}

export interface PairPreferenceComparison {
  places: PreferenceListComparison;
  activities: PreferenceListComparison;
  foods: PreferenceListComparison;
  paceDifference: number;
  budgetDifference: number;
  indoorPreferredConflict: boolean;
  hiddenSpotsConflict: boolean;
}

export interface PairPreferences {
  tripId: string;
  mine?: PersonalPreferenceRecord | null;
  counterpart?: PersonalPreferenceRecord | null;
  bothSubmitted: boolean;
  comparison?: PairPreferenceComparison | null;
  agreed?: JointPreference | null;
}

export type PreferenceProposalStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export interface PreferenceProposal {
  id: string;
  tripId: string;
  proposedBy: string;
  respondedBy?: string | null;
  preferences: JointPreference;
  status: PreferenceProposalStatus;
  createdAt: string;
  respondedAt?: string | null;
}

export interface ConflictResolution {
  suggestion: string;
}

export interface Attraction {
  id: string;
  name: string;
  category: string;
  imageUrl?: string | null;
  description?: string | null;
  reason?: string | null;
  tags: string[];
  indoor: boolean;
  active: boolean;
  famous: boolean;
  saved: boolean;
  excluded: boolean;
  contentId?: string | null;
  contentTypeId?: string | null;
  source?: string | null;
  addr1?: string | null;
  addr2?: string | null;
  mapX?: string | null;
  mapY?: string | null;
  areaCode?: string | null;
  sigunguCode?: string | null;
  tel?: string | null;
  homepage?: string | null;
  openingHours?: Record<string, unknown> | null;
  closedDays?: string[];
  congestionScore?: number | null;
  hiddenScore?: number | null;
  relatedRank?: number | null;
}

export interface AgentRunRequest {
  areaCode?: string;
  sigunguCode?: string | null;
  keywords?: string[];
  contentTypeIds?: string[];
  days?: number;
  budget?: number;
  pace?: number;
  generateItinerary?: boolean;
}

export interface AgentToolStep {
  tool: string;
  reason: string;
  args: Record<string, unknown>;
  resultCount: number;
}

export interface AgentRunResponse {
  mode: 'tool-calling' | 'deterministic-fallback' | string;
  summary: string;
  steps: AgentToolStep[];
  recommendedAttractionIds: string[];
  nextActions: string[];
}

export type ItineraryItemType = 'place' | 'move' | 'meal' | 'rest';

export interface ItineraryItem {
  id: string;
  day: number;
  /** Set for `place` slots only; move/meal/rest have no place behind them. */
  placeId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  time: string;
  type: ItineraryItemType;
  title: string;
  location: string;
  duration: string;
  moveTime?: string;
  description: string;
  aiReason: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  weather: string;
  caution: string;
  items: ItineraryItem[];
}

export interface SafetyAlert {
  id: string;
  level: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  action: string;
  time: string;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface TripPartner {
  id: string;
  nickname: string;
  avatarUrl?: string | null;
  ttiCode?: string | null;
}

/** A past or ongoing trip, listed in the My page archive. */
export interface TripSummary {
  tripId: string;
  matchId: string;
  partner?: TripPartner | null;
  title?: string | null;
  region?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  attractionCount: number;
  savedCount: number;
  itineraryDayCount: number;
  createdAt?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'bearer' | string;
  user: UserProfile;
}
