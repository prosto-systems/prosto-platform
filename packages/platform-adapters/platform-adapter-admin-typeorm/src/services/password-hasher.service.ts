import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';

function deriveKey(
  password: string,
  salt: Buffer,
  length: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Node's native defaults are N=16384, r=8, p=1; the hash version fixes them.
    scryptCallback(password, salt, length, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(Buffer.from(derivedKey));
    });
  });
}

/** @internal Versioned native-scrypt password hashing and verification. */
export class PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const derivedKey = await deriveKey(password, salt, 64);

    return [
      'scrypt-v1',
      salt.toString('base64url'),
      derivedKey.toString('base64url'),
    ].join('$');
  }

  async verify(password: string, encoded: string): Promise<boolean> {
    const [version, saltValue, expectedValue, ...remainder] =
      encoded.split('$');

    if (
      version !== 'scrypt-v1' ||
      !saltValue ||
      !expectedValue ||
      remainder.length !== 0
    ) {
      return false;
    }

    try {
      const expected = Buffer.from(expectedValue, 'base64url');
      const actual = await deriveKey(
        password,
        Buffer.from(saltValue, 'base64url'),
        expected.length,
      );

      return (
        expected.length === actual.length && timingSafeEqual(expected, actual)
      );
    } catch {
      return false;
    }
  }
}
