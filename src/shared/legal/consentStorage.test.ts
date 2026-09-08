import { beforeEach, describe, expect, it } from 'vitest';
import {
  hasMatchingProfileConsent,
  saveMatchingProfileConsent,
  saveRegistrationConsent,
} from './consentStorage';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

describe('consentStorage', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: new MemoryStorage(),
    });
  });

  it('records the required registration versions and optional marketing choice', () => {
    saveRegistrationConsent({
      accountEmail: ' Traveler@Example.com ',
      userId: 'user-1',
      marketingAccepted: false,
    });

    const receipt = JSON.parse(localStorage.getItem('oddtrip.registrationConsent.v1') ?? '{}');
    expect(receipt).toMatchObject({
      accountEmail: 'traveler@example.com',
      userId: 'user-1',
      adultConfirmed: true,
      marketingAccepted: false,
      storageScope: 'browser-only',
      termsVersion: 'draft-2026-09-07',
    });
    expect(receipt.acceptedAt).toEqual(expect.any(String));
  });

  it('accepts matching only for the current document version and user', () => {
    expect(hasMatchingProfileConsent('user-1')).toBe(false);
    saveMatchingProfileConsent('user-1');
    expect(hasMatchingProfileConsent('user-1')).toBe(true);
    expect(hasMatchingProfileConsent('user-2')).toBe(false);
  });
});
