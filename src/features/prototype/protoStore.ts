import { create } from 'zustand';
import type { FormKey, TaskKey } from './protoData';

type ProtoState = {
  currentTask: TaskKey;
  completed: FormKey[];
  responses: Partial<Record<FormKey, Record<string, string>>>;
  approved: boolean;
  savedPlaces: string[];
  sentRequests: number[];
  toastMessage: string | null;
  chatOpen: boolean;
  messages: { me: boolean; text: string }[];

  isDone: (key: FormKey) => boolean;
  isSaved: (place: string) => boolean;
  hasRequest: (index: number) => boolean;
  toast: (message: string) => void;
  submitForm: (key: FormKey, answers: Record<string, string>) => void;
  setTask: (task: TaskKey) => void;
  togglePlace: (place: string) => void;
  toggleRequest: (index: number) => void;
  setChatOpen: (open: boolean) => void;
  sendMessage: (text: string) => void;
};

let toastTimer = 0;

export const useProtoStore = create<ProtoState>((set, get) => ({
  currentTask: 'concession',
  completed: ['tti', 'preference'],
  responses: {
    tti: { 0: '3', 1: '4', 2: '2', 3: '3' },
    preference: { 0: '0', 1: '1', 2: '2', 3: '0' }
  },
  approved: false,
  savedPlaces: ['부평깡통시장'],
  sentRequests: [],
  toastMessage: null,
  chatOpen: false,
  messages: [
    { me: false, text: '둘째 날은 영도 쪽을 오래 걷고 싶어요.' },
    { me: true, text: '좋아요. 대신 저녁은 시장 코스로 가도 될까요?' },
    { me: false, text: '네! 저녁은 은진님 선택으로 해요.' }
  ],

  isDone: (key) => get().completed.includes(key),
  isSaved: (place) => get().savedPlaces.includes(place),
  hasRequest: (index) => get().sentRequests.includes(index),

  toast: (message) => {
    set({ toastMessage: message });
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => set({ toastMessage: null }), 1800);
  },

  submitForm: (key, answers) => {
    const { completed, responses, currentTask } = get();
    const wasDone = completed.includes(key);
    let nextTask = currentTask;
    let approved = get().approved;
    if (!wasDone && key === 'concession') nextTask = 'rule';
    if (!wasDone && key === 'rule') nextTask = 'proposal';
    if (key === 'approval') { approved = true; nextTask = 'done'; }
    set({
      responses: { ...responses, [key]: { ...answers } },
      completed: wasDone ? completed : [...completed, key],
      currentTask: nextTask,
      approved
    });
  },

  setTask: (task) => set({ currentTask: task }),

  togglePlace: (place) => {
    const saved = get().savedPlaces;
    set({ savedPlaces: saved.includes(place) ? saved.filter((x) => x !== place) : [...saved, place] });
  },

  toggleRequest: (index) => {
    const sent = get().sentRequests;
    set({ sentRequests: sent.includes(index) ? sent.filter((x) => x !== index) : [...sent, index] });
  },

  setChatOpen: (open) => set({ chatOpen: open }),
  sendMessage: (text) => set({ messages: [...get().messages, { me: true, text }] })
}));

/** 홈 사이드바 · 작성할 조사서 목록 (HTML renderSurveyHub 로직 그대로) */
export function surveyRows(state: Pick<ProtoState, 'completed' | 'currentTask' | 'approved'>) {
  const c = state.completed.includes('concession');
  const r = state.completed.includes('rule');
  const approvalReady = ['approval', 'done'].includes(state.currentTask);
  return [
    { no: 1, key: 'tti' as FormKey, title: '여행 성향 조사서', meta: '내 프로필 · TTI', label: '완료 · 수정', done: true, locked: false },
    { no: 2, key: 'preference' as FormKey, title: '독립 선택 조사서', meta: '부산 · 지우', label: '완료 · 결과', done: true, locked: false },
    { no: 3, key: 'concession' as FormKey, title: '양보 범위 조사서', meta: '부산 · 지우', label: c ? '완료 · 수정' : '작성 필요', done: c, locked: false },
    { no: 4, key: 'rule' as FormKey, title: 'Odd Rule 선택서', meta: '부산 · 지우', label: r ? '완료 · 수정' : c ? '작성 필요' : '이전 단계 대기', done: r, locked: !c },
    { no: 5, key: 'approval' as FormKey, title: '일정 확인·승인서', meta: '부산 · 지우', label: state.approved ? '승인 완료' : approvalReady ? '작성 필요' : '일정 생성 후', done: state.approved, locked: !approvalReady }
  ];
}
