import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: [...configDefaults.exclude],
    alias: {
      '@/admin': new URL('./src/admin', import.meta.url).pathname,
      '@/platform': new URL('./src/platform', import.meta.url).pathname,
    },
  },
});
