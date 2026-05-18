export type TtiAxis = 'PW' | 'NC' | 'FA' | 'HS';
export type TtiLetter = 'P' | 'W' | 'N' | 'C' | 'F' | 'A' | 'H' | 'S';
export type TtiCode = `${'P' | 'W'}${'N' | 'C'}${'F' | 'A'}${'H' | 'S'}`;

export interface UserProfile {
  id: string;
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
}

export type ItineraryItemType = 'place' | 'move' | 'meal' | 'rest';

export interface ItineraryItem {
  id: string;
  day: number;
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
