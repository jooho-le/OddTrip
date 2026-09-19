import { create } from 'zustand';
import type { AgentRunResponse, Attraction, ItineraryDay, JointPreference, MatchCandidate, PairPreferences, PreferenceProposal, SafetyAlert, TripApprovalAction, TripApprovalState, TripCreateInput, TripSummary, TripUpdateInput, TtiAnswer, TtiQuestion, TtiResult, UserProfile } from '../../../types';
import { oddtripService } from '../api/oddtripService';
import { ApiError } from '../../../shared/api/client';
import { useNotificationStore } from '../../notification/model/notificationStore';
import { useConsentStore } from '../../consent/model/consentStore';
import type { ConsentDecision } from '../../consent/api/consentService';
import { mergePairPreferences, tourAreaCode, tripDurationDays } from './aiJourney';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface TripState {
  user?: UserProfile;
  questions: TtiQuestion[];
  answers: TtiAnswer[];
  result?: TtiResult;
  matches: MatchCandidate[];
  /** 403으로 후보를 못 받은 상태. 고장이 아니라 매칭 동의 전이라는 뜻. */
  matchesConsentRequired: boolean;
  selectedMatch?: MatchCandidate;
  activeTripId?: string;
  hydratedTripId?: string;
  tripHistory: TripSummary[];
  preferences: JointPreference;
  pairPreferences?: PairPreferences;
  preferenceProposals: PreferenceProposal[];
  attractions: Attraction[];
  agentRun?: AgentRunResponse;
  itinerary: ItineraryDay[];
  approval?: TripApprovalState;
  alerts: SafetyAlert[];
  decisionSuggestion?: string;
  status: Record<string, Status>;
  error?: string;
  login: (email: string, password: string) => Promise<boolean>;
  register: (input: { email: string; password: string; nickname: string; homeRegion?: string; consents: ConsentDecision[] }) => Promise<boolean>;
  logout: () => void;
  withdraw: (password?: string) => Promise<boolean>;
  bootstrap: () => Promise<void>;
  loadQuestions: () => Promise<void>;
  setAnswer: (answer: TtiAnswer) => void;
  calculateResult: () => Promise<TtiResult | undefined>;
  loadResult: () => Promise<void>;
  loadTripHistory: () => Promise<void>;
  openTrip: (tripId: string) => Promise<boolean>;
  createTrip: (input: TripCreateInput) => Promise<TripSummary | undefined>;
  updateTrip: (tripId: string, input: TripUpdateInput) => Promise<boolean>;
  cancelTrip: (tripId: string) => Promise<boolean>;
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
  generateAiItinerary: () => Promise<boolean>;
  toggleAttraction: (id: string, key: 'saved' | 'excluded') => Promise<void>;
  loadItinerary: () => Promise<void>;
  regenerateItinerary: () => Promise<void>;
  loadApproval: () => Promise<void>;
  respondApproval: (action: TripApprovalAction, comment?: string) => Promise<boolean>;
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

// 로그아웃과 탈퇴가 같은 상태를 비웁니다. 한쪽만 늘어나면 다음 사용자에게
// 이전 계정의 흔적이 남으므로 한 곳에서 관리합니다.
function clearedSession(): Partial<TripState> {
  return {
      user: undefined,
      questions: [],
      answers: [],
      result: undefined,
      matches: [],
      matchesConsentRequired: false,
      selectedMatch: undefined,
      activeTripId: undefined,
      hydratedTripId: undefined,
      preferences: initialPreferences,
      pairPreferences: undefined,
      preferenceProposals: [],
      attractions: [],
      agentRun: undefined,
      itinerary: [],
      approval: undefined,
      alerts: [],
      decisionSuggestion: undefined,
      status: {},
      error: undefined,
  };
}

export const useTripStore = create<TripState>((set, get) => ({
  questions: [],
  answers: [],
  matches: [],
  matchesConsentRequired: false,
  preferences: initialPreferences,
  preferenceProposals: [],
  attractions: [],
  itinerary: [],
  approval: undefined,
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
  async withdraw(password) {
    set((state) => ({ status: { ...state.status, auth: 'loading' }, error: undefined }));
    try {
      await oddtripService.withdraw(password);
    } catch (error) {
      // 비밀번호 오류가 가장 흔한 실패이므로 세션을 건드리지 않고 화면에 남깁니다.
      set((state) => ({
        error: error instanceof Error ? error.message : '회원 탈퇴에 실패했습니다.',
        status: { ...state.status, auth: 'error' },
      }));
      return false;
    }
    // 서버에서 계정이 닫혔으므로 로그아웃과 같은 정리를 합니다. 다만 폐기된
    // 리프레시 토큰으로 로그아웃을 또 호출할 필요는 없습니다.
    useNotificationStore.getState().reset();
    useConsentStore.getState().reset();
    set(clearedSession());
    return true;
  },
  logout() {
    // Revoking the refresh token server-side is best effort; the local session
    // is cleared immediately either way. logout() never rejects.
    void oddtripService.logout();
    // The tray lives in its own store, so it would otherwise keep the previous
    // account's notifications on screen for the next person who signs in.
    useNotificationStore.getState().reset();
    // Same for consent: leaving the previous account's status behind would
    // open the matching gates for whoever signs in next.
    useConsentStore.getState().reset();
    set(clearedSession());
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
        hydratedTripId: undefined,
        pairPreferences: undefined,
        preferenceProposals: [],
        attractions: [],
        agentRun: undefined,
        itinerary: [],
        approval: undefined,
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
    set((state) => ({
      activeTripId: tripId,
      hydratedTripId: undefined,
      preferences: initialPreferences,
      attractions: [],
      itinerary: [],
      approval: undefined,
      alerts: [],
      agentRun: undefined,
      decisionSuggestion: undefined,
      pairPreferences: undefined,
      preferenceProposals: [],
      error: undefined,
      status: { ...state.status, attractions: 'loading', itinerary: 'loading', preferences: 'loading', alerts: 'idle', trip: 'loading' },
    }));
    try {
      const trip = await oddtripService.getTrip(tripId);
      const [attractions, itinerary, preferences, pair] = await Promise.all([
        oddtripService.getAttractions(tripId).catch(() => undefined),
        oddtripService.getItinerary(tripId).catch(() => undefined),
        oddtripService.getPreferences(tripId).catch(() => undefined),
        oddtripService.getPairPreferences(tripId).catch(() => undefined),
      ]);
      if (get().activeTripId !== tripId) return false;
      set((state) => ({
        hydratedTripId: tripId,
        tripHistory: [trip.data, ...state.tripHistory.filter((item) => item.tripId !== tripId)],
        attractions: attractions?.data ?? [],
        itinerary: itinerary?.data ?? [],
        preferences: pair?.data.mine?.preferences ?? preferences?.data ?? state.preferences,
        pairPreferences: pair?.data,
        preferenceProposals: [],
        approval: undefined,
        status: {
          ...state.status,
          trip: 'success',
          attractions: attractions ? 'success' : 'error',
          itinerary: itinerary ? 'success' : 'error',
          preferences: preferences || pair ? 'success' : 'error',
        },
      }));
      if (pair?.data.bothSubmitted && itinerary && !itinerary.data.length) void get().generateAiItinerary();
      return true;
    } catch (error) {
      if (get().activeTripId !== tripId) return false;
      set((state) => ({
        hydratedTripId: undefined,
        error: error instanceof Error ? error.message : '여행을 여는 데 실패했습니다.',
        status: { ...state.status, trip: 'error' },
      }));
      return false;
    }
  },
  async createTrip(input) {
    set((state) => ({ status: { ...state.status, tripMutation: 'loading' }, error: undefined }));
    try {
      const response = await oddtripService.createTrip(input);
      set((state) => ({
        activeTripId: response.data.tripId,
        hydratedTripId: undefined,
        tripHistory: [response.data, ...state.tripHistory.filter((trip) => trip.tripId !== response.data.tripId)],
        preferences: initialPreferences,
        pairPreferences: undefined,
        preferenceProposals: [],
        attractions: [],
        itinerary: [],
        approval: undefined,
        alerts: [],
        agentRun: undefined,
        decisionSuggestion: undefined,
        status: { ...state.status, tripMutation: 'success', trip: 'success', attractions: 'idle', itinerary: 'idle', approval: 'idle', alerts: 'idle' },
      }));
      return response.data;
    } catch (error) {
      set((state) => ({ error: error instanceof Error ? error.message : '새 여행을 만들지 못했습니다.', status: { ...state.status, tripMutation: 'error' } }));
      return undefined;
    }
  },
  async updateTrip(tripId, input) {
    set((state) => ({ status: { ...state.status, tripMutation: 'loading' }, error: undefined }));
    try {
      const previous = get().tripHistory.find((trip) => trip.tripId === tripId);
      const response = await oddtripService.updateTrip(tripId, input);
      const itineraryInvalidated = Boolean(previous && (
        (input.region !== undefined && input.region !== previous.region)
        || (input.startDate !== undefined && input.startDate !== previous.startDate)
        || (input.endDate !== undefined && input.endDate !== previous.endDate)
      ));
      set((state) => ({
        tripHistory: state.tripHistory.map((trip) => trip.tripId === tripId ? response.data : trip),
        itinerary: state.activeTripId === tripId && itineraryInvalidated ? [] : state.itinerary,
        approval: state.activeTripId === tripId && itineraryInvalidated ? undefined : state.approval,
        alerts: state.activeTripId === tripId && itineraryInvalidated ? [] : state.alerts,
        status: {
          ...state.status,
          tripMutation: 'success',
          itinerary: itineraryInvalidated ? 'idle' : state.status.itinerary,
          approval: itineraryInvalidated ? 'idle' : state.status.approval,
          alerts: itineraryInvalidated ? 'idle' : state.status.alerts,
        },
      }));
      return true;
    } catch (error) {
      set((state) => ({ error: error instanceof Error ? error.message : '여행 정보를 수정하지 못했습니다.', status: { ...state.status, tripMutation: 'error' } }));
      return false;
    }
  },
  async cancelTrip(tripId) {
    set((state) => ({ status: { ...state.status, tripMutation: 'loading' }, error: undefined }));
    try {
      const response = await oddtripService.cancelTrip(tripId);
      set((state) => ({
        activeTripId: state.activeTripId === tripId ? undefined : state.activeTripId,
        hydratedTripId: state.activeTripId === tripId ? undefined : state.hydratedTripId,
        tripHistory: state.tripHistory.map((trip) => trip.tripId === tripId ? {
          ...trip,
          status: response.data.status,
          cancelledAt: response.data.cancelledAt,
          cancelledBy: response.data.cancelledBy,
        } : trip),
        ...(state.activeTripId === tripId ? {
          preferences: initialPreferences,
          pairPreferences: undefined,
          preferenceProposals: [],
          attractions: [],
          itinerary: [],
          approval: undefined,
          alerts: [],
          agentRun: undefined,
          decisionSuggestion: undefined,
        } : {}),
        status: { ...state.status, tripMutation: 'success', trip: state.activeTripId === tripId ? 'idle' : state.status.trip },
      }));
      return true;
    } catch (error) {
      set((state) => ({ error: error instanceof Error ? error.message : '여행을 취소하지 못했습니다.', status: { ...state.status, tripMutation: 'error' } }));
      return false;
    }
  },
  async loadMatches() {
    set((state) => ({ status: { ...state.status, matches: 'loading' } }));
    try {
      const response = await oddtripService.getMatches();
      set((state) => ({ matches: response.data, matchesConsentRequired: false, status: { ...state.status, matches: 'success' } }));
    } catch (caught) {
      // 403은 고장이 아니라 아직 매칭 동의를 하지 않았다는 뜻입니다. 홈처럼
      // 게이트 밖에서 후보를 당겨오는 화면이 에러 배너를 띄우면 안 됩니다.
      if (caught instanceof ApiError && caught.status === 403) {
        set((state) => ({ matches: [], matchesConsentRequired: true, status: { ...state.status, matches: 'success' } }));
        return;
      }
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
      const [preferences, pair] = await Promise.all([
        oddtripService.getPreferences(tripId).catch(() => undefined),
        oddtripService.getPairPreferences(tripId).catch(() => undefined),
      ]);
      set((state) => ({
        activeTripId: tripId,
        tripHistory: response.data,
        preferences: pair?.data.mine?.preferences ?? preferences?.data ?? state.preferences,
        pairPreferences: pair?.data,
        preferenceProposals: [],
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
      if (pair.data.bothSubmitted && !get().itinerary.length) {
        await get().generateAiItinerary();
      }
    } catch {
      set((state) => ({ error: '내 선호를 저장하지 못했습니다.', status: { ...state.status, preferences: 'error' } }));
    }
  },
  async loadCoordination() {
    const tripId = get().activeTripId ?? await get().ensureTrip();
    if (!tripId) return;
    set((state) => ({ status: { ...state.status, coordination: 'loading' } }));
    try {
      const pair = await oddtripService.getPairPreferences(tripId);
      set((state) => ({
        pairPreferences: pair.data,
        preferenceProposals: [],
        preferences: pair.data.mine?.preferences ?? state.preferences,
        status: { ...state.status, coordination: 'success' },
      }));
      if (pair.data.bothSubmitted && !get().itinerary.length) void get().generateAiItinerary();
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
  async generateAiItinerary() {
    const current = get();
    if (current.status.aiItinerary === 'loading') return false;
    if (current.itinerary.length) return true;

    const tripId = current.activeTripId ?? await get().ensureTrip();
    if (!tripId) return false;
    set((state) => ({ status: { ...state.status, aiItinerary: 'loading', itinerary: 'loading' }, error: undefined }));

    try {
      const pairResponse = await oddtripService.getPairPreferences(tripId);
      const combined = mergePairPreferences(pairResponse.data);
      if (!pairResponse.data.bothSubmitted || !combined) {
        set((state) => ({
          pairPreferences: pairResponse.data,
          error: '두 사람의 선호가 모두 제출된 뒤 AI 일정을 만들 수 있습니다.',
          status: { ...state.status, aiItinerary: 'error', itinerary: 'idle' },
        }));
        return false;
      }

      const storedItinerary = await oddtripService.getItinerary(tripId);
      if (storedItinerary.data.length) {
        const storedAttractions = await oddtripService.getAttractions(tripId);
        set((state) => ({
          pairPreferences: pairResponse.data,
          attractions: storedAttractions.data,
          itinerary: storedItinerary.data,
          tripHistory: state.tripHistory.map((item) => item.tripId === tripId ? {
            ...item,
            attractionCount: storedAttractions.data.length,
            itineraryDayCount: storedItinerary.data.length,
          } : item),
          status: {
            ...state.status,
            aiItinerary: 'success',
            attractions: 'success',
            itinerary: 'success',
          },
        }));
        return true;
      }

      const trip = get().tripHistory.find((item) => item.tripId === tripId);
      const attractionRequest = buildAttractionRequest(get(), combined);
      let agentRun: AgentRunResponse | undefined;
      try {
        const response = await oddtripService.runTravelAgent(tripId, {
          areaCode: tourAreaCode(trip?.region),
          keywords: attractionRequest.keywords,
          contentTypeIds: attractionRequest.contentTypeIds,
          days: tripDurationDays(trip),
          budget: combined.budget,
          pace: combined.pace,
          generateItinerary: true,
        });
        agentRun = response.data;
      } catch {
        // The deterministic API path below still creates a usable itinerary
        // when the tool-calling layer is temporarily unavailable.
      }

      let attractionsResponse = await oddtripService.getAttractions(tripId);
      if (!attractionsResponse.data.length) {
        attractionsResponse = await oddtripService.generatePublicAttractions(tripId, {
          ...attractionRequest,
          areaCode: tourAreaCode(trip?.region),
        });
      }

      let itineraryResponse = await oddtripService.getItinerary(tripId);
      if (!itineraryResponse.data.length) {
        itineraryResponse = await oddtripService.generateItinerary(tripId);
      }
      if (!itineraryResponse.data.length) throw new Error('AI 일정 결과가 비어 있습니다. 잠시 후 다시 시도해 주세요.');

      set((state) => ({
        pairPreferences: pairResponse.data,
        attractions: attractionsResponse.data,
        itinerary: itineraryResponse.data,
        agentRun: agentRun ?? state.agentRun,
        tripHistory: state.tripHistory.map((item) => item.tripId === tripId ? {
          ...item,
          attractionCount: attractionsResponse.data.length,
          itineraryDayCount: itineraryResponse.data.length,
        } : item),
        status: {
          ...state.status,
          aiItinerary: 'success',
          attractions: 'success',
          itinerary: 'success',
        },
      }));
      return true;
    } catch (error) {
      set((state) => ({
        error: error instanceof Error ? error.message : 'AI가 일정을 만들지 못했습니다.',
        status: { ...state.status, aiItinerary: 'error', itinerary: 'error' },
      }));
      return false;
    }
  },
  async toggleAttraction(id, key) {
    const tripId = get().activeTripId;
    const current = get().attractions.find((item) => item.id === id);
    if (!tripId || !current) return;

    const nextValue = !current[key];
    const patch = key === 'saved'
      ? { saved: nextValue, ...(nextValue ? { excluded: false } : {}) }
      : { excluded: nextValue, ...(nextValue ? { saved: false } : {}) };
    set((state) => ({
      attractions: state.attractions.map((item) => (item.id === id ? { ...item, ...patch } : item))
    }));

    try {
      const response = await oddtripService.toggleAttraction(tripId, id, patch);
      set((state) => ({
        attractions: state.attractions.map((item) => (item.id === id ? response.data : item))
      }));
    } catch {
      set((state) => ({
        error: '관광지 상태를 저장하지 못했습니다.',
        attractions: state.attractions.map((item) => (item.id === id ? { ...item, saved: current.saved, excluded: current.excluded } : item))
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
      const response = await oddtripService.getItinerary(tripId);
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
      const approval = await oddtripService.getApproval(tripId);
      set((state) => ({
        itinerary: response.data,
        approval: approval.data,
        tripHistory: state.tripHistory.map((trip) => trip.tripId === tripId ? { ...trip, status: approval.data.tripStatus } : trip),
        status: { ...state.status, itinerary: 'success', approval: 'success' }
      }));
    } catch {
      set((state) => ({ error: '일정을 다시 만들지 못했습니다.', status: { ...state.status, itinerary: 'error' } }));
    }
  },
  async loadApproval() {
    const tripId = get().activeTripId ?? await get().ensureTrip();
    if (!tripId) return;
    set((state) => ({ status: { ...state.status, approval: 'loading' } }));
    try {
      const response = await oddtripService.getApproval(tripId);
      set((state) => ({
        approval: response.data,
        tripHistory: state.tripHistory.map((trip) => trip.tripId === tripId ? { ...trip, status: response.data.tripStatus } : trip),
        status: { ...state.status, approval: 'success' },
      }));
    } catch (error) {
      set((state) => ({ error: error instanceof Error ? error.message : '일정 승인 상태를 불러오지 못했습니다.', status: { ...state.status, approval: 'error' } }));
    }
  },
  async respondApproval(action, comment) {
    const tripId = get().activeTripId ?? await get().ensureTrip();
    if (!tripId) return false;
    set((state) => ({ status: { ...state.status, approval: 'loading' }, error: undefined }));
    try {
      const response = await oddtripService.respondApproval(tripId, action, comment);
      set((state) => ({
        approval: response.data,
        tripHistory: state.tripHistory.map((trip) => trip.tripId === tripId ? { ...trip, status: response.data.tripStatus } : trip),
        status: { ...state.status, approval: 'success' },
      }));
      return true;
    } catch (error) {
      set((state) => ({ error: error instanceof Error ? error.message : '일정 승인 응답을 저장하지 못했습니다.', status: { ...state.status, approval: 'error' } }));
      return false;
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

function buildAttractionRequest(state: TripState, preferences = state.preferences) {
  const code = state.result?.code ?? state.user?.ttiCode ?? '';
  const keywords = new Set<string>([
    ...preferences.places,
    ...preferences.activities,
    ...preferences.foods,
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
