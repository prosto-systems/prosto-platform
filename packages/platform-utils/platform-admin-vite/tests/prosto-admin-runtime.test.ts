import {
  ADMIN_SHELL_RUNTIME_API_VERSION,
  ADMIN_SHELL_RUNTIME_GLOBAL,
} from '@prosto/platform-sdk/admin';
import Vue from '@vitejs/plugin-vue';
import { build } from 'vite';
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify';
import { afterEach, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { prostoAdminRuntime } from '@/index.js';

const fixturesDirectory = resolve(import.meta.dirname, 'fixtures');
const previousRuntimeDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  ADMIN_SHELL_RUNTIME_GLOBAL,
);

function fixturePath(fileName: string): string {
  return resolve(fixturesDirectory, fileName);
}

async function buildFixture(fileName: string, withSfcPlugins = false) {
  return build({
    configFile: false,
    logLevel: 'silent',
    plugins: [
      ...(withSfcPlugins
        ? [
            Vue({ template: { transformAssetUrls } }),
            Vuetify({ autoImport: true, styles: 'none' }),
          ]
        : []),
      prostoAdminRuntime(),
    ],
    build: {
      write: false,
      lib: {
        entry: fixturePath(fileName),
        formats: ['es'],
        fileName: () => 'admin.plugin.js',
      },
    },
  });
}

function outputCode(result: Awaited<ReturnType<typeof build>>): string {
  const outputs = Array.isArray(result) ? result : [result];

  return outputs
    .filter(
      (output): output is NonNullable<typeof output> => output !== undefined,
    )
    .flatMap((output) => ('output' in output ? output.output : []))
    .flatMap((output) => (output.type === 'chunk' ? [output.code] : []))
    .join('\n');
}

afterEach(() => {
  if (previousRuntimeDescriptor === undefined) {
    Reflect.deleteProperty(globalThis, ADMIN_SHELL_RUNTIME_GLOBAL);
    return;
  }

  Object.defineProperty(
    globalThis,
    ADMIN_SHELL_RUNTIME_GLOBAL,
    previousRuntimeDescriptor,
  );
});

describe('prostoAdminRuntime', () => {
  it('builds an ESM plugin against the shared Vue ecosystem runtime', async () => {
    const result = await buildFixture('admin-plugin.ts', true);
    const code = outputCode(result);

    expect(code).toContain(`globalThis.${ADMIN_SHELL_RUNTIME_GLOBAL}`);
    expect(code).toContain('registerAdminPlugin');
    expect(code).not.toMatch(
      /from\s+['"](?:vue|vue-i18n|pinia|vue-router|vuetify)/,
    );
    expect(code).not.toContain('@vue/reactivity');

    const encodedCode = Buffer.from(code).toString('base64');
    const moduleUrl = `data:text/javascript;base64,${encodedCode}`;

    Reflect.deleteProperty(globalThis, ADMIN_SHELL_RUNTIME_GLOBAL);
    await expect(import(`${moduleUrl}#missing-runtime`)).rejects.toThrow(
      '[prosto-admin-runtime] Admin runtime ABI v1 is unavailable.',
    );

    Object.defineProperty(globalThis, ADMIN_SHELL_RUNTIME_GLOBAL, {
      configurable: true,
      value: {
        apiVersion: ADMIN_SHELL_RUNTIME_API_VERSION,
        vue: {},
        i18n: { createI18n: () => ({}) },
        pinia: { defineStore: () => () => ({}) },
        vueRouter: { useRouter: () => ({}) },
        vuetify: {
          framework: {
            useTheme: () => ({ global: { current: { value: {} } } }),
          },
          components: { VBtn: {} },
          directives: { Ripple: {} },
        },
      },
    });

    const pluginModule = await import(`${moduleUrl}#available-runtime`);

    expect(pluginModule.registerAdminPlugin).toBeTypeOf('function');
  });

  it.each([
    'forbidden-vue-internal.ts',
    'forbidden-vuetify-style.ts',
    'forbidden-vuetify-labs.ts',
    'forbidden-vuetify-locale.ts',
    'forbidden-vuetify-deep-component.ts',
    'forbidden-vuetify-deep-directive.ts',
    'forbidden-vuetify-framework.ts',
    'forbidden-vue-i18n-deep.ts',
    'forbidden-pinia-deep.ts',
    'forbidden-vue-router-deep.ts',
    'forbidden-dynamic-import.ts',
  ])('rejects unsupported import %s', async (fileName) => {
    await expect(buildFixture(fileName)).rejects.toThrow(
      'Runtime ABI v1 supports only "vue", "vue-i18n", "pinia", "vue-router", "vuetify", "vuetify/components", "vuetify/directives".',
    );
  });
});
