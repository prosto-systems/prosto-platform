# @prosto/platform-core

Phase 05 runtime foundation package for deterministic module lifecycle orchestration.

## Implemented Scope (Phase 05)
- Bootstrap pipeline: `discover -> validate -> resolve -> lifecycle`
- Deterministic dependency ordering with cycle detection and missing dependency diagnostics
- Startup policy modes: `strict` and `best-effort`
- Critical module failure override (always abort startup)
- Structured startup and shutdown diagnostics payloads
- Reverse-order shutdown with bounded timeout handling

## Public API
- `RuntimeBuilder` composition root for runtime wiring
- `PlatformRuntime` class with explicit `start()` and `stop()`
- Runtime report types for startup/shutdown diagnostics
- Runtime reason taxonomy constants

## Package Checks
- `npm run typecheck --workspace @prosto/platform-core`
- `npm run test --workspace @prosto/platform-core`
