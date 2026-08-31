# Admin dashboard with authentication

## Goal and fixed decisions

- Replace the Vuetify starter in `packages/platform-admin-shell` with a responsive, feature-based admin dashboard.
- Implement cookie-session authentication, session restore, logout, full forgot/reset-password flow, route protection, and RBAC.
- Use `/api/admin` as the API namespace and MSW 2 for browser development mocks and Vitest integration mocks.
- Enable browser mocks only when both `import.meta.env.DEV` and `VITE_ENABLE_MSW=true`; never activate them in production.
- Support English and Russian, plus persisted `light`/`dark`/`system` theme selection. Persist only non-sensitive preferences; never persist session, CSRF token, or credentials in Web Storage.
- Roles: `admin`, `operator`, `viewer`. Permissions, not role names, are authoritative for UI and mocked API checks.
- Extend `platform-sdk` for plugin permission checks, but expose only `can(permission)`; do not expose users, roles, cookies, CSRF tokens, or Vue/Pinia types.
- Browser E2E and a real backend are out of scope. Without MSW, the shell expects a backend at `/api/admin` and must render recoverable network errors until one exists.

## Contracts and behavior

### Public plugin contract

- In `packages/platform-sdk/src/admin/interfaces`, add an `@alpha` `AdminShellPermissionType` (open namespaced string) and `IAdminShellAuthService` with `can(permission): boolean`.
- Add readonly `authorization: IAdminAuthorization` to `IAdminShellPluginContext`; keep `moduleId` readonly. Add required JSDoc/stability tags to every touched public admin export and re-export the new contract through the existing barrels.
- Correct the existing `admin-shell-context.inteface.ts` filename typo while updating barrel/internal imports; package-root imports remain the supported public path.
- Implement a minimal shell-side `IAdminShell` runtime that assigns `globalThis.adminShell` and supplies a live `can()` adapter backed by the auth store. `can()` returns `false` when signed out and reads current permissions on every call. Plugin asset discovery/loading and reactive identity events remain out of scope.

### Internal HTTP contract

Keep these schemas/types inside `platform-admin-shell`; they are not plugin SDK APIs. Validate request forms and every external JSON response with Zod and normalize failures into a sanitized `ApiError` (`status`, stable `code`, optional field errors/correlation ID).

| Method | Path                                      | Behavior / permission                                                                                                                                 |
| --- |-------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| `POST` | `/api/admin/auth/login`                   | Email/password login; returns principal, permissions, and in-memory CSRF token; sets session cookie                                                   |
| `GET` | `/api/admin/auth/session`                 | Restores principal, permissions, and CSRF token; `401` when absent/expired                                                                            |
| `POST` | `/api/admin/auth/logout`                  | Requires session-bound `X-CSRF-Token`; expires cookie                                                                                                 |
| `POST` | `/api/admin/auth/password-reset-requests` | Always returns the same neutral accepted response to prevent account enumeration                                                                      |
| `POST` | `/api/admin/auth/password-resets`         | Accepts one-time reset token, new password, and confirmation; handles invalid/expired/used tokens                                                     |
| `GET` | `/api/admin/plugins`                      | Retrieves the plugins for running platform modules. Returns an array of `IAdminShellPluginInfo` models from the SDK; requires `modules:view` and CSRF |
| `GET` | `/api/admin/dashboard`                    | Summary KPIs; requires `dashboard:view`                                                                                                               |
| `GET` | `/api/admin/platform/health`              | Service/platform health; requires `health:view`                                                                                                       |
| `GET` | `/api/admin/modules`                      | Module status/version rows; requires `modules:view`                                                                                                   |
| `GET` | `/api/admin/activity`                     | Recent audit-style activity; requires `activity:view`                                                                                                 |
| `POST` | `/api/admin/modules/:moduleId/restart`    | Updates mock state/activity; requires `modules:restart` and CSRF                                                                                      |
| `POST` | `/api/admin/platform/restart`             | Restarts the platform; requires `platform:restart` and CSRF                                                                                      |
| `PATCH` | `/api/admin/platform/maintenance`         | Toggles mock maintenance mode/activity; requires `maintenance:manage` and CSRF                                                                        |

Use `credentials: 'same-origin'`. Login/session responses keep the CSRF token only in Pinia memory; authenticated mutations send it in `X-CSRF-Token`. Login, reset request, and reset completion are unauthenticated endpoints and rely on server-side Origin/rate-limit controls outside this frontend scope. Validate `returnUrl` as an internal route before navigation.

Permission matrix:

| Permission | Admin | Operator | Viewer |
| --- | --- | --- | --- |
| `dashboard:view` | yes | yes | yes |
| `health:view` | yes | yes | yes |
| `modules:view` | yes | yes | yes |
| `activity:view` | yes | yes | yes |
| `modules:restart` | yes | yes | no |
| `platform:restart` | yes | yes | no |
| `maintenance:manage` | yes | no | no |

The frontend gates routes, navigation, sections, and controls, but MSW independently enforces sessions, CSRF, and permissions and returns `401`/`403`. A centralized HTTP client unauthorized hook clears in-memory auth and redirects to login with a safe return URL.

## Implementation steps

1. **Dependencies and configuration**
   - Add direct `zod` runtime and `msw` development dependencies to `platform-admin-shell`; update the root lockfile.
   - Generate and commit `packages/platform-admin-shell/public/mockServiceWorker.js` with the MSW CLI and record its worker directory in package metadata.
   - Add package-local `.env.example` with `VITE_ENABLE_MSW=false`; type that variable in `env.d.ts` and remove the stale `vite-plugin-vue-layouts-next` type reference.
   - Change the Vite proxy from `/admin` to `/api/admin` and retain the current backend target. Align `tsconfig.vitest.json` with Vitest's `src/**` and `tests/**` includes.

2. **Feature-based application foundation**
   - Organize production code into `app` (bootstrap, router, layouts, shell runtime), `features/auth`, `features/dashboard`, `features/preferences`, and narrowly scoped `shared/api`/`shared/ui` utilities. Use kebab-case files and lazy page imports.
   - Refactor plugin setup to export a single Pinia instance usable by router guards and the SDK authorization adapter.
   - Await conditional MSW startup before any session request, then install plugins/router and mount. Show an application bootstrap/loading state while the initial session guard resolves.
   - Replace the starter `index.vue`/`HelloWorld.vue` content and remove obsolete scaffold code.

3. **Authentication feature**
   - Add Zod request/response schemas, an auth API service, and a Pinia auth store with explicit `unknown/loading/authenticated/anonymous` states, principal, readonly permissions, and CSRF token.
   - Implement idempotent session initialization, login, logout, permission checks, unauthorized invalidation, reset request, and reset completion. Do not derive permissions client-side from roles.
   - Add routes `/login`, `/forgot-password`, `/reset-password?token=...`, `/`, `/forbidden`, and a catch-all not-found page. Guards support guest-only pages, authenticated pages, required permissions, safe return navigation, and redirect authenticated users away from auth pages.
   - Build accessible Vuetify `VForm` pages with submit-time validation, disabled/loading states, password visibility controls, field/server errors, generic reset-request confirmation, reset-token error states, and success navigation back to login.

4. **MSW behavior**
   - Place shared happy-path handlers under `src/mocks/handlers` grouped by auth/dashboard domain, with browser `setupWorker` and test `setupServer` using the same handlers.
   - Back handlers with a resettable in-memory state factory: three demo users, server-side role-to-permission assignments, session records, CSRF tokens, one-time reset tokens, dashboard data, modules, maintenance status, and activity.
   - Model session cookies with `Set-Cookie`/request cookies and expiration on logout. Document that the real server must set `HttpOnly`, `Secure` where applicable, `SameSite`, and perform Origin/rate-limit/audit controls.
   - Add realistic latency and stable sanitized errors. Keep happy paths in base handlers; tests use `server.use()` for `401`, `403`, `422`, `500`, malformed responses, and network failures.
   - Add a mock-only, development-only login panel that can fill admin/operator/viewer credentials and expose a deterministic reset link. Load mock fixtures/UI only behind the compile-time dev + env flag, and verify demo passwords/tokens are absent from production output.

5. **Dashboard and application chrome**
   - Build a distinct operations-console visual language using the existing Roboto/MDI assets: restrained neutral surfaces, clear status colors, compact information density, and a branded accent rather than a generic template.
   - Use Vuetify's application layout: responsive `VNavigationDrawer`, `VAppBar`, and `VMain`; drawer is persistent/rail-capable on desktop and temporary on mobile. Include page title, locale control, theme control, principal/role menu, and logout.
   - Dashboard sections: greeting/platform state, KPI cards, health/service panel, modules table (mobile cards at small widths), recent activity, and permission-gated maintenance/restart actions.
   - Load dashboard resources independently so one failed section does not blank the page. Provide skeleton, empty, per-section error/retry, mutation progress, and queued snackbar feedback states.
   - Hide actions without permission and provide a forbidden route for protected navigation. Treat API `403` as authoritative even if UI checks passed.

6. **Preferences, i18n, and accessibility**
   - Replace placeholder messages with complete typed English/Russian resources, including Vuetify locale messages through the documented `vue-i18n` adapter. Persist locale, update `<html lang>`, and fall back to English.
   - Keep Vuetify's system theme support, add light/dark/system selection and persist only that preference. Define coherent light/dark Prosto themes and ensure status colors meet contrast requirements.
   - Preserve keyboard navigation and focus visibility, bind Vuetify activator props, provide semantic headings/live error regions/labels, return focus after menus, and respect reduced-motion preferences.

7. **Documentation required by repository policy**
   - Update the existing admin-shell README with actual scripts, `/api/admin` contract summary, MSW opt-in setup, demo-only usage, production backend requirement, permission matrix, and security limitations.
   - Update root `AGENTS.md` because MSW is a newly added development/testing tool; do not add commands that are absent from `package.json`.

## Validation

- SDK type tests prove `IAdminShellPluginContext.authorization.can()` accepts namespaced permissions, remains framework-neutral, and is exported from `@prosto/platform-sdk`.
- Unit tests cover permission lookup, auth state transitions, response validation, safe return URLs, theme/locale persistence, and the shell authorization adapter (including signed-out behavior).
- MSW-backed integration tests cover login for all three roles, invalid credentials, session restore/expiry, CSRF rejection, logout, neutral forgot-password response, reset success, invalid/expired/reused token, and login with the changed mock password.
- Router/component tests cover guest/auth redirects, forbidden routes, action visibility for each role, server-side `403`, dashboard loading/partial failure/retry/empty states, maintenance toggle, module restart, locale switching, and mobile drawer behavior.
- Configure Vitest global MSW lifecycle: `listen({ onUnhandledRequest: 'error' })`, `resetHandlers` plus mock-state reset after each test, and `close` after all tests.
- Run only repository-backed commands: `npm run test --workspace=@prosto/platform-sdk`, `npm run test --workspace=@prosto/platform-admin-shell`, `npm run typecheck --workspace=@prosto/platform-sdk`, `npm run typecheck --workspace=@prosto/platform-admin-shell`, `npm run build --workspace=@prosto/platform-admin-shell`, and root `npm run lint`.
- After the production build, inspect `dist` to confirm no active worker registration and no demo credential/reset-token strings. Manually smoke-test desktop and narrow mobile layouts in both locales and all theme modes with `VITE_ENABLE_MSW=true`.

## Risks and boundaries

- The repository has no backend auth/dashboard implementation or OpenAPI source. These shell-local schemas are the provisional integration contract; a future backend must implement them or the contract must be deliberately revised.
- MSW approximates cookie behavior but cannot prove production cookie flags or server security controls. Those remain backend acceptance requirements.
- The SDK authorization addition is `@alpha`. It intentionally provides only a live imperative `can()` check; plugin identity, auth change subscriptions, protected route contributions, and plugin loading are not included.
- There is no data migration. Existing users have no persisted auth state; only new locale/theme preference keys are introduced.
