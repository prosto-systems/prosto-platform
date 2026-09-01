# Module Test Example

`@examples/module-test` is a reference package for a Prosto platform module
and its trusted first-party admin plugin. It includes a module manifest,
contract-conformance test, platform artifact, admin artifact, translations,
workspaces, menu items, and blades.

## Build

Run commands from the repository root:

```bash
npm run build --workspace=@examples/module-test
npm run test:contracts --workspace=@examples/module-test
npm run pack --workspace=@examples/module-test
```

`build` emits the platform module and admin plugin under `dist/`. `pack` builds
both artifacts and creates a distributable module archive under `artifacts/`.

## Structure

- `manifest.json` declares the module's SDK identity and dependencies.
- `src/platform/platform.module.ts` implements the platform lifecycle.
- `src/admin/admin.plugin.ts` exports the `registerAdminPlugin` callback.
- `src/admin/locales/` provides English and Russian admin messages.
- `tests/contracts.test.ts` registers reusable module contract checks.

The admin build uses `@prosto/platform-admin-vite`; Vue, Vue I18n, Pinia, Vue
Router, and Vuetify are peer dependencies supplied by the admin shell runtime.
Refer to the [admin shell README](../../packages/platform-admin-shell/README.md)
for the plugin manifest and shared-runtime import restrictions.
