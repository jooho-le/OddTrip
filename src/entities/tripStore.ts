import { create } from 'zustand';
import type { Attraction, ItineraryDay, JointPreference, MatchCandidate, SafetyAlert, TtiAnswer, TtiResult, UserProfile } from '../types';
import { mockOddtripService } from '../services/oddtripService';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface TripState {
  user?: UserProfile;
  answers: TtiAnswer[];
  result?: TtiResult;
  matches: MatchCandidate[];
  selectedMatch?: MatchCandidate;
  preferences: JointPreference;
  attractions: Attraction[];
  itinerary: ItineraryDay[];
  alerts: SafetyAlert[];
  status: Record<string, Status>;
  error?: string;
  bootstrap: () => Promise<void>;
  setAnswer: (answer: TtiAnswer) => void;
  calculateResult: () => Promise<TtiResult | undefined>;
  loadMatches: () => Promise<void>;
  selectMatch: (id: string) => void;
  updatePreferences: (patch: Partial<JointPreference>) => void;
  loadAttractions: () => Promise<void>;
  toggleAttraction: (id: string, key: 'saved' | 'excluded') => void;
  loadItinerary: () => Promise<void>;
  loadAlerts: () => Promise<void>;
}

const initialPreferences: JointPreference = {
  places: ['골목', '전시', '전망'],
  activities: ['산책', '공방 체험'],
  foods: ['한식', '카페'],
  pace: 55,
  budget: 60,
  indoorPreferred: true,
  hiddenSpots: true
};

export const useTripStore = create<TripState>((set, get) => ({
  answers: [],
  matches: [],
  preferences: initialPreferences,
  attractions: [],
  itinerary: [],
  alerts: [],
  status: {},
  async bootstrap() {
    set((state) => ({ status: { ...state.status, user: 'loading' } }));
    try {
      const response = await mockOddtripService.getCurrentUser();
      set((state) => ({ user: response.data, status: { ...state.status, user: 'success' } }));
    } catch {
      set((state) => ({ error: '사용자 정보를 불러오지 못했습니다.', status: { ...state.status, user: 'error' } }));
    }
  },
  setAnswer(answer) {
    set((state) => ({
      answers: [...state.answers.filter((item) => item.questionId !== answer.questionId), answer]
    }));
  },
  async calculateResult() {
    set((state) => ({ status: { ...state.status, tti: 'loading' } }));
    try {
      const response = await mockOddtripService.calculateTtiResult(get().answers);
      set((state) => ({ result: response.data, user: state.user ? { ...state.user, ttiCode: response.data.code } : state.user, status: { ...state.status, tti: 'success' } }));
      return response.data;
    } catch {
      set((state) => ({ error: 'TTI 결과를 계산하지 못했습니다.', status: { ...state.status, tti: 'error' } }));
      return undefined;
    }
  },
  async loadMatches() {
    set((state) => ({ status: { ...state.status, matches: 'loading' } }));
    try {
      const response = await mockOddtripService.getMatches(get().result?.code ?? 'PNFH');
      set((state) => ({ matches: response.data, status: { ...state.status, matches: 'success' } }));
    } catch {
      set((state) => ({ error: '매칭 후보를 불러오지 못했습니다.', status: { ...state.status, matches: 'error' } }));
    }
  },
  selectMatch(id) {
    set((state) => ({ selectedMatch: state.matches.find((match) => match.id === id) ?? state.selectedMatch }));
  },
  updatePreferences(patch) {
    set((state) => ({ preferences: { ...state.preferences, ...patch } }));
  },
  async loadAttractions() {
    set((state) => ({ status: { ...state.status, attractions: 'loading' } }));
    try {
      const response = await mockOddtripService.getAttractions();
      set((state) => ({ attractions: response.data, status: { ...state.status, attractions: 'success' } }));
    } catch {
      set((state) => ({ error: '관광지 추천을 불러오지 못했습니다.', status: { ...state.status, attractions: 'error' } }));
    }
  },
  toggleAttraction(id, key) {
    set((state) => ({
      attractions: state.attractions.map((item) => (item.id === id ? { ...item, [key]: !item[key] } : item))
    }));
  },
  async loadItinerary() {
    set((state) => ({ status: { ...state.status, itinerary: 'loading' } }));
    try {
      const response = await mockOddtripService.getItinerary();
      set((state) => ({ itinerary: response.data, status: { ...state.status, itinerary: 'success' } }));
    } catch {
      set((state) => ({ error: '일정을 생성하지 못했습니다.', status: { ...state.status, itinerary: 'error' } }));
    }
  },
  async loadAlerts() {
    set((state) => ({ status: { ...state.status, alerts: 'loading' } }));
    try {
      const response = await mockOddtripService.getSafetyAlerts();
      set((state) => ({ alerts: response.data, status: { ...state.status, alerts: 'success' } }));
    } catch {
      set((state) => ({ error: '안전 알림을 불러오지 못했습니다.', status: { ...state.status, alerts: 'error' } }));
    }
  }
}));
