import type { Diagnostic } from 'typescript';
import { builtinModules } from 'node:module';
import { resolve } from 'node:path';
import pkg from './package.json' with { type: 'json' };
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify';

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

export default defineConfig(({ mode }) => {
  if (mode === 'platform') {
    return {
      resolve: {
        tsconfigPaths: true,
      },
      plugins: [
        dts({
          entryRoot: 'src/platform',
          afterDiagnostic: hasDtsDiagnostics,
          tsconfigPath: './tsconfig.platform.json',
        }),
      ],
      build: {
        target: 'node22',
        outDir: 'dist/platform',
        sourcemap: true,
        minify: true,
        emptyOutDir: true,
        lib: {
          entry: resolve(
            import.meta.dirname,
            'src/platform/platform.module.ts',
          ),
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
    };
  }

  if (mode === 'admin') {
    return {
      plugins: [
        vue({
          template: { transformAssetUrls },
        }),
        vuetify({
          autoImport: true,
        }),
      ],
      resolve: {
        tsconfigPaths: true,
      },
      build: {
        target: 'esnext',
        outDir: 'dist/admin',
        sourcemap: true,
        minify: true,
        emptyOutDir: true,
        lib: {
          entry: resolve(import.meta.dirname, 'src/admin/admin.plugin.ts'),
          formats: ['es'],
          fileName: () => 'admin.plugin.js',
        },
      },
    };
  }

  throw new Error(`Unsupported Vite build mode: ${mode}`);
});
