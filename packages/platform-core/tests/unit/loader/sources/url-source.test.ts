import { describe, expect, it } from 'vitest';
import { UrlSource } from '@/loader/index.js';
import { RuntimeReasonCodes } from '@/runtime/index.js';

describe('UrlSource', () => {
  it('rejects non-https URL descriptors', async () => {
    const source = new UrlSource({
      type: 'url',
      moduleIdHint: 'module-url',
      url: 'http://example.invalid/module.zip',
    });

    const result = await source.load();

    expect('reasonCode' in result).toBe(true);

    if ('reasonCode' in result) {
      expect(result.reasonCode).toBe(RuntimeReasonCodes.SourceUrlInvalid);
      expect(result.phase).toBe('discover');
    }
  });

  it('rejects on fetch failure for unreachable URL', async () => {
    const source = new UrlSource({
      type: 'url',
      moduleIdHint: 'module-url',
      url: 'https://example.invalid/module.zip',
    });

    const result = await source.load();

    expect('reasonCode' in result).toBe(true);

    if ('reasonCode' in result) {
      expect(result.reasonCode).toBe(RuntimeReasonCodes.SourceFetchFailed);
      expect(result.phase).toBe('discover');
    }
  });
});
