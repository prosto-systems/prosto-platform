import { describe, expect, it } from 'vitest';
import {
  assert,
  AssertionError,
  dateNowIso,
  redactSecretsInMessage,
} from '@/common/index.js';

describe('assert', () => {
  it('does not throw when condition is truthy', () => {
    expect(() => assert(true, 'should not throw')).not.toThrow();
  });

  it('throws AssertionError when condition is falsy', () => {
    expect(() => assert(false, 'expected failure')).toThrow(AssertionError);
    expect(() => assert(false, 'expected failure')).toThrow('expected failure');
  });
});

describe('dateNowIso', () => {
  it('returns a valid ISO string', () => {
    const result = dateNowIso();
    expect(new Date(result).toISOString()).toBe(result);
  });
});

describe('redactSecretsInMessage', () => {
  it('redacts token=value', () => {
    expect(redactSecretsInMessage('token=abc123')).toBe('token=[REDACTED]');
  });

  it('redacts secret=value', () => {
    expect(redactSecretsInMessage('secret=shh')).toBe('secret=[REDACTED]');
  });

  it('redacts password=value', () => {
    expect(redactSecretsInMessage('password=pwd')).toBe('password=[REDACTED]');
  });

  it('redacts apikey=value', () => {
    expect(redactSecretsInMessage('apikey=ak')).toBe('apikey=[REDACTED]');
  });

  it('redacts key=value', () => {
    expect(redactSecretsInMessage('key=k')).toBe('key=[REDACTED]');
  });

  it('redacts auth=value', () => {
    expect(redactSecretsInMessage('auth=a')).toBe('auth=[REDACTED]');
  });

  it('redacts bearer token', () => {
    expect(redactSecretsInMessage('bearer xyz')).toBe('bearer [REDACTED]');
  });

  it('redacts authorization basic', () => {
    expect(redactSecretsInMessage('authorization: basic dXNlcjpwYXNz')).toBe('authorization: basic [REDACTED]');
  });

  it('preserves non-secret text', () => {
    expect(redactSecretsInMessage('hello world')).toBe('hello world');
  });
});
