import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** @internal Creates and verifies opaque session, CSRF, and reset tokens. */
export class OpaqueTokenService {
  create(): string {
    return randomBytes(32).toString('base64url');
  }

  digest(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  matches(token: string, expectedDigest: string): boolean {
    const actual = Buffer.from(this.digest(token), 'hex');
    const expected = Buffer.from(expectedDigest, 'hex');

    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }
}
