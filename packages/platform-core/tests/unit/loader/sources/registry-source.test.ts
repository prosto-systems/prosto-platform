import { describe, expect, it } from 'vitest';
import { RegistrySource } from '@/loader/index.js';
import { RuntimeReasonCodes } from '@/runtime/index.js';

describe('RegistrySource', () => {
  it('rejects empty package coordinates', async () => {
    const source = new RegistrySource({
      type: 'registry',
      moduleIdHint: 'module-registry',
      packageName: '',
      version: '',
    });

    const result = await source.load();

    expect('reasonCode' in result).toBe(true);

    if ('reasonCode' in result) {
      expect(result.reasonCode).toBe(RuntimeReasonCodes.SourceDescriptorInvalid);
      expect(result.phase).toBe('discover');
    }
  });

  it('rejects on fetch failure for unreachable registry', async () => {
    const source = new RegistrySource({
      type: 'registry',
      moduleIdHint: 'module-registry',
      packageName: 'nonexistent-package-xyz-123',
      version: '1.0.0',
    });

    const result = await source.load();

    expect('reasonCode' in result).toBe(true);

    if ('reasonCode' in result) {
      expect(result.reasonCode).toBe(RuntimeReasonCodes.SourceFetchFailed);
      expect(result.phase).toBe('discover');
    }
  });
});
