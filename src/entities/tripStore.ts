import { create } from 'zustand';
import type { AgentRunResponse, Attraction, ItineraryDay, JointPreference, MatchCandidate, SafetyAlert, TtiAnswer, TtiQuestion, TtiResult, UserProfile } from '../types';
import { oddtripService } from '../services/oddtripService';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface TripState {
  user?: UserProfile;
  questions: TtiQuestion[];
  answers: TtiAnswer[];
  result?: TtiResult;
  matches: MatchCandidate[];
  selectedMatch?: MatchCandidate;
  activeTripId?: string;
  preferences: JointPreference;
  attractions: Attraction[];
  agentRun?: AgentRunResponse;
  itinerary: ItineraryDay[];
  alerts: SafetyAlert[];
  decisionSuggestion?: string;
  status: Record<string, Status>;
  error?: string;
  bootstrap: () => Promise<void>;
  loadQuestions: () => Promise<void>;
  setAnswer: (answer: TtiAnswer) => void;
  calculateResult: () => Promise<TtiResult | undefined>;
  loadMatches: () => Promise<void>;
  selectMatch: (id: string) => void;
  ensureTrip: () => Promise<string | undefined>;
  updatePreferences: (patch: Partial<JointPreference>) => void;
  savePreferences: () => Promise<void>;
  resolveDecisionConflict: (conflicts: string[]) => Promise<void>;
  loadAttractions: () => Promise<void>;
  runTravelAgent: () => Promise<void>;
  toggleAttraction: (id: string, key: 'saved' | 'excluded') => Promise<void>;
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
  questions: [],
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
      const response = await oddtripService.getCurrentUser();
      set((state) => ({ user: response.data, status: { ...state.status, user: 'success' } }));
    } catch {
      set((state) => ({ error: '사용자 정보를 불러오지 못했습니다.', status: { ...state.status, user: 'error' } }));
    }
  },
  async loadQuestions() {
    if (get().questions.length) return;
    set((state) => ({ status: { ...state.status, questions: 'loading' } }));
    try {
      const response = await oddtripService.getTtiQuestions();
      set((state) => ({ questions: response.data, status: { ...state.status, questions: 'success' } }));
    } catch {
      set((state) => ({ error: 'TTI 질문을 불러오지 못했습니다.', status: { ...state.status, questions: 'error' } }));
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
      const response = await oddtripService.calculateTtiResult(get().answers);
      set((state) => ({
        result: response.data,
        user: state.user ? { ...state.user, ttiCode: response.data.code } : state.user,
        matches: [],
        selectedMatch: undefined,
        activeTripId: undefined,
        attractions: [],
        agentRun: undefined,
        itinerary: [],
        alerts: [],
        decisionSuggestion: undefined,
        status: {
          ...state.status,
          tti: 'success',
          matches: 'idle',
          trip: 'idle',
          attractions: 'idle',
          agent: 'idle',
          itinerary: 'idle',
          alerts: 'idle'
        }
      }));
      return response.data;
    } catch {
      set((state) => ({ error: 'TTI 결과를 계산하지 못했습니다.', status: { ...state.status, tti: 'error' } }));
      return undefined;
    }
  },
  async loadMatches() {
    set((state) => ({ status: { ...state.status, matches: 'loading' } }));
    try {
      const response = await oddtripService.getMatches();
      set((state) => ({ matches: response.data, status: { ...state.status, matches: 'success' } }));
    } catch {
      set((state) => ({ error: '매칭 후보를 불러오지 못했습니다.', status: { ...state.status, matches: 'error' } }));
    }
  },
  selectMatch(id) {
    set((state) => ({ selectedMatch: state.matches.find((match) => match.id === id) ?? state.selectedMatch }));
  },
  async ensureTrip() {
    const current = get();
    if (current.activeTripId) return current.activeTripId;

    const match = current.selectedMatch ?? current.matches[0];
    if (!match) {
      set((state) => ({ error: '먼저 매칭 상대를 선택해주세요.', status: { ...state.status, trip: 'error' } }));
      return undefined;
    }

    set((state) => ({ status: { ...state.status, trip: 'loading' } }));
    try {
      const response = await oddtripService.acceptMatch(match.id);
      const tripId = response.data.tripId ?? undefined;
      set((state) => ({ activeTripId: tripId, selectedMatch: match, status: { ...state.status, trip: 'success' } }));
      return tripId;
    } catch {
      set((state) => ({ error: '공동 여행을 만들지 못했습니다.', status: { ...state.status, trip: 'error' } }));
      return undefined;
    }
  },
  updatePreferences(patch) {
    set((state) => ({ preferences: { ...state.preferences, ...patch } }));
  },
  async savePreferences() {
    const tripId = await get().ensureTrip();
    if (!tripId) return;

    set((state) => ({ status: { ...state.status, preferences: 'loading' } }));
    try {
      await oddtripService.savePreferences(tripId, get().preferences);
      set((state) => ({ status: { ...state.status, preferences: 'success' } }));
    } catch {
      set((state) => ({ error: '공동 선호를 저장하지 못했습니다.', status: { ...state.status, preferences: 'error' } }));
    }
  },
  async resolveDecisionConflict(conflicts) {
    const tripId = await get().ensureTrip();
    if (!tripId) return;

    set((state) => ({ status: { ...state.status, conflict: 'loading' } }));
    try {
      await oddtripService.savePreferences(tripId, get().preferences);
      const response = await oddtripService.resolveConflict(tripId, conflicts);
      set((state) => ({
        decisionSuggestion: response.data.suggestion,
        status: { ...state.status, conflict: 'success', preferences: 'success' }
      }));
    } catch {
      set((state) => ({
        error: 'AI 조정안을 생성하지 못했습니다.',
        status: { ...state.status, conflict: 'error' }
      }));
    }
  },
  async loadAttractions() {
    const current = get();
    if (current.status.attractions === 'loading') return;
    if (current.attractions.length) return;

    set((state) => ({ status: { ...state.status, attractions: 'loading' } }));
    try {
      const tripId = await get().ensureTrip();
      if (!tripId) {
        set((state) => ({ status: { ...state.status, attractions: 'error' } }));
        return;
      }
      let response = await oddtripService.getAttractions(tripId);
      if (!response.data.length) {
        response = await oddtripService.generatePublicAttractions(tripId, buildAttractionRequest(get()));
      }
      set((state) => ({ attractions: response.data, status: { ...state.status, attractions: 'success' } }));
    } catch {
      set((state) => ({ error: '관광지 추천을 불러오지 못했습니다.', status: { ...state.status, attractions: 'error' } }));
    }
  },
  async runTravelAgent() {
    const current = get();
    if (current.status.agent === 'loading') return;

    set((state) => ({ status: { ...state.status, agent: 'loading' } }));
    try {
      const tripId = await get().ensureTrip();
      if (!tripId) {
        set((state) => ({ status: { ...state.status, agent: 'error' } }));
        return;
      }

      const response = await oddtripService.runTravelAgent(tripId, {
        keywords: buildAttractionRequest(get()).keywords,
        contentTypeIds: buildAttractionRequest(get()).contentTypeIds,
        budget: get().preferences.budget,
        pace: get().preferences.pace
      });
      const attractionsResponse = await oddtripService.getAttractions(tripId);
      set((state) => ({
        agentRun: response.data,
        attractions: attractionsResponse.data,
        status: { ...state.status, agent: 'success', attractions: 'success' }
      }));
    } catch {
      set((state) => ({
        error: 'AI 에이전트 추천을 실행하지 못했습니다.',
        status: { ...state.status, agent: 'error' }
      }));
    }
  },
  async toggleAttraction(id, key) {
    const tripId = get().activeTripId;
    const current = get().attractions.find((item) => item.id === id);
    if (!tripId || !current) return;

    const nextValue = !current[key];
    set((state) => ({
      attractions: state.attractions.map((item) => (item.id === id ? { ...item, [key]: nextValue } : item))
    }));

    try {
      const response = await oddtripService.toggleAttraction(tripId, id, { [key]: nextValue });
      set((state) => ({
        attractions: state.attractions.map((item) => (item.id === id ? response.data : item))
      }));
    } catch {
      set((state) => ({
        error: '관광지 상태를 저장하지 못했습니다.',
        attractions: state.attractions.map((item) => (item.id === id ? { ...item, [key]: current[key] } : item))
      }));
    }
  },
  async loadItinerary() {
    const current = get();
    if (current.status.itinerary === 'loading') return;
    if (current.itinerary.length) return;

    set((state) => ({ status: { ...state.status, itinerary: 'loading' } }));
    try {
      const tripId = await get().ensureTrip();
      if (!tripId) {
        set((state) => ({ status: { ...state.status, itinerary: 'error' } }));
        return;
      }
      let response = await oddtripService.getItinerary(tripId);
      if (!response.data.length) {
        response = await oddtripService.generateItinerary(tripId);
      }
      set((state) => ({ itinerary: response.data, status: { ...state.status, itinerary: 'success' } }));
    } catch {
      set((state) => ({ error: '일정을 생성하지 못했습니다.', status: { ...state.status, itinerary: 'error' } }));
    }
  },
  async loadAlerts() {
    set((state) => ({ status: { ...state.status, alerts: 'loading' } }));
    try {
      const tripId = await get().ensureTrip();
      if (!tripId) return;
      const response = await oddtripService.getSafetyAlerts(tripId);
      set((state) => ({ alerts: response.data, status: { ...state.status, alerts: 'success' } }));
    } catch {
      set((state) => ({ error: '안전 알림을 불러오지 못했습니다.', status: { ...state.status, alerts: 'error' } }));
    }
  }
}));

function buildAttractionRequest(state: TripState) {
  const code = state.result?.code ?? state.user?.ttiCode ?? '';
  const keywords = new Set<string>([
    ...state.preferences.places,
    ...state.preferences.activities,
    ...state.preferences.foods,
  ]);
  const contentTypeIds = new Set<string>(['12', '14', '15', '28', '32', '39']);

  if (code[0] === 'W') {
    keywords.add('예약');
    keywords.add('박물관');
  } else if (code[0] === 'P') {
    keywords.add('골목');
    keywords.add('산책');
  }

  if (code[1] === 'N') {
    keywords.add('체험');
    keywords.add('로컬');
    contentTypeIds.add('28');
  } else if (code[1] === 'C') {
    keywords.add('명소');
    keywords.add('맛집');
  }

  if (code[2] === 'A') {
    keywords.add('레포츠');
    keywords.add('축제');
    contentTypeIds.add('15');
    contentTypeIds.add('28');
  } else if (code[2] === 'F') {
    keywords.add('카페');
    keywords.add('전시');
    contentTypeIds.add('14');
    contentTypeIds.add('39');
  }

  if (code[3] === 'H') {
    keywords.add('숨은 명소');
    keywords.add('시장');
  } else if (code[3] === 'S') {
    keywords.add('랜드마크');
    keywords.add('전망');
  }

  return {
    keywords: Array.from(keywords).filter(Boolean).slice(0, 6),
    contentTypeIds: Array.from(contentTypeIds),
    limit: 8,
    fast: true,
  };
}
