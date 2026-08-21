import { describe, expect, it } from 'vitest';
import { getSafeReturnUrl } from './safe-return-url';

describe('getSafeReturnUrl', () => {
  it('accepts internal application paths', () => {
    expect(getSafeReturnUrl('/modules?tab=active')).toBe('/modules?tab=active');
  });

  it('rejects external and protocol-relative paths', () => {
    expect(getSafeReturnUrl('https://example.test')).toBe('/');
    expect(getSafeReturnUrl('//example.test')).toBe('/');
    expect(getSafeReturnUrl('/\\example.test')).toBe('/');
  });
});
