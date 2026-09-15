import { create } from 'zustand';
import {
  consentService,
  isAccepted,
  type ConsentDecision,
  type ConsentRecord,
  type ConsentSource,
  type ConsentStatus,
  type ConsentType,
} from '../api/consentService';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface ConsentStoreState {
  status: ConsentStatus | null;
  loadStatus: Status;
  submitStatus: Status;
  history: ConsentRecord[];
  historyStatus: Status;
  error?: string;

  load: () => Promise<void>;
  loadHistory: () => Promise<void>;
  submit: (consents: ConsentDecision[], source: ConsentSource) => Promise<boolean>;
  accepted: (type: ConsentType) => boolean;
  reset: () => void;
}

const EMPTY = {
  status: null,
  loadStatus: 'idle' as Status,
  submitStatus: 'idle' as Status,
  history: [] as ConsentRecord[],
  historyStatus: 'idle' as Status,
  error: undefined,
};

export const useConsentStore = create<ConsentStoreState>((set, get) => ({
  ...EMPTY,

  async load() {
    set({ loadStatus: 'loading', error: undefined });
    try {
      const response = await consentService.status();
      set({ status: response.data, loadStatus: 'success' });
    } catch (error) {
      // Left as null rather than assumed accepted: a status we could not read
      // is not consent, and the gate stays closed until we know.
      set({ loadStatus: 'error', error: (error as Error).message });
    }
  },

  async loadHistory() {
    set({ historyStatus: 'loading' });
    try {
      const response = await consentService.history();
      set({ history: response.data.items, historyStatus: 'success' });
    } catch (error) {
      set({ historyStatus: 'error', error: (error as Error).message });
    }
  },

  async submit(consents, source) {
    set({ submitStatus: 'loading', error: undefined });
    try {
      const response = await consentService.submit(consents, source);
      // The response carries the full standing status, so one round trip both
      // records the decision and refreshes every gate that depends on it.
      set({
        status: { items: response.data.items, revocable: response.data.revocable },
        submitStatus: 'success',
      });
      return true;
    } catch (error) {
      set({ submitStatus: 'error', error: (error as Error).message });
      return false;
    }
  },

  accepted(type) {
    return isAccepted(get().status, type);
  },

  reset() {
    set({ ...EMPTY });
  },
}));
