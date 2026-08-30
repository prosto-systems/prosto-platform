# @prosto/platform-admin-shell

Responsive administration shell for Prosto Platform. It provides cookie-session
authentication, permission-gated operational views, English/Russian localization,
and persisted non-sensitive display preferences.

## Requirements

- Node.js >= 22.23.0
- npm >= 10

Install workspace dependencies from the repository root:

```bash
npm install
```

## Scripts

Run these commands from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run dev --workspace=@prosto/platform-admin-shell` | Start the Vite development server on `127.0.0.1:3000`. |
| `npm run build --workspace=@prosto/platform-admin-shell` | Type-check and build the production bundle. |
| `npm run build:only --workspace=@prosto/platform-admin-shell` | Build with Vite without the package type-check step. |
| `npm run preview --workspace=@prosto/platform-admin-shell` | Serve the production build locally. |
| `npm run typecheck --workspace=@prosto/platform-admin-shell` | Run `vue-tsc`. |
| `npm run test --workspace=@prosto/platform-admin-shell` | Run the Vitest suite once. |
| `npm run test:unit --workspace=@prosto/platform-admin-shell` | Run the Vitest suite with verbose reporting. |

## API contract

The shell calls the same-origin `/api/admin` namespace with
`credentials: 'same-origin'`. Responses are validated at the client boundary;
failed requests are normalized to a sanitized error containing an HTTP status,
stable code, optional field errors, and optional correlation ID.

Login and session restoration return a principal, its server-provided permissions,
and a CSRF token. The token remains in Pinia memory only. Authenticated mutations,
including logout, send it in `X-CSRF-Token`. The session itself is represented by a
cookie and is never written to Web Storage.

| Method | Path | Authorization |
| --- | --- | --- |
| `POST` | `/auth/login` | Public; accepts email and password. |
| `GET` | `/auth/session` | Session cookie; returns `401` for no or expired session. |
| `POST` | `/auth/logout` | Session cookie and `X-CSRF-Token`. |
| `POST` | `/auth/password-reset-requests` | Public; always returns the same accepted response. |
| `POST` | `/auth/password-resets` | Public; accepts a one-time reset token and new password. |
| `GET` | `/platform/manifest` | `modules:view`, session cookie, and `X-CSRF-Token`; returns platform metadata and ordered admin plugin entries. |
| `GET` | `/dashboard` | `dashboard:view`. |
| `GET` | `/platform/health` | `health:view`. |
| `GET` | `/modules` | `modules:view`. |
| `GET` | `/activity` | `activity:view`. |
| `POST` | `/modules/:moduleId/restart` | `modules:restart` and `X-CSRF-Token`. |
| `POST` | `/platform/restart` | `platform:restart` and `X-CSRF-Token`. |
| `PATCH` | `/platform/maintenance` | `maintenance:manage` and `X-CSRF-Token`; body: `{ "enabled": boolean }`. |

The `/api/admin` prefix is omitted from the table paths. In development, Vite
proxies this namespace to `http://127.0.0.1:3001` unless MSW intercepts it.

## Admin module runtime

Admin plugin artifacts are native ESM files executed as trusted, first-party
same-origin code. The runtime is a capability and API boundary, not a sandbox:
module code can access everything normally available to same-origin JavaScript.
Only plugin assets served from the shell origin under `/modules/` are accepted.

The shell owns its Vue app and configured Vuetify, Vue I18n, Pinia, and Vue
Router instances, including theme, locale, stable Vuetify components and
directives, fonts, and all Vuetify CSS. Modules may import the shared package
APIs, but must not create competing application-wide runtimes, reconfigure
shell services, or import Vuetify styles. The runtime global exposes package
namespaces only; it does not expose the app or configured service instances. A
module owns only its feature CSS, whether scoped or global. If the admin build
emits CSS, declare every emitted stylesheet as a `style` entry in the plugin
manifest's `contentFiles`; the shell loads it before the ESM entry.

### Build contract

Build admin entries with `@prosto/platform-admin-vite`. Configure the plugins in
this order after the standard Vue template asset transform:

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
});
```

Runtime ABI v1 supports direct source imports only from:

```ts
import * as Vue from 'vue';
import { useI18n } from 'vue-i18n';
import { defineStore } from 'pinia';
import { useRouter } from 'vue-router';
import { useTheme } from 'vuetify';
import { VBtn, VCard } from 'vuetify/components';
import { Ripple } from 'vuetify/directives';
```

The build fails for `@vue/*`, deep imports from `vue-i18n`, `pinia`, and
`vue-router`, dynamic imports of shared runtime packages, and all other
Vuetify paths. In particular, do not import `vuetify/styles`, Vuetify CSS/Sass,
`vuetify/labs/*`, `vuetify/locale/*`, `vuetify/components/*`, or
`vuetify/directives/*`. These restrictions prevent a second Vue ecosystem
runtime or shell-owned styling from being bundled into a module artifact.

An ESM admin entry must export exactly one named registration callback. It must
not register itself or discover shell globals when the module is imported:

```ts
import type { RegisterPluginCallbackType } from '@prosto/platform-sdk';

export const registerAdminPlugin: RegisterPluginCallbackType = (context) => {
  context.mainMenuService.addMenuItem({
    path: 'example',
    title: 'Example',
    permission: 'modules:view',
    action: async () => undefined,
  });
};
```

The manifest declares `runtimeApiVersion: 1`, a `script` entry, and optional
module-owned `style` content files. The shell validates the runtime ABI before
loading and invokes `registerAdminPlugin` only after the entry is imported and
validated. Vue and Vuetify version strings are diagnostics only; an incompatible
change to an exposed Vue ecosystem API requires an admin runtime ABI bump.

### Current limitations

This frontend slice does not implement production module discovery, static asset
serving, cryptographic artifact integrity, or Content Security Policy headers.
Those server-side controls are required before production deployment and are not
provided by MSW or the runtime loader.

## Permissions

Permissions, not role names, are authoritative. The shell hides unavailable routes
and controls, but the API remains the final authorization authority.

| Permission | Admin | Operator | Viewer |
| --- | --- | --- | --- |
| `dashboard:view` | yes | yes | yes |
| `health:view` | yes | yes | yes |
| `modules:view` | yes | yes | yes |
| `activity:view` | yes | yes | yes |
| `modules:restart` | yes | yes | no |
| `platform:restart` | yes | yes | no |
| `maintenance:manage` | yes | no | no |

## MSW development mocks

MSW 2 supplies browser development mocks and Vitest integration mocks from the
same handler set. Browser mocking is strictly opt-in: it starts only when both
Vite development mode is active and `VITE_ENABLE_MSW=true`. It is not registered
in a production build.

Create `packages/platform-admin-shell/.env.local` with:

```bash
VITE_ENABLE_MSW=true
```

Then run the `dev` script. Omit the variable or set it to `false` to use the Vite
proxy and a backend instead. The committed worker is
`public/mockServiceWorker.js`; do not enable MSW in deployed environments.

The mock login panel is compiled only for development with MSW enabled. It can
fill the three demonstration accounts and expose a deterministic password-reset
link for UI testing. These fixtures are demonstration-only, reset whenever the
mock state is reset, and must not be treated as user accounts or credentials for
any environment.

## Production backend and security limits

Without MSW, the shell requires a backend implementing the contract above at
`/api/admin`. Until one is available, network failures are rendered as recoverable
section or form errors; MSW is not a backend substitute.

MSW models session cookies, CSRF checks, permission checks, and reset-token
semantics, but it cannot validate production browser-cookie protections or server
security controls. The real backend must set `HttpOnly`, `Secure` where applicable,
and an appropriate `SameSite` policy. It must also validate `Origin`, rate-limit and
audit authentication/password-reset requests, enforce authorization independently,
and protect session and reset-token storage.
