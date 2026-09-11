# Module Test Example

`@examples/module-test` is a reference package for a Prosto platform module
and its trusted first-party admin plugin. It includes a module manifest,
contract-conformance test, platform artifact, admin artifact, translations,
workspaces, menu items, and blades.

## Build

Requires Node.js >= 22.23.0 and npm >= 10. Install workspace dependencies and
build dependencies first from the repository root; `npm run build` uses
Turborepo's dependency ordering and includes this example. Package-scoped builds
below do not build other workspaces automatically:

```bash
npm run build --workspace=@examples/module-test
npm run test:contracts --workspace=@examples/module-test
npm run pack --workspace=@examples/module-test
```

`build` emits the platform module and admin plugin under `dist/`. `pack` builds
both artifacts and creates `artifacts/module-test-1.0.0.zip`, containing `dist/`,
`manifest.json`, and `package.json`, but no installed dependencies. This is a
custom ZIP command, not `npm pack`; the core does not install ZIP archives.
The core's local discovery ignores `artifacts/` and uses the package root
`manifest.json`, `package.json`, and built `dist/` directory. The preferred
platform entry is declared by the package's `./platform` export.

`test:contracts` runs both lifecycle/manifest conformance and admin export
declaration tests. There are no `test`, `dev`, or `typecheck` scripts in this
workspace. The platform build emits declarations with diagnostic checking;
the admin build compiles Vue/TypeScript with Vite, without a separate `vue-tsc`
check. Building the example does not start a platform host or serve its plugin.

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
- `tests/admin-exports.test.ts` checks the declared admin entry and stylesheet exports.

The platform lifecycle currently logs `init`, `start`, and `stop`; it does not
register HTTP endpoints or persistence entities. The admin plugin adds
`/workspace/test` and `/workspace/test2` and their Browse menu items, all gated by
`maintenance:manage`. The first workspace opens the main blade. Use a principal
with that permission when testing the plugin in a host.

The admin build uses `@prosto/platform-admin-vite`; Vue, Vue I18n, Pinia, Vue
Router, and Vuetify are peer dependencies supplied by the admin shell runtime.
Refer to the [admin shell README](../../packages/platform-admin-shell/README.md)
for the plugin manifest and shared-runtime import restrictions.
