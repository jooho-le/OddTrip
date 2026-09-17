export const TRIP_FLOW_STEPS = [
  '여행 개요',
  '선호 제출',
  '일정표',
] as const;

export type CoordinationFlowInput = {
  mineSubmitted: boolean;
  counterpartSubmitted: boolean;
  itineraryReady: boolean;
  generating: boolean;
};

export type CoordinationFlowState = {
  currentIndex: number;
  current: string;
  next: string;
};

export function coordinationFlowState(input: CoordinationFlowInput): CoordinationFlowState {
  if (input.itineraryReady) {
    return {
      currentIndex: 2,
      current: '두 사람의 선호를 반영한 AI 일정이 완성됐습니다.',
      next: '일정표를 확인하고 필요한 이야기는 동행과 채팅에서 나눕니다.',
    };
  }
  if (!input.mineSubmitted) {
    return {
      currentIndex: 1,
      current: '내 공동 선호를 먼저 제출합니다.',
      next: '두 사람의 답안이 모이면 AI가 장소와 일정을 한 번에 만듭니다.',
    };
  }
  if (!input.counterpartSubmitted) {
    return {
      currentIndex: 1,
      current: '내 선호 제출을 마쳤습니다.',
      next: '동행의 제출이 끝나면 AI 일정 생성이 바로 시작됩니다.',
    };
  }
  if (input.generating) {
    return {
      currentIndex: 1,
      current: 'AI가 두 사람의 선호를 함께 분석하고 있습니다.',
      next: '여행지와 동선을 고른 뒤 완성된 일정표로 이동합니다.',
    };
  }
  return {
    currentIndex: 1,
    current: '두 사람의 선호 제출이 모두 끝났습니다.',
    next: 'AI가 장소와 동선을 골라 공동 일정을 만듭니다.',
  };
}

export function isTripPlanningReadOnly(tripStatus?: string, hasItinerary?: boolean) {
  return Boolean(hasItinerary || tripStatus === 'confirmed' || tripStatus === 'completed');
}
