import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/** @internal AES-256-GCM cipher for transient queued reset tokens. */
export class SecretCipher {
  private readonly _key: Buffer;

  constructor(encodedKey: string) {
    this._key = Buffer.from(encodedKey, 'base64url');

    if (this._key.length !== 32) {
      throw new Error(
        'platform-admin reset-token encryption key must be 32 bytes.',
      );
    }
  }

  encrypt(value: string): string {
    const initializationVector = randomBytes(12);
    const cipher = createCipheriv(
      'aes-256-gcm',
      this._key,
      initializationVector,
    );
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return [initializationVector, tag, encrypted]
      .map((part) => part.toString('base64url'))
      .join('.');
  }

  decrypt(value: string): string {
    const [initializationVectorValue, tagValue, encryptedValue, ...remainder] =
      value.split('.');

    if (
      !initializationVectorValue ||
      !tagValue ||
      !encryptedValue ||
      remainder.length !== 0
    ) {
      throw new Error('platform-admin queued reset token is invalid.');
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this._key,
      Buffer.from(initializationVectorValue, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));

    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }
}
