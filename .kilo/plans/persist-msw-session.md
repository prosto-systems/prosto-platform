# Persist MSW Session Across Reloads

## Status

As of **2026-09-11**, mock session persistence is implemented.
`src/mocks/mock-session-storage.ts` in the shell validates the versioned
`prosto.admin.msw.sessions.v1` snapshot with Zod, filters expired/unknown-user
sessions, restores the sequence, and contains storage failures. `mock-state.ts`
hydrates and saves that snapshot; storage unit tests and auth-handler tests
include restoration after recreating the mock runtime.

The [admin shell README](../../packages/platform-admin-shell/README.md) is the
current authority for opt-in MSW and production authentication boundaries.
This is simulated backend persistence only, not persistence of the production
Pinia auth store. The original design and acceptance scenarios below are
retained; their presence is not proof of browser-restart or multi-tab behavior.
Tests and real-browser acceptance checks were not rerun for this documentation review.

## Goal

Keep an authenticated `platform-admin-shell` MSW session valid across page reloads, new tabs, and browser restarts for the existing one-hour cookie lifetime. Preserve the current opaque cookie flow: Pinia starts empty and restores the principal, permissions, and CSRF token through `GET /api/admin/auth/session`.

## Decisions And Scope

- Persist only MSW's simulated server-side session records and ID sequence in `localStorage`; do not persist the auth Pinia store.
- Use a dedicated versioned key such as `prosto.admin.msw.sessions.v1`; do not depend on MSW's private `__msw-cookie-store__` implementation.
- Validate the stored snapshot with Zod before hydration. Reject malformed payloads and remove expired sessions or sessions referencing users absent from the current fixtures.
- Treat unavailable/blocked storage as a graceful fallback to the current in-memory behavior.
- Keep production authentication, SDK contracts, router guards, startup order, and Vue component boundaries unchanged. No component changes are required.
- Persisted mock sessions expire after the existing one-hour lifetime. Logout removes both the in-memory and persisted record.
- Real-time synchronization between two already-running tabs is out of scope; each new page runtime hydrates the latest persisted snapshot.

## Implementation Steps

1. Add an internal MSW session persistence boundary under `packages/platform-admin-shell/src/mocks/`.
   - Encapsulate browser `Storage` access in a focused class/adapter so persistence is independently testable and `mock-state.ts` does not own serialization details.
   - Define a strict Zod schema for a versioned snapshot containing `sessionSequence` and the serialized `IMockSession` records (`id`, `userId`, `csrfToken`, `expiresAt`).
   - Implement safe load, save, and clear operations with storage exceptions contained inside the adapter.
   - On load, discard invalid, expired, and unknown-user records; rewrite or remove stale persisted data so it cannot be repeatedly reprocessed.

2. Integrate the persistence boundary into `packages/platform-admin-shell/src/mocks/mock-state.ts`.
   - Hydrate `sessions` and `sessionSequence` when the module-level mock state is first created.
   - Save the snapshot after `createSession`, after expired-session cleanup in `findActiveSession`, and after `destroySession`.
   - Ensure the restored sequence cannot reuse an existing session/CSRF identifier after reload.
   - Keep `resetMockState()` deterministic by clearing persisted mock sessions before rebuilding fixture state.
   - Expose only the minimal mock-state reload hook needed to emulate a fresh page runtime in an integration test, while keeping persistence implementation details private.

3. Harden stale-session handling in `packages/platform-admin-shell/src/mocks/handlers/auth.handlers.ts`.
   - When `GET /auth/session` cannot resolve the persisted cookie to a valid session, return the existing `401 session_expired` response with an expired session cookie.
   - Preserve the existing successful response shape and logout CSRF behavior.

4. Add focused Vitest coverage.
   - Add unit tests for valid snapshot hydration, malformed payload removal, unknown-user filtering, expired-session cleanup, storage failure fallback, and sequence restoration.
   - Extend `src/mocks/handlers/auth.handlers.test.ts` with the lifecycle `login -> recreate mock state while retaining cookie/storage -> GET /auth/session`, asserting the same principal and CSRF token are restored.
   - Cover `logout -> recreate mock state -> GET /auth/session`, asserting `401 session_expired` and no persisted session remains.
   - Update `src/mocks/test-setup.ts` only as needed to clear the dedicated persisted state and session cookie between tests without clearing unrelated application preferences.

5. Verify the package using repository-defined commands.
   - `npm run test --workspace=@prosto/platform-admin-shell`
   - `npm run typecheck --workspace=@prosto/platform-admin-shell`
   - `npm run build --workspace=@prosto/platform-admin-shell`
   - `npm run lint`

## Acceptance Scenarios

- With `VITE_ENABLE_MSW=true`, login followed by a hard reload remains on the protected route and restores the user through `/auth/session`.
- A new tab or browser restart within one hour restores the session when the cookie is still present.
- Logout prevents restoration after reload.
- Expired, malformed, or fixture-incompatible persisted data produces an anonymous session and is removed.
- Blocking `localStorage` does not break MSW startup or login in the current page; only cross-reload persistence is unavailable.
- No auth state or real credentials are introduced into production persistence, and the current `prosto.admin.session` Pinia-persistence prohibition remains intact.

## Risks

- The persisted CSRF token is acceptable only because this is an explicitly enabled development MSW backend simulation; production remains cookie-backed and unchanged.
- Other mutable mock state (password changes, reset tokens, maintenance, activity) still resets on reload by design.
- Existing unrelated worktree changes in `main-layout.vue` and `src/shared/utils/` must not be modified.
