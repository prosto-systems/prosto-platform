# @prosto/platform-admin-vite

`@prosto/platform-admin-vite` builds Prosto admin plugin artifacts against the
Vue ecosystem runtime supplied by `@prosto/platform-admin-shell`. It is an
`@experimental` Vite integration for admin runtime ABI v1.

The plugin rewrites supported shared-runtime imports to the shell runtime global
and prevents those dependencies from being bundled into the plugin artifact.
The shell remains the owner of the Vue application and configured Vue I18n,
Pinia, Vue Router, Vuetify, and Vuetify styles.

## Requirements

- Node.js >= 22.23.0
- Vite ^8.2.1
- An admin plugin loaded by `@prosto/platform-admin-shell`

## Installation

```bash
npm install --save-dev @prosto/platform-admin-vite vite @vitejs/plugin-vue vite-plugin-vuetify
```

## Usage

Configure `prostoAdminRuntime()` after the Vue and Vuetify Vite plugins. Set
Vuetify to `styles: 'none'`, because the shell supplies Vuetify styles. Declare
the shared Vue ecosystem packages as peer dependencies of the admin module and
make them available locally for compilation, as in
[`examples/module-test`](../../../examples/module-test/package.json).

Use library mode to emit a native ESM plugin rather than an HTML application:

```ts
import { prostoAdminRuntime } from '@prosto/platform-admin-vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify';

export default defineConfig({
  plugins: [
    vue({ template: { transformAssetUrls } }),
    vuetify({ autoImport: true, styles: 'none' }),
    prostoAdminRuntime(),
  ],
  build: {
    outDir: 'dist/admin',
    lib: {
      entry: 'src/admin/admin.plugin.ts',
      formats: ['es'],
      fileName: () => 'admin.plugin.js',
      cssFileName: 'admin.plugin',
    },
  },
});
```

Runtime ABI v1 supports direct imports only from:

```ts
import * as Vue from 'vue';
import { useI18n } from 'vue-i18n';
import { defineStore } from 'pinia';
import { useRouter } from 'vue-router';
import { useTheme } from 'vuetify';
import { VBtn, VCard } from 'vuetify/components';
import { Ripple } from 'vuetify/directives';
```

The generated artifact requires the compatible runtime global exposed by the
admin shell. It throws at module evaluation when that runtime is absent or its
ABI version differs.

## Unsupported Imports

The build rejects shared-runtime deep imports and dynamic imports, including:

- `@vue/*`
- `vue-i18n/*`, `pinia/*`, and `vue-router/*`
- `vuetify/styles`, Vuetify CSS or Sass, `vuetify/labs/*`, and `vuetify/locale/*`
- `vuetify/components/*` and `vuetify/directives/*`

Do not create another Vue ecosystem runtime or import shell-owned styles in an
admin plugin. Plugin-specific CSS remains allowed and must be listed as a
`style` entry in the plugin manifest's `contentFiles`.

## Public API

- `prostoAdminRuntime()` - returns Vite plugins that validate shared-runtime
  imports, rewrite supported imports to the shell runtime, and verify that no
  shared runtime code or shared-runtime bare imports remain in the generated bundle.

This plugin does not generate package exports or the platform manifest. Declare
`./admin` and each emitted stylesheet as `./admin/styles/<name>` in the module's
`package.json`; declare referenced support files as `./admin/assets/<name>`.
The production runtime builds the delivery manifest from those explicit exports.
Import SDK admin APIs from `@prosto/platform-sdk/admin`; the SDK has no root export.

## Scripts

Run these commands from the repository root:

Direct workspace commands require built SDK dependencies. After `npm install`,
the root `npm run build` builds workspaces in dependency order.

| Command                                                     | Purpose                                      |
| ----------------------------------------------------------- | -------------------------------------------- |
| `npm run build --workspace=@prosto/platform-admin-vite`     | Build the ESM package and type declarations. |
| `npm run typecheck --workspace=@prosto/platform-admin-vite` | Type-check the package.                      |
| `npm run test --workspace=@prosto/platform-admin-vite`      | Run the Vitest suite once.                   |

See [`@prosto/platform-admin-shell`](../../platform-admin-shell/README.md) for
the admin plugin manifest and registration-context contract.
