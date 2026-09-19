import { create } from 'zustand';

/** Curtain beats from the prototype: line in at 110 / 730 / 1350 / 1970ms, app swap at 2600ms, cleanup at 3240ms. */
const BEATS = [110, 730, 1350, 1970];
const SWAP_AT = 2600;
const CLEAR_AT = 3240;

type IntroTransitionState = {
  active: boolean;
  lift: boolean;
  cue: number;
  running: boolean;
  run: (onSwap: () => void) => void;
};

let timers: number[] = [];

export const useIntroTransitionStore = create<IntroTransitionState>((set, get) => ({
  active: false,
  lift: false,
  cue: 0,
  running: false,
  run: (onSwap) => {
    if (get().running) return; // duplicate-click guard
    timers.forEach((id) => window.clearTimeout(id));
    timers = [];
    set({ running: true, active: true, lift: false, cue: 0 });

    BEATS.forEach((ms, index) => {
      timers.push(window.setTimeout(() => set({ cue: index + 1 }), ms));
    });
    timers.push(
      window.setTimeout(() => {
        onSwap();
        window.scrollTo(0, 0);
        set({ lift: true });
      }, SWAP_AT)
    );
    timers.push(
      window.setTimeout(() => set({ active: false, lift: false, cue: 0, running: false }), CLEAR_AT)
    );
  }
}));
