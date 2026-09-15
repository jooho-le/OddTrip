export type OddRuleId = 'half-mix' | 'time-split' | 'alternate' | 'core-guarantee';

export interface DecisionSelections {
  places: string[];
  activities: string[];
  foods: string[];
  pace: number;
  budget: number;
  indoorPreferred: boolean;
  hiddenSpots: boolean;
  mustInclude: string[];
  exclude: string[];
}

export type ConcessionImportance = 'low' | 'medium' | 'high';
export type ConcessionFlexibility = 'skip' | 'limited' | 'open';

export interface ConcessionEntry {
  importance: ConcessionImportance;
  flexibility: ConcessionFlexibility;
}

export type DecisionStepId = 'select' | 'waiting' | 'analysis' | 'concession' | 'oddrule' | 'done';

export const ODD_RULES: { id: OddRuleId; title: string; description: string }[] = [
  { id: 'half-mix', title: '반반 혼합', description: '두 사람의 선호를 일정 전체에 비슷한 비율로 섞어서 반영해요.' },
  { id: 'time-split', title: '시간 분할', description: '오전은 한 사람의 방식, 오후는 다른 사람의 방식으로 나눠요.' },
  { id: 'alternate', title: '번갈아 선택', description: '장소마다 두 사람이 번갈아 가며 결정해요.' },
  { id: 'core-guarantee', title: '핵심 보장', description: '각자 반드시 포함할 항목을 먼저 넣고, 남은 시간을 공통 선호로 채워요.' },
];
