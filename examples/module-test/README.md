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
The core's local discovery ignores `artifacts/` and uses the package root
`manifest.json`, `package.json`, and built `dist/` directory. The preferred
platform entry is declared by the package's `./platform` export.

The admin artifact is declared rather than inferred: `./admin` names the ESM
entry and `./admin/styles/main` names its CSS. Production discovery accepts only
concrete `./admin`, `./admin/styles/<name>`, and optional
`./admin/assets/<name>` exports targeting regular files below `dist/admin`.
Add an explicit support export for every emitted chunk, image, or font that the
entry references. The production manifest keeps each target's relative path
below `/modules/module-test/` and requires its generated `v` query parameter.

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
