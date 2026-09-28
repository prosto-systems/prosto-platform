import pkg from './package.json' with { type: 'json' };
import type { Diagnostic } from 'typescript';
import { builtinModules } from 'node:module';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const externalPackages = Object.keys(pkg.dependencies);

export default defineConfig({
  plugins: [
    dts({
      entryRoot: 'src',
      tsconfigPath: './tsconfig.package.json',
      afterDiagnostic: (diagnostics: readonly Diagnostic[]) => {
        if (diagnostics.length > 0) {
          throw new Error(
            `vite-plugin-dts emitted ${diagnostics.length.toString()} diagnostic(s).`,
          );
        }
      },
    }),
  ],
  build: {
    target: 'node22',
    sourcemap: true,
    minify: true,
    emptyOutDir: true,
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rolldownOptions: {
      external: (id) =>
        builtinModules.includes(id) ||
        id.startsWith('node:') ||
        externalPackages.some(
          (name) => id === name || id.startsWith(`${name}/`),
        ),
    },
  },
});
