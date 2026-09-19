import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ apiRequest: vi.fn() }));

vi.mock('../../../shared/api/client', () => ({ apiRequest: mocks.apiRequest }));

import {
  consentService,
  decision,
  isAccepted,
  registrationDecisions,
  stateOf,
  LEGAL_VERSIONS,
  REGISTRATION_REQUIRED,
  type ConsentState,
  type ConsentStatus,
} from './consentService';
import { useConsentStore } from '../model/consentStore';

function state(overrides: Partial<ConsentState> & Pick<ConsentState, 'type'>): ConsentState {
  return {
    accepted: false,
    version: null,
    currentVersion: LEGAL_VERSIONS[overrides.type],
    stale: false,
    acceptedAt: null,
    ...overrides,
  };
}

function status(items: ConsentState[]): ConsentStatus {
  return { items, revocable: ['marketing'] };
}

describe('consentService', () => {
  beforeEach(() => {
    mocks.apiRequest.mockReset();
    mocks.apiRequest.mockResolvedValue({ data: status([]) });
    useConsentStore.getState().reset();
  });

  it('sends every required signup consent at the version this build renders', () => {
    const decisions = registrationDecisions(false);

    expect(decisions.filter((item) => item.accepted).map((item) => item.type)).toEqual(REGISTRATION_REQUIRED);
    // 선택 항목은 거부한 사실도 함께 기록합니다.
    expect(decisions).toContainEqual({ type: 'marketing', version: LEGAL_VERSIONS.marketing, accepted: false });
    decisions.forEach((item) => expect(item.version).toBe(LEGAL_VERSIONS[item.type]));

    expect(registrationDecisions(true)).toContainEqual({
      type: 'marketing',
      version: LEGAL_VERSIONS.marketing,
      accepted: true,
    });
  });

  it('posts decisions with the collection point', async () => {
    await consentService.submit([decision('matching_profile'), decision('safety_guide')], 'matching_gate');

    expect(mocks.apiRequest).toHaveBeenCalledWith({
      url: '/api/me/consents',
      method: 'POST',
      data: {
        source: 'matching_gate',
        consents: [
          { type: 'matching_profile', version: LEGAL_VERSIONS.matching_profile, accepted: true },
          { type: 'safety_guide', version: LEGAL_VERSIONS.safety_guide, accepted: true },
        ],
      },
    });
  });

  it('treats a superseded consent as not accepted', () => {
    const stale = status([
      state({ type: 'terms', accepted: false, stale: true, version: 'draft-2020-01-01', acceptedAt: '2026-01-01T00:00:00' }),
      state({ type: 'marketing', accepted: true, version: LEGAL_VERSIONS.marketing }),
    ]);

    // 재동의가 필요한 항목은 동의한 것으로 읽히면 안 됩니다.
    expect(isAccepted(stale, 'terms')).toBe(false);
    expect(stateOf(stale, 'terms')?.stale).toBe(true);
    expect(isAccepted(stale, 'marketing')).toBe(true);
    // 한 번도 답하지 않은 항목.
    expect(isAccepted(stale, 'safety_guide')).toBe(false);
    expect(isAccepted(null, 'terms')).toBe(false);
  });
});

describe('useConsentStore', () => {
  beforeEach(() => {
    mocks.apiRequest.mockReset();
    useConsentStore.getState().reset();
  });

  it('leaves the status unknown when it cannot be read', async () => {
    mocks.apiRequest.mockRejectedValue(new Error('네트워크 오류'));

    await useConsentStore.getState().load();

    // 조회 실패를 동의로 해석하면 게이트가 열려버립니다.
    expect(useConsentStore.getState().status).toBeNull();
    expect(useConsentStore.getState().loadStatus).toBe('error');
    expect(useConsentStore.getState().accepted('matching_profile')).toBe(false);
  });

  it('refreshes the standing status from the submit response', async () => {
    mocks.apiRequest.mockResolvedValue({
      data: {
        recorded: [],
        revocable: ['marketing'],
        items: [state({ type: 'matching_profile', accepted: true, version: LEGAL_VERSIONS.matching_profile })],
      },
    });

    const ok = await useConsentStore.getState().submit([decision('matching_profile')], 'matching_gate');

    expect(ok).toBe(true);
    expect(useConsentStore.getState().accepted('matching_profile')).toBe(true);
  });

  it('reports failure without changing the standing status', async () => {
    mocks.apiRequest.mockRejectedValue(new Error('약관이 갱신되었습니다.'));

    const ok = await useConsentStore.getState().submit([decision('marketing', false)], 'settings');

    expect(ok).toBe(false);
    expect(useConsentStore.getState().error).toBe('약관이 갱신되었습니다.');
    expect(useConsentStore.getState().status).toBeNull();
  });
});
