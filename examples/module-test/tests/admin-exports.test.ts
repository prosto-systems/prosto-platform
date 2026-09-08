import { describe, expect, it } from 'vitest';
import packageJson from '../package.json' with { type: 'json' };

describe('Test module admin exports', () => {
  it('declares concrete entry and stylesheet exports', (): void => {
    expect(packageJson.exports).toMatchObject({
      './admin': './dist/admin/admin.plugin.js',
      './admin/styles/main': './dist/admin/admin.plugin.css',
    });
  });
});
