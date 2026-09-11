import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loginRequestSchema } from '@/admin/http/index.js';
import { describe, expect, it } from 'vitest';

describe('admin HTTP subpath export', () => {
  it('exposes server DTOs without importing the aggregate admin entry', () => {
    expect(
      loginRequestSchema.safeParse({
        email: 'admin@example.com',
        password: 'password',
      }).success,
    ).toBe(true);
  });

  it('publishes a narrow admin HTTP package export', async () => {
    const packagePath = fileURLToPath(
      new URL('../package.json', import.meta.url),
    );
    const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as {
      exports: Record<string, { import: string; types: string }>;
    };

    expect(packageJson.exports['./admin/http']).toEqual({
      import: './dist/admin/http.js',
      types: './dist/admin/http/index.d.ts',
    });
  });
});
