import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConcessionEntry, DecisionSelections, DecisionStepId, OddRuleId } from '../types';

/**
 * Local-only stand-in for decision progress until the backend stores it.
 *
 * `preferences_json` on the trip is one shared JSON blob per trip, not split
 * per user, so there is no server-side way yet to know "did my partner
 * submit" or "what did they pick separately from me". Everything here is
 * scoped to this browser only and is NOT synced between the two matched
 * users — it exists so the Step1~4 / Odd Rule UI has somewhere to live
 * ahead of that backend work landing.
 */

type ListKey = 'places' | 'activities' | 'foods' | 'mustInclude' | 'exclude';

interface DecisionState {
  selections: DecisionSelections;
  submittedAt: string | null;
  concessions: Record<string, ConcessionEntry>;
  oddRule: OddRuleId | null;
  oddRuleConfirmedAt: string | null;

  updateSelections: (patch: Partial<DecisionSelections>) => void;
  toggleListItem: (key: ListKey, value: string) => void;
  submit: () => void;
  editSelections: () => void;
  setConcession: (item: string, patch: Partial<ConcessionEntry>) => void;
  setOddRule: (rule: OddRuleId | null) => void;
  confirmOddRule: () => void;
  reset: () => void;
}

const initialSelections: DecisionSelections = {
  places: [],
  activities: [],
  foods: [],
  pace: 50,
  budget: 50,
  indoorPreferred: false,
  hiddenSpots: false,
  mustInclude: [],
  exclude: [],
};

export const useDecisionStore = create<DecisionState>()(
  persist(
    (set, get) => ({
      selections: initialSelections,
      submittedAt: null,
      concessions: {},
      oddRule: null,
      oddRuleConfirmedAt: null,

      updateSelections(patch) {
        set((state) => ({ selections: { ...state.selections, ...patch } }));
      },
      toggleListItem(key, value) {
        const current = get().selections[key];
        const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
        set((state) => ({ selections: { ...state.selections, [key]: next } }));
      },
      submit() {
        set({ submittedAt: new Date().toISOString() });
      },
      editSelections() {
        set({ submittedAt: null });
      },
      setConcession(item, patch) {
        set((state) => {
          const base: ConcessionEntry = state.concessions[item] ?? { importance: 'medium', flexibility: 'limited' };
          return { concessions: { ...state.concessions, [item]: { ...base, ...patch } } };
        });
      },
      setOddRule(rule) {
        set({ oddRule: rule, oddRuleConfirmedAt: null });
      },
      confirmOddRule() {
        if (!get().oddRule) return;
        set({ oddRuleConfirmedAt: new Date().toISOString() });
      },
      reset() {
        set({ selections: initialSelections, submittedAt: null, concessions: {}, oddRule: null, oddRuleConfirmedAt: null });
      },
    }),
    { name: 'oddtrip.decision' },
  ),
);

export function decisionStepFromState(state: { submittedAt: string | null; oddRuleConfirmedAt: string | null }): DecisionStepId {
  if (state.oddRuleConfirmedAt) return 'done';
  if (state.submittedAt) return 'analysis';
  return 'select';
}
