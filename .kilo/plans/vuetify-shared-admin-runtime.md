# Shared Vue ecosystem runtime for admin modules

## Goal

Allow trusted same-origin admin modules such as `examples/module-test` to use normal source imports from `vue`, `vue-i18n`, `pinia`, `vue-router`, `vuetify`, `vuetify/components`, and `vuetify/directives`, while the browser uses the same Vue ecosystem packages configured by `platform-admin-shell`.

The first slice must prove that a remotely loaded blade can use Vue, Vue I18n, Pinia, Vue Router, Vuetify components, composables, directives, shell theme, locale, and blade injection without bundling a second Vue ecosystem runtime.

## Decisions

- Admin modules are trusted first-party code and plugin asset URLs must be same-origin.
- Keep native ESM plugin artifacts.
- Replace import-time self-registration with one named `registerAdminPlugin` export.
- Use `globalThis.__PROSTO_ADMIN_RUNTIME__` as a versioned runtime ABI.
- Rewrite supported package imports to that global during module builds; do not use import maps or Module Federation.
- Runtime API v1 supports only `vue`, `vue-i18n`, `pinia`, `vue-router`, `vuetify`, `vuetify/components`, and `vuetify/directives`.
- Expose the root namespaces of Vue, Vue I18n, Pinia, and Vue Router, plus all stable Vuetify components and directives. Framework deep imports, Vuetify Labs, locale adapters, and styles are not part of v1.
- Check only the platform admin runtime ABI version at load time. Expose actual Vue/Vuetify versions for diagnostics, but do not independently gate on them. An incompatible change to any exposed Vue ecosystem API must bump the runtime ABI.
- Load plugins in manifest order. A failed plugin is reported and skipped; remaining plugins continue loading.
- Preserve the current application/session lifecycle. Do not add unload, reload, logout cleanup, or hot module installation.
- Scope this plan to SDK contracts, frontend runtime/loader, reusable Vite build tooling, `module-test`, MSW, tests, and developer documentation. Production module discovery/static serving, CSP, and cryptographic integrity are separate work.
- No compatibility fallback for the current side-effect entry format is required because the affected API is alpha and the current implementation is not a shipped compatibility constraint.

## Target flow

1. Shell imports the real Vue, Vue I18n, Pinia, Vue Router, and Vuetify framework/components/directives namespaces.
2. Before router plugin loading begins, shell installs an immutable runtime descriptor at `globalThis.__PROSTO_ADMIN_RUNTIME__`, installs Vuetify with the same component/directive objects, and retains ownership of the configured i18n, Pinia, and router instances.
3. A module is authored with normal direct imports and compiled with the platform Vite integration.
4. The Vite integration replaces supported imports with references to the global runtime and fails the build for unsupported/deep imports.
5. The server manifest declares the required admin runtime ABI and same-origin entry/style URLs.
6. Shell validates the manifest entry, loads required CSS, dynamically imports the ESM URL, validates its export shape, and passes `registerAdminPlugin` to `AdminShell.registerPlugin`.
7. Registration is awaited. The loader records a typed success/failure result and proceeds to the next plugin.
8. Failed module IDs are shown in a non-blocking shell alert; sanitized structured details are logged.

## Implementation steps

### 1. Define SDK contracts first

Update the public admin contracts before changing shell or module implementations.

Targets:

- `packages/platform-sdk/src/admin/interfaces/admin-shell.interface.ts`
- `packages/platform-sdk/src/admin/interfaces/admin-shell-plugin-info.interface.ts`
- `packages/platform-sdk/src/admin/global.d.ts`
- `packages/platform-sdk/src/admin/interfaces/index.ts`
- `packages/platform-sdk/src/admin/index.ts`
- New focused constants/schema files below `packages/platform-sdk/src/admin/`; do not place constants directly in package `src/`.

Changes:

- Add `ADMIN_SHELL_RUNTIME_API_VERSION = 1` and `ADMIN_SHELL_RUNTIME_GLOBAL = '__PROSTO_ADMIN_RUNTIME__'` as documented `@alpha` exports.
- Add an `@alpha` `IAdminShellRuntime` contract containing:
  - literal `apiVersion`;
  - diagnostic `vueVersion` and `vuetifyVersion` strings;
   - opaque/read-only Vue, Vue I18n, Pinia, and Vue Router namespaces;
   - Vuetify framework, components, and directives namespaces.
- Add the optional global declaration for `globalThis.__PROSTO_ADMIN_RUNTIME__`.
- Add an `@alpha` plugin ESM contract/type guard for a module namespace with exactly one required callable export: `registerAdminPlugin` compatible with `RegisterPluginCallbackType`.
- Add `runtimeApiVersion` to `IAdminShellPluginInfo`.
- Tighten the plugin-info contract/schema for this format:
  - `entry.type` must be `script`;
  - `contentFiles` may contain styles only in v1;
  - module IDs follow the repository module-ID format;
  - versions and paths are non-empty;
  - duplicate module IDs are rejected;
  - duplicate asset declarations within a module are rejected.
- Move the reusable Zod schema to `platform-sdk` so SDK types and runtime validation have one authority; have the shell import it instead of duplicating the shape in `platform.schemas.ts`.
- Make `IAdminShell.registerPlugin` awaitable (`Promise<this>` or an equivalently explicit async result) so registration callback failures reach the loader. Update JSDoc.
- Keep `__PROSTO_ADMIN_SHELL__` for the existing shell capability API, but new plugin entries must not discover it at import time.

Acceptance:

- Invalid entry types, script content files, duplicate IDs/assets, and wrong ABI field types fail SDK schema tests.
- The remote namespace guard rejects missing/non-function `registerAdminPlugin` exports.
- Every new public export has an explicit stability annotation and JSDoc.

### 2. Add reusable admin Vite integration

Create a publishable build-tool package, rather than copying fragile transform configuration into each module.

Target package:

- `packages/platform-utils/platform-admin-vite/`

Follow the repository publishable-package layout: root `package.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig*.json`, implementation under structured `src/` folders, and `tests/`.

Public API:

- Export one documented `@experimental` Vite plugin factory, for example `prostoAdminRuntime()`.
- The plugin targets runtime ABI v1 from `platform-sdk`.

Build behavior:

- Use an ES-output-compatible external-globals transform after Vue/Vuetify SFC transforms.
- Map:
  - `vue` -> `globalThis.__PROSTO_ADMIN_RUNTIME__.vue`;
  - `vue-i18n` -> `globalThis.__PROSTO_ADMIN_RUNTIME__.i18n`;
  - `pinia` -> `globalThis.__PROSTO_ADMIN_RUNTIME__.pinia`;
  - `vue-router` -> `globalThis.__PROSTO_ADMIN_RUNTIME__.vueRouter`;
  - `vuetify` -> `globalThis.__PROSTO_ADMIN_RUNTIME__.vuetify.framework`;
  - `vuetify/components` -> `globalThis.__PROSTO_ADMIN_RUNTIME__.vuetify.components`;
  - `vuetify/directives` -> `globalThis.__PROSTO_ADMIN_RUNTIME__.vuetify.directives`.
- Add a generated runtime guard before any mapped value is read. It must throw a stable error when the global is absent or `apiVersion !== 1`.
- Preserve ESM exports from the plugin entry so browser `import(url)` returns `registerAdminPlugin`.
- Reject at build time:
  - `@vue/*` imports and deep imports from `vue-i18n`, `pinia`, and `vue-router`;
  - `vuetify/styles` and CSS/Sass style imports from Vuetify;
  - `vuetify/labs/*`;
  - `vuetify/locale/*`;
  - `vuetify/components/*`, `vuetify/directives/*`, and every other deep `vuetify/*` import;
  - dynamic imports of shared runtime packages.
- Add a final bundle assertion that generated JS contains neither unresolved supported bare imports nor recognizable bundled Vue ecosystem runtime modules.
- Keep module-owned CSS enabled; only Vuetify-owned CSS is forbidden because the shell owns it.

Dependency/tooling notes:

- Prefer `rollup-plugin-external-globals` only after a focused Vite 8/Rolldown compatibility fixture proves that it runs after `vite-plugin-vuetify` and preserves ESM exports.
- If that compatibility fixture fails, implement the equivalent narrowly scoped transform inside this package instead of changing the runtime architecture or silently bundling dependencies.
- Add the new build tool and resulting package commands to `AGENTS.md` as required by repository policy.

Acceptance fixture:

- Build a small SFC that explicitly imports APIs from Vue I18n, Pinia, Vue Router, a Vuetify component/composable, and a Vuetify directive.
- Assert the output remains ESM, exports `registerAdminPlugin`, reads the global runtime, contains no bare shared-package imports, and does not contain a second Vue ecosystem implementation.
- Assert every forbidden import category produces a clear build error naming the supported v1 specifiers.

### 3. Install the host runtime from the shell's real instances

Targets:

- New `../../packages/platform-admin-shell/src/app/runtime/admin-runtime.ts`
- A focused shared namespace file under `packages/platform-admin-shell/src/app/plugins/` if needed to avoid duplicate namespace declarations
- `packages/platform-admin-shell/src/app/plugins/vuetify.ts`
- `packages/platform-admin-shell/src/app/plugins/index.ts`

Changes:

- Import `* as Vue` from `vue`, `* as I18n` from `vue-i18n`, `* as Pinia` from `pinia`, and `* as VueRouter` from `vue-router`.
- Import `* as VuetifyFramework` from `vuetify`, `* as VuetifyComponents` from `vuetify/components`, and `* as VuetifyDirectives` from `vuetify/directives`.
- Configure the existing `createVuetify` call with those exact `components` and `directives` namespaces while retaining current locale/theme configuration.
- Install a read-only/frozen runtime descriptor containing those same namespace objects and diagnostic Vue/Vuetify package versions.
- Install it before any router guard can load remote plugins. Make installation idempotent for the same ABI/object and fail loudly if another incompatible value already occupies the global.
- Expose package namespaces only. Do not expose configured i18n, Pinia, or router instances, the app instance, or mutable shell services through this runtime global.
- Do not create a second `createVuetify()` instance for modules.

Acceptance:

- Unit tests prove all runtime namespaces are the shell-imported objects and runtime component/directive references are the exact objects used to configure shell Vuetify.
- Reinstalling the same runtime is harmless; a conflicting global is rejected.
- Existing shell theme and locale tests continue to pass.
- Capture the shell production bundle output before/after because publishing all stable components intentionally increases bundle size; document the measured impact without changing the selected all-components policy in this slice.

### 4. Replace script injection with explicit ESM loading

Targets:

- `packages/platform-admin-shell/src/features/platform/utils/plugins.utils.ts`
- `packages/platform-admin-shell/src/features/platform/composables/use-platform.ts`
- `packages/platform-admin-shell/src/app/shell/admin-shell.service.ts`
- Relevant exports under `packages/platform-admin-shell/src/features/platform/`

Loader changes:

- Replace `<script type="module">` injection with `import(/* @vite-ignore */ resolvedUrl)`.
- Resolve asset URLs through one utility using `new URL(path, window.location.origin)`.
- Reject non-HTTP(S), credentials in URLs, cross-origin URLs, and paths outside the agreed `/modules/` asset prefix before loading.
- Add/update the cache key using `URL.searchParams`, preserving any existing query string.
- Load each plugin sequentially in manifest order:
  1. validate ABI and URLs;
  2. load and await all declared styles for that plugin;
  3. import its entry with a bounded timeout;
  4. validate the ESM namespace;
  5. await `adminShell.registerPlugin(moduleId, registerAdminPlugin)`;
  6. record the result;
  7. continue regardless of that plugin's result.
- Treat declared styles as required. If a style fails or times out, remove its inserted link, mark the plugin failed, and do not register it.
- A timed-out JS import may finish later, but it cannot register itself because entries have no import-time side effects.
- Remove the current behavior that resolves script errors as success and swallows registration callback rejections.
- Preserve server-provided topological order; do not add dependency sorting in the frontend.

`AdminShell` changes:

- Await the plugin callback before adding the module ID to `plugins`.
- Propagate callback failures.
- Reject duplicate/in-progress registration deterministically rather than logging and returning success.
- Keep the existing service facades and registration context unchanged unless required by the async return contract.

Result model:

- Add an internal typed result per module: `pending | loaded | failed`.
- Use stable sanitized failure codes such as `runtime_incompatible`, `asset_url_rejected`, `style_load_failed`, `entry_import_failed`, `entry_timeout`, `invalid_entry`, `registration_failed`, and `duplicate_plugin`.
- Store module ID/version, status, and code; do not put raw stack traces or arbitrary remote error messages into user-visible state.
- Log one structured diagnostic event with module ID/version/code and the original error as an internal cause.
- Replace the one-shot `loadingPluginsPromise` bookkeeping with state/promise semantics that accurately represent the current single application load. Do not expand this into reload/unload lifecycle support.

Acceptance:

- One failing plugin does not prevent a later plugin from registering.
- Dependency order remains deterministic.
- Registration is not reported successful until an async callback completes.
- A late import after timeout cannot mutate shell registration.
- Cross-origin, `data:`, `javascript:`, traversal/out-of-prefix, and credential-bearing URLs are rejected before DOM/network use.

### 5. Surface non-blocking failures in the shell

Targets:

- New focused component under `packages/platform-admin-shell/src/features/platform/components/`, for example `PluginLoadAlert`
- `packages/platform-admin-shell/src/app/layouts/main-layout.vue`
- `packages/platform-admin-shell/src/app/locales/en.ts`
- `packages/platform-admin-shell/src/app/locales/ru.ts`

Changes:

- Keep `main-layout.vue` as a composition surface; place alert presentation in the new component.
- Pass a typed list of failed module IDs/codes through props.
- Show a dismissible, non-blocking Vuetify alert/snackbar after loading finishes when any plugin failed.
- Present module IDs and a localized generic message; keep stack traces and raw errors out of the UI.
- Do not add retry, diagnostics route, unload, or hot reload controls in this slice.

Acceptance:

- No alert appears when all plugins load.
- Multiple failures are summarized without blocking navigation.
- English and Russian messages are present and tested where existing locale tests permit.

### 6. Migrate `module-test` to the shared runtime build

Targets:

- `examples/module-test/package.json`
- `examples/module-test/vite.config.ts`
- `examples/module-test/tsconfig.admin.json` if needed by the Vite integration
- `examples/module-test/src/admin/admin.plugin.ts`
- `examples/module-test/src/admin/main-blade.vue`
- `packages/platform-admin-shell/src/mocks/mock-state.ts`

Build configuration:

- Add `vite-plugin-vuetify` and `@prosto/platform-admin-vite` as development tooling.
- Keep Vue, Vue I18n, Pinia, Vue Router, and Vuetify available for source typing/build-time resolution, but model them as host-provided peer dependencies rather than bundled admin runtime dependencies; add matching dev dependencies where workspace-independent module development requires installation.
- In admin mode use, in order:
  - Vue plugin with `transformAssetUrls`;
  - Vuetify plugin with auto-import enabled and Vuetify style emission disabled;
  - platform admin runtime transform.
- Keep the platform/Node build branch unchanged.
- Keep a deterministic ESM entry filename. Give module-owned CSS a deterministic filename and list it in mock `contentFiles` when emitted.

Plugin entry:

- Remove the IIFE and `useAdminShell()` call.
- Export `registerAdminPlugin` with the SDK callback type.
- Register workspace/menu/blade contributions only when shell invokes that function.
- Keep module ID sourced from `manifest.json`; ensure package and manifest version metadata are made consistent while touching this boundary.

Blade proof:

- Use explicit imports from `vuetify/components` for representative stable components such as `VCard`, `VCardTitle`, `VCardText`, and `VBtn`.
- Import at least one composable such as `useTheme` from `vuetify`.
- Import representative APIs from `vue-i18n`, `pinia`, and `vue-router` to prove they resolve through the shared runtime without bundling their packages.
- Use one stable directive through `vuetify/directives` or Vuetify auto-import.
- Retain `bladeScopeToken` injection and prove it works with the shared Vue runtime.
- Demonstrate that theme changes in shell affect the blade and that the blade can clear `isLoading`.
- Keep the demo focused in one SFC; it remains a small integration fixture rather than a production feature.

Mock manifest:

- Add runtime API v1 to `module-test` plugin info.
- Keep the same-origin `/modules/module-test/...` entry.
- List the module-owned CSS asset when build output includes it.
- Stop using `Date.now()` as if it were integrity metadata; retain it only as an explicitly named development cache-buster or replace it with stable fixture data. Cryptographic integrity remains out of scope.

### 7. Add contract and integration tests

SDK tests:

- Runtime/global contract typing.
- Plugin-info Zod schema success/failure matrix.
- ESM namespace type guard.
- Async `registerPlugin` type contract.

Build-tool tests:

- Vite `write: false` fixture for explicit imports, template auto-import, composable, and directive.
- Forbidden import matrix.
- Bundle inspection proving no unresolved shared imports and no inlined Vue ecosystem runtime.
- Generated ESM can be imported after installing a test global and exposes the expected registration function.

Shell unit tests:

- Runtime installer identity/conflict behavior.
- URL policy and cache-query handling.
- Style success/error/timeout cleanup.
- Import timeout and invalid namespace handling.
- Sequential order and continue-on-failure behavior.
- Async registration success/failure/duplicate behavior.
- Failure-state aggregation and alert rendering.

End-to-end frontend integration test:

- Build/import the `module-test` admin artifact under a test global backed by the shell's actual Vue ecosystem namespaces.
- Register its blade through the real `AdminShell` service and mount the blade under shell Vuetify with `@vue/test-utils`/Happy DOM.
- Assert there are no `inject() outside setup`, unresolved-component, missing Vuetify defaults/theme, missing Vue I18n/Pinia/router injection, or duplicate-runtime warnings.
- Assert the Vuetify button renders, the shell theme is observable, blade scope injection succeeds, and registration is reported loaded.
- Keep a manual real-browser MSW smoke check for native dynamic import and CSS serving because Happy DOM does not execute network-loaded module scripts like a browser.

### 8. Document the module-author contract

Targets:

- `packages/platform-admin-shell/README.md`
- `AGENTS.md` for the new tool/package/commands required by repository policy
- Public JSDoc in SDK and admin Vite package

Document:

- Supported source imports: `vue`, `vue-i18n`, `pinia`, `vue-router`, `vuetify`, `vuetify/components`, and `vuetify/directives`; explicitly unsupported deep/Labs/style imports.
- Shell ownership of its Vue app, Vuetify, i18n, Pinia, and router instances, theme, locale, components, directives, fonts, and Vuetify CSS; the global runtime exposes only package namespaces, not mutable shell services or configured instances.
- Module ownership of its own scoped/global feature CSS and the requirement to declare emitted CSS as a plugin content file.
- Required `registerAdminPlugin` named export and no import-time registration side effects.
- Runtime ABI v1 policy: Vue/Vuetify versions are diagnostic; ABI must be bumped for incompatible changes to an exposed Vue ecosystem API.
- Trusted same-origin execution model and the fact that this is a capability/API boundary, not a sandbox.
- Current frontend-only limitation: production discovery, serving, integrity, and CSP are not implemented by this slice.
- Correct the existing README drift between `/plugins` and the actual `/api/admin/platform/manifest` endpoint while editing this area.

### 9. Verify the complete slice

Run the repository's existing gates after package-specific tests:

- `npm run build`
- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run format`

Then perform the existing development flow with MSW enabled and verify:

- manifest and CSS URLs are same-origin;
- `admin.plugin.js` imports and registers once;
- the module blade renders Vuetify components, follows shell theme/locale, and resolves Vue I18n, Pinia, and Vue Router APIs from the shared runtime;
- browser console contains no duplicate Vue ecosystem runtime or Vuetify injection warnings;
- a deliberately broken second mock plugin produces the visible non-blocking alert while `module-test` still loads;
- built `admin.plugin.js` contains the runtime global references and no bundled Vue ecosystem implementation;
- shell production output includes the intentionally exposed stable Vuetify component/directive set.

## Rollout and migration

1. Land SDK contract changes and build-tool package first so consumers compile against runtime ABI v1.
2. Land shell runtime installation and explicit loader together; the loader must not accept the old side-effect entry shape.
3. Migrate `module-test` and its mock manifest in the same change so the development shell remains usable.
4. Treat any other existing admin artifact as requiring rebuild with `@prosto/platform-admin-vite`; do not silently load legacy artifacts.
5. Preserve current page/session lifecycle and require a full browser reload after changing installed module artifacts.
6. Before changing an exposed Vue ecosystem package in shell later, run build fixtures and integration tests; bump the runtime ABI when the exposed namespace behavior or supported API becomes incompatible.

## Explicitly out of scope

- Production backend/HTTP adapter for installed-module discovery and static asset serving.
- Artifact signatures, content digests/SRI, content-addressed URLs, and CSP headers.
- Cross-origin plugin hosting.
- Untrusted plugin sandboxing.
- Module hot unload/reload, logout cleanup, retry UI, and a diagnostics page.
- Module Federation or import maps.
- Deep imports from Vue ecosystem packages; Vuetify Labs, locale adapters, and direct style imports.
- Framework-agnostic admin UI abstractions or replacing Vuetify with platform-owned wrapper components.

## Main risks

- Exposing all stable components/directives increases the initial shell bundle; this is an accepted decision and must be measured.
- `rollup-plugin-external-globals` may not be fully compatible with Vite 8/Rolldown; the fixture gate must fail closed and trigger the scoped internal-transform fallback.
- Global runtime is not a security sandbox. Same-origin trust and backend manifest integrity remain prerequisites for production.
- ABI-only compatibility makes the ABI bump discipline critical: an incompatible Vue ecosystem upgrade without a bump can break modules at runtime.
- Native `import()` cannot be canceled; explicit side-effect-free registration is what makes timeouts safe.
