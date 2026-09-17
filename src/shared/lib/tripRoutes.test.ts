import { describe, expect, it } from 'vitest';
import {
  tripPreferencePath,
  tripScheduleMapPath,
  tripSettingsPath,
  tripWorkspacePath,
} from './tripRoutes';

describe('trip route helpers', () => {
  it('builds trip workspace paths', () => {
    expect(tripWorkspacePath('trip-1')).toBe('/trips/trip-1/overview');
    expect(tripWorkspacePath('trip-1', 'coordination')).toBe('/trips/trip-1/coordination');
  });

  it('builds trip sub-page paths', () => {
    expect(tripSettingsPath('trip-1')).toBe('/trips/trip-1/settings');
    expect(tripScheduleMapPath('trip-1')).toBe('/trips/trip-1/schedule/map');
    expect(tripPreferencePath('trip-1', true)).toBe('/trips/trip-1/survey/preference?from=home');
  });

  it('encodes trip ids as one URL segment', () => {
    expect(tripWorkspacePath('trip / 1')).toBe('/trips/trip%20%2F%201/overview');
  });
});
