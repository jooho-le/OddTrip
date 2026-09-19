import { apiRequest } from '../../../shared/api/client';

export type ConsentType =
  | 'terms'
  | 'community'
  | 'adult'
  | 'privacy_notice'
  | 'marketing'
  | 'matching_profile'
  | 'safety_guide';

export type ConsentSource = 'signup' | 'matching_gate' | 'settings';

/**
 * The version of each document this build actually renders.
 *
 * Sent with every consent and checked by the server against the version in
 * force: if this bundle is stale the submission is rejected rather than filed
 * as agreement to text the user never saw. So these strings belong next to the
 * documents in `public/legal`, and both move together.
 *
 * Keyed by the server's consent type so there is no name translation in
 * between. The values stay "draft" while the documents still carry effective
 * date and operator placeholders; raising one re-opens the consent prompt for
 * everyone who accepted the old revision.
 */
export const LEGAL_VERSIONS: Record<ConsentType, string> = {
  terms: 'draft-2026-09-07',
  community: 'draft-2026-09-07',
  adult: 'draft-2026-09-07',
  privacy_notice: 'draft-2026-09-07',
  marketing: 'draft-2026-09-07',
  matching_profile: 'draft-2026-09-07',
  safety_guide: 'draft-2026-09-13',
};

/** Ticked at signup. The first four are required, marketing is optional. */
export const REGISTRATION_REQUIRED: ConsentType[] = ['terms', 'community', 'adult', 'privacy_notice'];

/** Accepted before the matching surface opens. */
export const MATCHING_GATES: ConsentType[] = ['matching_profile', 'safety_guide'];

export interface ConsentDecision {
  type: ConsentType;
  version: string;
  accepted: boolean;
}

/** One row of the ledger, including consents that were later withdrawn. */
export interface ConsentRecord extends ConsentDecision {
  source: ConsentSource;
  acceptedAt: string;
}

export interface ConsentState {
  type: ConsentType;
  /** Accepted at the version currently in force — the safe check on its own. */
  accepted: boolean;
  /** The version the user accepted, null if they never answered. */
  version: string | null;
  currentVersion: string;
  /** Accepted, but an earlier revision: owes a re-consent, not a first ask. */
  stale: boolean;
  acceptedAt: string | null;
}

export interface ConsentStatus {
  items: ConsentState[];
  revocable: ConsentType[];
}

export function decision(type: ConsentType, accepted = true): ConsentDecision {
  return { type, version: LEGAL_VERSIONS[type], accepted };
}

/** The signup bundle. Required items are always true — the form blocks submit
 * until they are ticked, and the server rejects the call if they are not. */
export function registrationDecisions(marketingAccepted: boolean): ConsentDecision[] {
  return [...REGISTRATION_REQUIRED.map((type) => decision(type)), decision('marketing', marketingAccepted)];
}

export function isAccepted(status: ConsentStatus | null, type: ConsentType) {
  return status?.items.find((item) => item.type === type)?.accepted ?? false;
}

export function stateOf(status: ConsentStatus | null, type: ConsentType) {
  return status?.items.find((item) => item.type === type) ?? null;
}

export const consentService = {
  status() {
    return apiRequest<ConsentStatus>({ url: '/api/me/consents', method: 'GET' });
  },

  submit(consents: ConsentDecision[], source: ConsentSource) {
    return apiRequest<ConsentStatus & { recorded: ConsentRecord[] }>({
      url: '/api/me/consents',
      method: 'POST',
      data: { consents, source },
    });
  },

  history(limit = 100) {
    return apiRequest<{ items: ConsentRecord[] }>({
      url: '/api/me/consents/history',
      method: 'GET',
      params: { limit },
    });
  },
};
