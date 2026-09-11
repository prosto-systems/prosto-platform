import { describe, expect, it } from 'vitest';
import { OpaqueTokenService } from '@/services/index.js';

describe('OpaqueTokenService', () => {
  it('generates opaque random tokens and verifies only their digest', () => {
    const service = new OpaqueTokenService();
    const token = service.create();
    const digest = service.digest(token);

    expect(token).not.toContain(digest);
    expect(service.matches(token, digest)).toBe(true);
    expect(service.matches(`${token}x`, digest)).toBe(false);
  });
});
