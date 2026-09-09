import { create } from 'zustand';
import type { AgentRunResponse, Attraction, ItineraryDay, JointPreference, MatchCandidate, PairPreferences, PreferenceProposal, SafetyAlert, TripSummary, TtiAnswer, TtiQuestion, TtiResult, UserProfile } from '../../../types';
import { oddtripService } from '../api/oddtripService';
import { useNotificationStore } from '../../notification/model/notificationStore';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface TripState {
  user?: UserProfile;
  questions: TtiQuestion[];
  answers: TtiAnswer[];
  result?: TtiResult;
  matches: MatchCandidate[];
  selectedMatch?: MatchCandidate;
  activeTripId?: string;
  tripHistory: TripSummary[];
  preferences: JointPreference;
  pairPreferences?: PairPreferences;
  preferenceProposals: PreferenceProposal[];
  attractions: Attraction[];
  agentRun?: AgentRunResponse;
  itinerary: ItineraryDay[];
  alerts: SafetyAlert[];
  decisionSuggestion?: string;
  status: Record<string, Status>;
  error?: string;
  login: (email: string, password: string) => Promise<boolean>;
  register: (input: { email: string; password: string; nickname: string; homeRegion?: string }) => Promise<boolean>;
  logout: () => void;
  bootstrap: () => Promise<void>;
  loadQuestions: () => Promise<void>;
  setAnswer: (answer: TtiAnswer) => void;
  calculateResult: () => Promise<TtiResult | undefined>;
  loadResult: () => Promise<void>;
  loadTripHistory: () => Promise<void>;
  openTrip: (tripId: string) => Promise<void>;
  loadMatches: () => Promise<void>;
  selectMatch: (id: string) => void;
  ensureTrip: () => Promise<string | undefined>;
  updatePreferences: (patch: Partial<JointPreference>) => void;
  savePreferences: () => Promise<void>;
  loadCoordination: () => Promise<void>;
  proposePreferences: () => Promise<boolean>;
  respondPreferenceProposal: (proposalId: string, action: 'accept' | 'reject') => Promise<boolean>;
  resolveDecisionConflict: (conflicts: string[]) => Promise<void>;
  loadAttractions: () => Promise<void>;
  runTravelAgent: () => Promise<void>;
  toggleAttraction: (id: string, key: 'saved' | 'excluded') => Promise<void>;
  loadItinerary: () => Promise<void>;
  regenerateItinerary: () => Promise<void>;
  loadAlerts: () => Promise<void>;
  updateProfile: (input: { nickname?: string; homeRegion?: string; avatarUrl?: string }) => Promise<boolean>;
}

const initialPreferences: JointPreference = {
  places: [],
  activities: [],
  foods: [],
  pace: 50,
  budget: 50,
  indoorPreferred: false,
  hiddenSpots: false
};

export const useTripStore = create<TripState>((set, get) => ({
  questions: [],
  answers: [],
  matches: [],
  preferences: initialPreferences,
  preferenceProposals: [],
  attractions: [],
  itinerary: [],
  alerts: [],
  tripHistory: [],
  status: {},
  async login(email, password) {
    set((state) => ({ status: { ...state.status, auth: 'loading' }, error: undefined }));
    try {
      const response = await oddtripService.login(email, password);
      set((state) => ({
        user: response.data.user,
        status: { ...state.status, auth: 'success', user: 'success' },
        error: undefined,
      }));
      return true;
    } catch (error) {
      set((state) => ({ error: error instanceof Error ? error.message : '로그인에 실패했습니다.', status: { ...state.status, auth: 'error' } }));
      return false;
    }
  },
  async register(input) {
    set((state) => ({ status: { ...state.status, auth: 'loading' }, error: undefined }));
    try {
      const response = await oddtripService.register(input);
      set((state) => ({
        user: response.data.user,
        status: { ...state.status, auth: 'success', user: 'success' },
        error: undefined,
      }));
      return true;
    } catch (error) {
      set((state) => ({ error: error instanceof Error ? error.message : '회원가입에 실패했습니다.', status: { ...state.status, auth: 'error' } }));
      return false;
    }
  },
  logout() {
    // Revoking the refresh token server-side is best effort; the local session
    // is cleared immediately either way. logout() never rejects.
    void oddtripService.logout();
    // The tray lives in its own store, so it would otherwise keep the previous
    // account's notifications on screen for the next person who signs in.
    useNotificationStore.getState().reset();
    set({
      user: undefined,
      questions: [],
      answers: [],
      result: undefined,
      matches: [],
      selectedMatch: undefined,
      activeTripId: undefined,
      preferences: initialPreferences,
      pairPreferences: undefined,
      preferenceProposals: [],
      attractions: [],
      agentRun: undefined,
      itinerary: [],
      alerts: [],
      decisionSuggestion: undefined,
      status: {},
      error: undefined,
    });
  },
  async bootstrap() {
    if (!oddtripService.hasAuthToken()) {
      set((state) => ({ status: { ...state.status, user: 'idle' } }));
      return;
    }
    set((state) => ({ status: { ...state.status, user: 'loading' } }));
    try {
      const response = await oddtripService.getCurrentUser();
      set((state) => ({ user: response.data, status: { ...state.status, user: 'success' } }));
      // The result lives on the server, so restore it instead of making a
      // returning user retake the test.
      if (response.data.ttiCode) {
        const saved = await oddtripService.getTtiResult().catch(() => undefined);
        if (saved?.data) set({ result: saved.data });
      }
    } catch {
      set((state) => ({ error: '사용자 정보를 불러오지 못했습니다.', status: { ...state.status, user: 'error' } }));
    }
  },
  async updateProfile(input) {
    set((state) => ({ status: { ...state.status, profile: 'loading' }, error: undefined }));
    try {
      const response = await oddtripService.updateProfile(input);
      set((state) => ({ user: response.data, status: { ...state.status, profile: 'success' } }));
      return true;
    } catch (error) {
      set((state) => ({ error: error instanceof Error ? error.message : '프로필을 저장하지 못했습니다.', status: { ...state.status, profile: 'error' } }));
      return false;
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
        pairPreferences: undefined,
        preferenceProposals: [],
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
  async loadResult() {
    // Unlike calculateResult this only reads what the server already has, so
    // it must not reset matches, trip or itinerary state.
    if (get().result) return;
    try {
      const response = await oddtripService.getTtiResult();
      if (response.data) {
        set((state) => ({ result: response.data ?? undefined, status: { ...state.status, tti: 'success' } }));
      }
    } catch {
      set((state) => ({ error: 'TTI 결과를 불러오지 못했습니다.' }));
    }
  },
  async loadTripHistory() {
    set((state) => ({ status: { ...state.status, tripHistory: 'loading' } }));
    try {
      const response = await oddtripService.getTrips();
      set((state) => ({ tripHistory: response.data, status: { ...state.status, tripHistory: 'success' } }));
    } catch {
      set((state) => ({ error: '여행 기록을 불러오지 못했습니다.', status: { ...state.status, tripHistory: 'error' } }));
    }
  },
  async openTrip(tripId) {
    // Reopening a past trip: point the working state at it and pull that
    // trip's data, replacing whatever the current session had loaded.
    set((state) => ({
      activeTripId: tripId,
      attractions: [],
      itinerary: [],
      alerts: [],
      agentRun: undefined,
      decisionSuggestion: undefined,
      pairPreferences: undefined,
      preferenceProposals: [],
      status: { ...state.status, attractions: 'idle', itinerary: 'idle', alerts: 'idle', trip: 'success' },
    }));
    try {
      const [attractions, itinerary, preferences, pair, proposals] = await Promise.all([
        oddtripService.getAttractions(tripId),
        oddtripService.getItinerary(tripId),
        oddtripService.getPreferences(tripId),
        oddtripService.getPairPreferences(tripId),
        oddtripService.getPreferenceProposals(tripId),
      ]);
      set((state) => ({
        attractions: attractions.data,
        itinerary: itinerary.data,
        preferences: pair.data.mine?.preferences ?? preferences.data,
        pairPreferences: pair.data,
        preferenceProposals: proposals.data,
        status: { ...state.status, attractions: 'success', itinerary: 'success', preferences: 'success' },
      }));
    } catch {
      set({ error: '여행을 여는 데 실패했습니다.' });
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

    set((state) => ({ status: { ...state.status, trip: 'loading' } }));
    try {
      // A trip is created only when a match request is accepted. Reopening a
      // workspace must never invoke the deprecated direct-accept endpoint.
      const response = await oddtripService.getTrips();
      const trip = response.data.find((item) => !['completed', 'cancelled'].includes(item.status)) ?? response.data[0];
      const tripId = trip?.tripId;
      if (!tripId) {
        set((state) => ({
          tripHistory: response.data,
          error: '진행 중인 여행이 없습니다. 먼저 동행 요청을 주고받아 주세요.',
          status: { ...state.status, trip: 'error' },
        }));
        return undefined;
      }
      const [preferences, pair, proposals] = await Promise.all([
        oddtripService.getPreferences(tripId).catch(() => undefined),
        oddtripService.getPairPreferences(tripId).catch(() => undefined),
        oddtripService.getPreferenceProposals(tripId).catch(() => undefined),
      ]);
      set((state) => ({
        activeTripId: tripId,
        tripHistory: response.data,
        preferences: pair?.data.mine?.preferences ?? preferences?.data ?? state.preferences,
        pairPreferences: pair?.data,
        preferenceProposals: proposals?.data ?? [],
        status: { ...state.status, trip: 'success', preferences: preferences ? 'success' : state.status.preferences },
      }));
      return tripId;
    } catch {
      set((state) => ({ error: '여행 공간을 불러오지 못했습니다.', status: { ...state.status, trip: 'error' } }));
      return undefined;
    }
  },
  updatePreferences(patch) {
    set((state) => ({ preferences: { ...state.preferences, ...patch } }));
  },
  async savePreferences() {
    // A deep link can be edited before the trip workspace finishes loading.
    // Preserve the form draft so ensureTrip() cannot replace it with the
    // previously saved server value immediately before PUT.
    const draft = get().preferences;
    const tripId = await get().ensureTrip();
    if (!tripId) return;

    set((state) => ({ status: { ...state.status, preferences: 'loading' } }));
    try {
      await oddtripService.saveMyPreferences(tripId, draft);
      const pair = await oddtripService.getPairPreferences(tripId);
      set((state) => ({ preferences: draft, pairPreferences: pair.data, status: { ...state.status, preferences: 'success' } }));
    } catch {
      set((state) => ({ error: '내 선호를 저장하지 못했습니다.', status: { ...state.status, preferences: 'error' } }));
    }
  },
  async loadCoordination() {
    const tripId = get().activeTripId ?? await get().ensureTrip();
    if (!tripId) return;
    set((state) => ({ status: { ...state.status, coordination: 'loading' } }));
    try {
      const [pair, proposals] = await Promise.all([
        oddtripService.getPairPreferences(tripId),
        oddtripService.getPreferenceProposals(tripId),
      ]);
      set((state) => ({
        pairPreferences: pair.data,
        preferenceProposals: proposals.data,
        preferences: pair.data.mine?.preferences ?? state.preferences,
        status: { ...state.status, coordination: 'success' },
      }));
    } catch (error) {
      set((state) => ({ error: error instanceof Error ? error.message : '조율 정보를 불러오지 못했습니다.', status: { ...state.status, coordination: 'error' } }));
    }
  },
  async proposePreferences() {
    const tripId = get().activeTripId ?? await get().ensureTrip();
    if (!tripId) return false;
    set((state) => ({ status: { ...state.status, proposal: 'loading' } }));
    try {
      const preferences = get().preferences;
      await oddtripService.saveMyPreferences(tripId, preferences);
      await oddtripService.createPreferenceProposal(tripId, preferences);
      const [pair, proposals] = await Promise.all([
        oddtripService.getPairPreferences(tripId),
        oddtripService.getPreferenceProposals(tripId),
      ]);
      set((state) => ({ pairPreferences: pair.data, preferenceProposals: proposals.data, status: { ...state.status, proposal: 'success', preferences: 'success' } }));
      return true;
    } catch (error) {
      set((state) => ({ error: error instanceof Error ? error.message : '합의안을 제안하지 못했습니다.', status: { ...state.status, proposal: 'error' } }));
      return false;
    }
  },
  async respondPreferenceProposal(proposalId, action) {
    const tripId = get().activeTripId ?? await get().ensureTrip();
    if (!tripId) return false;
    set((state) => ({ status: { ...state.status, proposal: 'loading' } }));
    try {
      await oddtripService.respondPreferenceProposal(tripId, proposalId, action);
      const [pair, proposals] = await Promise.all([
        oddtripService.getPairPreferences(tripId),
        oddtripService.getPreferenceProposals(tripId),
      ]);
      set((state) => ({ pairPreferences: pair.data, preferenceProposals: proposals.data, status: { ...state.status, proposal: 'success' } }));
      return true;
    } catch (error) {
      set((state) => ({ error: error instanceof Error ? error.message : '합의안에 응답하지 못했습니다.', status: { ...state.status, proposal: 'error' } }));
      return false;
    }
  },
  async resolveDecisionConflict(conflicts) {
    const tripId = await get().ensureTrip();
    if (!tripId) return;

    set((state) => ({ status: { ...state.status, conflict: 'loading' } }));
    try {
      await oddtripService.saveMyPreferences(tripId, get().preferences);
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
  async regenerateItinerary() {
    // loadItinerary only generates when nothing is stored yet, so saving or
    // excluding attractions afterwards has no effect until we ask for a rebuild.
    set((state) => ({ status: { ...state.status, itinerary: 'loading' } }));
    try {
      const tripId = await get().ensureTrip();
      if (!tripId) {
        set((state) => ({ status: { ...state.status, itinerary: 'error' } }));
        return;
      }
      const response = await oddtripService.generateItinerary(tripId);
      set((state) => ({ itinerary: response.data, status: { ...state.status, itinerary: 'success' } }));
    } catch {
      set((state) => ({ error: '일정을 다시 만들지 못했습니다.', status: { ...state.status, itinerary: 'error' } }));
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
      set((state) => ({ error: '날씨와 주의사항을 불러오지 못했습니다.', status: { ...state.status, alerts: 'error' } }));
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
