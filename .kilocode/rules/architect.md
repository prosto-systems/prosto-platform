# Project Architecture Rules (Non-Obvious Only)

- Keep a hard distinction between current-state repository and target-state architecture: `.context/02-architecture-design/*` documents planned micro-core boundaries, not implemented package code in this repo.
- Draft architecture specifies kernel-only responsibilities and explicitly excludes feature/domain logic from core (see ADR-0001); treat this as target constraint for future implementation planning.
- Draft security model requires production module loading by explicit allowlist plus artifact integrity verification and module trust classification (`trusted`, `internal`, `third-party-reviewed`) per ADR-0003.
- Draft package blueprint assigns contract authority to `platform-sdk`, admin contract authority to `platform-admin-contracts`, and reserves full conformance suites for `platform-contract-tests`; avoid merging these responsibilities.
- Draft admin UI model follows hybrid separation from ADR-0009: separate `admin-shell`, contract package, and `platform-adapter-admin-bff`, with no UI runtime in `platform-core`.
- Draft kernel component model mandates pre-start acyclic dependency resolution and structured lifecycle error mapping fields (`moduleId`, `phase`, `errorCode`, `remediationHint`).
- Architecture docs repeatedly assume separate module repositories for feature modules and a separate admin shell repository; do not plan all modules as in-repo packages unless scope is explicitly changed.
