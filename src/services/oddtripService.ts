import { attractions, currentUser, itineraryDays, matchCandidates, safetyAlerts } from '../mocks/data';
import { travelTypes, ttiQuestions } from '../mocks/tti';
import type { ApiResponse, Attraction, ItineraryDay, MatchCandidate, SafetyAlert, TtiAnswer, TtiCode, TtiQuestion, TtiResult, UserProfile } from '../types';

const wait = (ms = 250) => new Promise((resolve) => window.setTimeout(resolve, ms));

const oppositeMap: Record<string, string> = { P: 'W', W: 'P', N: 'C', C: 'N', F: 'A', A: 'F', H: 'S', S: 'H' };

export interface OddtripService {
  getCurrentUser(): Promise<ApiResponse<UserProfile>>;
  getTtiQuestions(): Promise<ApiResponse<TtiQuestion[]>>;
  calculateTtiResult(answers: TtiAnswer[]): Promise<ApiResponse<TtiResult>>;
  getMatches(typeCode: TtiCode): Promise<ApiResponse<MatchCandidate[]>>;
  getAttractions(): Promise<ApiResponse<Attraction[]>>;
  getItinerary(): Promise<ApiResponse<ItineraryDay[]>>;
  getSafetyAlerts(): Promise<ApiResponse<SafetyAlert[]>>;
}

export const mockOddtripService: OddtripService = {
  async getCurrentUser() {
    await wait();
    return { data: currentUser };
  },
  async getTtiQuestions() {
    await wait();
    return { data: ttiQuestions };
  },
  async calculateTtiResult(answers) {
    await wait(350);
    const axes = [
      { axis: 'PW' as const, leftLetter: 'P' as const, rightLetter: 'W' as const },
      { axis: 'NC' as const, leftLetter: 'N' as const, rightLetter: 'C' as const },
      { axis: 'FA' as const, leftLetter: 'F' as const, rightLetter: 'A' as const },
      { axis: 'HS' as const, leftLetter: 'H' as const, rightLetter: 'S' as const }
    ];
    const axisScores = axes.map((axis) => {
      const related = answers.filter((answer) => answer.axis === axis.axis);
      const score = related.length ? Math.round(related.reduce((sum, answer) => sum + answer.value, 0) / related.length) : 0;
      return { ...axis, score };
    });
    const code = axisScores.map((item) => (item.score <= 0 ? item.leftLetter : item.rightLetter)).join('') as TtiCode;
    const oppositeCode = code.split('').map((letter) => oppositeMap[letter]).join('') as TtiCode;
    const type = travelTypes.find((item) => item.code === code) ?? travelTypes[0];
    return {
      data: {
        code,
        oppositeCode,
        title: type.title,
        description: type.description,
        strengths: ['상대의 강점을 여행 운영에 반영하기 좋음', '일정 중간 조율 지점이 명확함', 'AI 추천 이유를 이해하고 선택하기 쉬움'],
        axisScores
      }
    };
  },
  async getMatches() {
    await wait();
    return { data: matchCandidates };
  },
  async getAttractions() {
    await wait();
    return { data: attractions };
  },
  async getItinerary() {
    await wait();
    return { data: itineraryDays };
  },
  async getSafetyAlerts() {
    await wait();
    return { data: safetyAlerts };
  }
};
