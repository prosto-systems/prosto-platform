import pkg from './package.json' with { type: 'json' };
import type { Diagnostic } from 'typescript';
import { builtinModules } from 'node:module';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const externalPackages = [
  ...Object.keys(pkg.dependencies ?? {}),
  // ...Object.keys(pkg.peerDependencies ?? {}),
  // ...Object.keys(pkg.optionalDependencies ?? {}),
];

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
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    dts({
      entryRoot: 'src',
      afterDiagnostic: hasDtsDiagnostics,
      tsconfigPath: './tsconfig.package.json',
      copyDtsFiles: true,
    }),
  ],
  build: {
    target: 'node22',
    sourcemap: true,
    minify: true,
    emptyOutDir: true,
    copyPublicDir: true,
    lib: {
      entry: {
        admin: resolve(import.meta.dirname, 'src/admin/index.ts'),
        'admin/http': resolve(import.meta.dirname, 'src/admin/http/index.ts'),
        platform: resolve(import.meta.dirname, 'src/platform/index.ts'),
        utils: resolve(import.meta.dirname, 'src/utils/index.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rolldownOptions: {
      external: (id) =>
        builtinModules.includes(id) ||
        id.startsWith('node:') ||
        isExternalDependency(id),
    },
  },
});
