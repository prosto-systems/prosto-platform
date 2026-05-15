import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: [...configDefaults.exclude],
    alias: {
      '@/tests/fixtures/': new URL('./tests/fixtures/', import.meta.url).pathname,
      '@/': new URL('./src/', import.meta.url).pathname,
    }
  },
});
