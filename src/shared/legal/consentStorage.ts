export const LEGAL_VERSIONS = {
  terms: 'draft-2026-09-07',
  community: 'draft-2026-09-07',
  privacyNotice: 'draft-2026-09-07',
  marketing: 'draft-2026-09-07',
  matchingProfile: 'draft-2026-09-07',
} as const;

const REGISTRATION_RECEIPT_KEY = 'oddtrip.registrationConsent.v1';
const MATCHING_RECEIPT_PREFIX = 'oddtrip.matchingProfileConsent.v1';

export interface RegistrationConsentReceipt {
  acceptedAt: string;
  accountEmail: string;
  userId?: string;
  termsVersion: string;
  communityVersion: string;
  privacyNoticeVersion: string;
  adultConfirmed: true;
  marketingAccepted: boolean;
  marketingVersion: string;
  storageScope: 'browser-only';
}
export function saveRegistrationConsent(input: { accountEmail: string; userId?: string; marketingAccepted: boolean }) {
  const receipt: RegistrationConsentReceipt = {
    acceptedAt: new Date().toISOString(),
    accountEmail: input.accountEmail.trim().toLowerCase(),
    userId: input.userId,
    termsVersion: LEGAL_VERSIONS.terms,
    communityVersion: LEGAL_VERSIONS.community,
    privacyNoticeVersion: LEGAL_VERSIONS.privacyNotice,
    adultConfirmed: true,
    marketingAccepted: input.marketingAccepted,
    marketingVersion: LEGAL_VERSIONS.marketing,
    storageScope: 'browser-only',
  };
  localStorage.setItem(REGISTRATION_RECEIPT_KEY, JSON.stringify(receipt));
}

function matchingReceiptKey(userId: string) {
  return MATCHING_RECEIPT_PREFIX + '.' + userId;
}

export function hasMatchingProfileConsent(userId: string) {
  try {
    const raw = localStorage.getItem(matchingReceiptKey(userId));
    if (!raw) return false;
    const receipt = JSON.parse(raw) as { version?: string; accepted?: boolean };
    return receipt.accepted === true && receipt.version === LEGAL_VERSIONS.matchingProfile;
  } catch {
    return false;
  }
}

export function saveMatchingProfileConsent(userId: string) {
  localStorage.setItem(matchingReceiptKey(userId), JSON.stringify({
    accepted: true,
    acceptedAt: new Date().toISOString(),
    version: LEGAL_VERSIONS.matchingProfile,
    storageScope: 'browser-only',
  }));
}
