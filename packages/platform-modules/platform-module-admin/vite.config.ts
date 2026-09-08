import { builtinModules } from 'node:module';
import { resolve } from 'node:path';
import type { Diagnostic } from 'typescript';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import pkg from './package.json' with { type: 'json' };

const externalPackages = Object.keys(pkg.dependencies ?? {});

function isExternalDependency(id: string): boolean {
  return externalPackages.some(
    (packageName) => id === packageName || id.startsWith(`${packageName}/`),
  );
}

function hasDtsDiagnostics(diagnostics: readonly Diagnostic[]): void {
  if (diagnostics.length > 0) {
    throw new Error(
      `vite-plugin-dts emitted ${diagnostics.length.toString()} diagnostic(s).`,
    );
  }
}

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    dts({
      entryRoot: 'src',
      tsconfigPath: './tsconfig.package.json',
      afterDiagnostic: hasDtsDiagnostics,
    }),
  ],
  build: {
    target: 'node22',
    sourcemap: true,
    minify: true,
    emptyOutDir: true,
    lib: {
      entry: resolve(import.meta.dirname, 'src/platform/platform.module.ts'),
      formats: ['es'],
      fileName: () => 'platform.module.js',
    },
    rolldownOptions: {
      external: (id) =>
        builtinModules.includes(id) ||
        id.startsWith('node:') ||
        isExternalDependency(id),
    },
  },
});
