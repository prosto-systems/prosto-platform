# @prosto/platform-admin-shell

Responsive administration shell for Prosto Platform. It provides cookie-session
authentication, permission-gated operational views, English/Russian localization,
persisted non-sensitive display preferences, and an alpha runtime for trusted
first-party admin plugins.

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
| `GET` | `/platform/manifest` | Production backend: `modules:view`, session cookie, and `X-CSRF-Token`; returns platform metadata and ordered admin plugin entries. |
| `GET` | `/dashboard` | `dashboard:view`. |
| `GET` | `/platform/health` | `health:view`. |
| `GET` | `/modules` | `modules:view`. |
| `GET` | `/activity` | `activity:view`. |
| `POST` | `/modules/:moduleId/restart` | `modules:restart` and `X-CSRF-Token`. |
| `POST` | `/platform/restart` | `platform:restart` and `X-CSRF-Token`. |
| `PATCH` | `/platform/maintenance` | `maintenance:manage` and `X-CSRF-Token`; body: `{ "enabled": boolean }`. |

The `/api/admin` prefix is omitted from the table paths. In development, Vite
proxies this namespace to `http://127.0.0.1:3001` unless MSW intercepts it.
Production backends must enforce `modules:view` for the manifest. The current
MSW manifest handler validates the mock session and CSRF token but does not
enforce that permission.

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

An ESM admin entry must export exactly one named registration callback. Plugin
entries must register through the injected callback context, rather than
discovering shell globals when imported. This is a required plugin convention,
not a loader-side security sandbox:

```ts
import type { IAdminShellPluginContext } from '@prosto/platform-sdk';
import ExampleBlade from './example-blade.vue';

const WORKSPACE = 'example.workspace';

export function registerAdminPlugin(context: IAdminShellPluginContext): void {
  context.translationService.registerLocaleMessages({
    en: { example: { title: 'Example' } },
    ru: { example: { title: 'Example' } },
  });

  context.workspaceService.addWorkspace(WORKSPACE, {
    url: '/example',
    title: 'example.title',
    onMounted: () => {
      context.bladeService.showBlade({
        id: 'example.main',
        title: 'example.title',
        component: ExampleBlade,
      });
    },
  });

  context.mainMenuService.addMenuItem({
    path: 'browse/example',
    title: 'example.title',
    action: async () => {
      await context.workspaceService.go(WORKSPACE);
    },
  });
}
```

The manifest requires `runtimeApiVersion: 1`, a `script` entry, and a
`contentFiles` array. Use an empty array when the module has no CSS; every item
in `contentFiles` must be a module-owned `style` asset.

```json
{
  "moduleId": "example",
  "moduleVersion": "1.0.0",
  "runtimeApiVersion": 1,
  "entry": {
    "type": "script",
    "path": "/modules/example/admin.plugin.js",
    "hash": "build-hash"
  },
  "contentFiles": [
    {
      "type": "style",
      "path": "/modules/example/admin.plugin.css",
      "hash": "build-hash"
    }
  ]
}
```

The shell accepts only same-origin asset URLs under `/modules/`. An optional
`hash` is appended only as the `v` cache-busting query parameter. Styles load
before the ESM entry. The shell validates the runtime ABI, imports and validates
the entry, then invokes `registerAdminPlugin`. Vue and Vuetify version strings
are diagnostics only; an incompatible change to an exposed Vue ecosystem API
requires an admin runtime ABI bump.

### Plugin registration services

The registration context is an `@alpha` SDK API. It contains `authService`,
`translationService`, `workspaceService`, `mainMenuService`, `bladeService`, and
`bladeToolbarService`, as well as the plugin's `moduleId`.

#### Translations

`translationService.registerLocaleMessages()` merges message maps into the
shell's Vue I18n instance. Supply both supported locales, `en` and `ru`, and
prefix keys with the module ID to avoid collisions.

```ts
translationService.registerLocaleMessages({
  en: { example: { save: 'Save' } },
  ru: { example: { save: 'Save' } },
});
```

#### Menus and workspaces

`mainMenuService` accepts paths beginning with `browse/` or `configuration/`.
The shell categorizes them by that prefix, hides items that the current
principal cannot access, and sorts by ascending priority. Users' menu favorites
are stored per principal in browser storage.

`workspaceService.addWorkspace()` adds an authenticated child route below
`/workspace`. For example, `url: '/example'` creates `/workspace/example`.
The optional `onMounted` and `onUnmounted` callbacks are workspace lifecycle
hooks. Menu actions normally navigate with `workspaceService.go(workspaceName)`.

#### Blades and toolbar commands

The default workspace page is a blade container. Blades are scoped to the
active workspace and are cleared when it is left. `bladeService.showBlade()`
applies defaults, replaces a matching blade, and accepts an optional parent
blade for nested navigation. A blade component can call `useBladeScope()` from
`@prosto/platform-sdk` to access its reactive blade and the service facades.

`bladeToolbarService.register()`, `tryRegister()`, and `override()` add commands
for a blade ID. Toolbar commands are permission-filtered and sorted by priority;
their names and optional titles may be translation keys.

### Plugin loading behavior

The shell loads the ordered manifest entries after authentication on the first
authenticated route transition. Loading remains in manifest order. A failure in
one plugin does not prevent later plugins from loading: the shell displays a
dismissible alert naming the affected module and writes the detailed cause to
`console.error`.

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

Only the development mock persists its simulated session backing store in
`localStorage` under `prosto.admin.msw.sessions.v1`. Production shell code does
not persist the real session or CSRF token.

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
