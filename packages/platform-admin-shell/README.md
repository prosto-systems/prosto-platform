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
| `GET` | `/plugins` | `modules:view`, session cookie, and `X-CSRF-Token`. |
| `GET` | `/dashboard` | `dashboard:view`. |
| `GET` | `/platform/health` | `health:view`. |
| `GET` | `/modules` | `modules:view`. |
| `GET` | `/activity` | `activity:view`. |
| `POST` | `/modules/:moduleId/restart` | `modules:restart` and `X-CSRF-Token`. |
| `POST` | `/platform/restart` | `platform:restart` and `X-CSRF-Token`. |
| `PATCH` | `/platform/maintenance` | `maintenance:manage` and `X-CSRF-Token`; body: `{ "enabled": boolean }`. |

The `/api/admin` prefix is omitted from the table paths. In development, Vite
proxies this namespace to `http://127.0.0.1:3001` unless MSW intercepts it.

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
