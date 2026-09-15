import { describe, expect, it } from 'vitest';
import { landingPathForRole } from './roleRoutes';

describe('role routes', () => {
  it('keeps administrators inside the admin console', () => {
    expect(landingPathForRole('admin')).toBe('/admin');
  });

  it('sends normal accounts to the travel home', () => {
    expect(landingPathForRole('user')).toBe('/home');
    expect(landingPathForRole()).toBe('/home');
  });
});
