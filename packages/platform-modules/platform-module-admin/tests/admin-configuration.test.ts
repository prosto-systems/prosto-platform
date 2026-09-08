import { describe, expect, it } from 'vitest';
import { parseAdminConfiguration } from '@/config/index.js';

function createConfiguration(): Record<string, unknown> {
  return {
    allowedPublicOrigin: 'https://admin.example.test',
    cookie: { lifetimeSeconds: 3_600, name: 'admin_session', secure: true },
    outbox: { leaseSeconds: 30, maxAttempts: 3, retryBaseSeconds: 1 },
    rateLimit: {
      login: { maxAttempts: 5, windowSeconds: 60 },
      passwordReset: { maxAttempts: 5, windowSeconds: 60 },
    },
    resetTokenEncryptionKey: Buffer.alloc(32).toString('base64url'),
    resetUrlBase: 'https://admin.example.test/password-reset',
    restartPollingIntervalSeconds: 30,
    smtp: {
      from: 'noreply@example.test',
      host: 'smtp.example.test',
      port: 465,
      secure: true,
    },
    trustedIngressConfigured: true,
  };
}

describe('parseAdminConfiguration', () => {
  it('accepts a complete production configuration without bootstrap credentials', () => {
    const configuration = parseAdminConfiguration(createConfiguration(), true);

    expect(configuration.cookie.lifetimeSeconds).toBe(3_600);
    expect(configuration.bootstrap).toBeUndefined();
  });

  it('rejects insecure production transport settings', () => {
    const configuration = createConfiguration();
    configuration.cookie = {
      lifetimeSeconds: 3_600,
      name: 'admin_session',
      secure: false,
    };

    expect(() => parseAdminConfiguration(configuration, true)).toThrow(
      /secure cookies/i,
    );
  });
});
