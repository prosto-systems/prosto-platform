import { createHash, timingSafeEqual } from 'node:crypto';

/** @internal Validates same-origin state changes and opaque CSRF values. */
export class AdminSecurityGuard {
  constructor(private readonly _allowedPublicOrigin: string) {}

  assertOrigin(origin: string | undefined): void {
    if (origin !== this._allowedPublicOrigin) {
      throw new Error('Invalid administration request origin.');
    }
  }

  verifyCsrf(rawToken: string, expectedDigest: string): boolean {
    const actual = createHash('sha256').update(rawToken).digest('hex');
    const expected = Buffer.from(expectedDigest, 'hex');
    const actualValue = Buffer.from(actual, 'hex');

    return (
      expected.length === actualValue.length &&
      timingSafeEqual(expected, actualValue)
    );
  }
}
