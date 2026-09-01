# @prosto/platform-tsconfig

`@prosto/platform-tsconfig` is a private workspace package that provides the
shared strict TypeScript base configuration for Prosto Platform packages and
examples. It is not published as a runtime dependency.

Extend `base.json` from a package-specific TypeScript configuration:

```json
{
  "extends": "@prosto/platform-tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./dist"
  }
}
```

The base config uses NodeNext modules and resolution, strict type checking,
declarations and source maps, verbatim ESM syntax, unchecked-index protection,
and unknown catch variables. Each workspace owns its package-specific include,
output, and environment settings.
