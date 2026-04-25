import { describe, expect, it } from 'vitest';
import { RuntimeReasonCodes } from '../../../src/compatibility/reason-codes.js';
import { createRejected } from '../../../src/loader/loader.utils.js';

describe('createRejected', () => {
  it('constructs a rejected artifact with discover phase', () => {
    const result = createRejected('discover', {
      moduleId: 'mod-a',
      sourceType: 'path',
      sourceRef: '/tmp/mod',
      reasonCode: RuntimeReasonCodes.SourceDescriptorInvalid,
      message: 'invalid',
      remediationHint: 'fix it',
    });

    expect(result).toEqual({
      moduleId: 'mod-a',
      sourceType: 'path',
      sourceRef: '/tmp/mod',
      phase: 'discover',
      reasonCode: RuntimeReasonCodes.SourceDescriptorInvalid,
      message: 'invalid',
      remediationHint: 'fix it',
    });
  });

  it('constructs a rejected artifact with validate phase', () => {
    const result = createRejected('validate', {
      moduleId: 'mod-b',
      sourceType: 'url',
      sourceRef: 'https://example.com',
      reasonCode: RuntimeReasonCodes.SourceFetchFailed,
      message: 'fetch failed',
      remediationHint: 'check network',
    });

    expect(result).toEqual({
      moduleId: 'mod-b',
      sourceType: 'url',
      sourceRef: 'https://example.com',
      phase: 'validate',
      reasonCode: RuntimeReasonCodes.SourceFetchFailed,
      message: 'fetch failed',
      remediationHint: 'check network',
    });
  });
});
