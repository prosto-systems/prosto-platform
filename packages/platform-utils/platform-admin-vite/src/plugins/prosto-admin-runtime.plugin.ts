import {
  ADMIN_SHELL_RUNTIME_API_VERSION,
  ADMIN_SHELL_RUNTIME_GLOBAL,
} from '@prosto/platform-sdk/admin';
import type { Plugin } from 'vite';

const SUPPORTED_SPECIFIERS = [
  'vue',
  'vue-i18n',
  'pinia',
  'vue-router',
  'vuetify',
  'vuetify/components',
  'vuetify/directives',
] as const;

const RUNTIME_TARGETS: Readonly<Record<string, string>> = {
  vue: 'vue',
  'vue-i18n': 'i18n',
  pinia: 'pinia',
  'vue-router': 'vueRouter',
  vuetify: 'vuetify.framework',
  'vuetify/components': 'vuetify.components',
  'vuetify/directives': 'vuetify.directives',
};

const runtimeImportPattern =
  /\bimport\s+(?!\()([\s\S]*?)\s+from\s+(['"])([^'"\n]+)\2\s*;?/g;
const sideEffectImportPattern = /\bimport\s+(['"])([^'"\n]+)\1\s*;?/g;
const dynamicImportPattern = /\bimport\s*\(\s*(['"])([^'"\n]+)\1\s*\)/g;

function isSharedRuntimeSpecifier(specifier: string): boolean {
  return (
    specifier === 'vue' ||
    specifier.startsWith('@vue/') ||
    specifier === 'vue-i18n' ||
    specifier.startsWith('vue-i18n/') ||
    specifier === 'pinia' ||
    specifier.startsWith('pinia/') ||
    specifier === 'vue-router' ||
    specifier.startsWith('vue-router/') ||
    specifier === 'vuetify' ||
    specifier.startsWith('vuetify/')
  );
}

function isSupportedSpecifier(
  specifier: string,
): specifier is (typeof SUPPORTED_SPECIFIERS)[number] {
  return SUPPORTED_SPECIFIERS.some((supported) => supported === specifier);
}

function generatedRuntimeTarget(specifier: string): string | undefined {
  if (isSupportedSpecifier(specifier)) {
    return RUNTIME_TARGETS[specifier];
  }

  if (specifier.startsWith('vuetify/components/')) {
    return 'vuetify.components';
  }

  if (specifier.startsWith('vuetify/directives/')) {
    return 'vuetify.directives';
  }

  return undefined;
}

function validateSourceImports(code: string): void {
  const validateSpecifier = (specifier: string): void => {
    if (
      isSharedRuntimeSpecifier(specifier) &&
      !isSupportedSpecifier(specifier)
    ) {
      throw unsupportedSpecifierError(specifier);
    }
  };

  for (const match of code.matchAll(runtimeImportPattern)) {
    validateSpecifier(match[3] ?? '');
  }

  for (const match of code.matchAll(sideEffectImportPattern)) {
    validateSpecifier(match[2] ?? '');
  }

  for (const match of code.matchAll(dynamicImportPattern)) {
    validateSpecifier(match[2] ?? '');
  }
}

function unsupportedSpecifierError(specifier: string): Error {
  return new Error(
    `[prosto-admin-runtime] Unsupported shared runtime import "${specifier}". ` +
      `Runtime ABI v${ADMIN_SHELL_RUNTIME_API_VERSION.toString()} supports only ` +
      `${SUPPORTED_SPECIFIERS.map((supported) => `"${supported}"`).join(', ')}.`,
  );
}

function runtimeUnavailableError(): Error {
  return new Error(
    `[prosto-admin-runtime] Admin runtime ABI v${ADMIN_SHELL_RUNTIME_API_VERSION.toString()} is unavailable.`,
  );
}

function namedBindings(bindingClause: string, target: string): string {
  const bindings = bindingClause.slice(1, -1).trim();

  if (bindings.length === 0) {
    return '';
  }

  const properties = bindings
    .split(',')
    .map((binding) => binding.trim())
    .filter((binding) => binding.length > 0)
    .map((binding) => {
      const [imported, local] = binding.split(/\s+as\s+/);

      if (imported === undefined || imported.length === 0) {
        throw new Error(
          '[prosto-admin-runtime] Unable to transform an invalid named import.',
        );
      }

      return local === undefined ? imported : `${imported}: ${local}`;
    });

  return `const { ${properties.join(', ')} } = ${target};`;
}

function bindingsForImport(
  bindingClause: string,
  target: string,
  generatedExport?: string,
): string {
  const clause = bindingClause.trim();

  if (clause.startsWith('{') && clause.endsWith('}')) {
    return namedBindings(clause, target);
  }

  if (clause.startsWith('* as ')) {
    const namespace = clause.slice('* as '.length).trim();

    if (namespace.length === 0) {
      throw new Error(
        '[prosto-admin-runtime] Unable to transform an invalid namespace import.',
      );
    }

    return `const ${namespace} = ${target};`;
  }

  const separatorIndex = clause.indexOf(',');

  if (separatorIndex === -1) {
    if (generatedExport !== undefined) {
      return `const ${clause} = ${target}.${generatedExport};`;
    }

    return `const ${clause} = ${target}.default;`;
  }

  const defaultBinding = clause.slice(0, separatorIndex).trim();
  const remainingBindings = clause.slice(separatorIndex + 1).trim();

  if (defaultBinding.length === 0 || remainingBindings.length === 0) {
    throw new Error(
      '[prosto-admin-runtime] Unable to transform an invalid mixed import.',
    );
  }

  return `const ${defaultBinding} = ${target}.default;\n${bindingsForImport(remainingBindings, target)}`;
}

function hasBundledSharedRuntime(moduleId: string): boolean {
  const normalizedModuleId = moduleId.replaceAll('\\', '/');

  return (
    normalizedModuleId.includes('/node_modules/vue/') ||
    normalizedModuleId.includes('/node_modules/@vue/') ||
    normalizedModuleId.includes('/node_modules/vue-i18n/') ||
    normalizedModuleId.includes('/node_modules/pinia/') ||
    normalizedModuleId.includes('/node_modules/vue-router/') ||
    normalizedModuleId.includes('/node_modules/vuetify/')
  );
}

function hasBareSharedRuntimeImport(code: string): boolean {
  return /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"](?:vue|vue-i18n|pinia|vue-router|vuetify(?:\/components|\/directives)?)['"]/.test(
    code,
  );
}

/**
 * @experimental
 * Rewrites supported Vue ecosystem imports to package namespaces supplied by the
 * Prosto admin shell. Runtime ABI v1 supports `vue`, `vue-i18n`, `pinia`,
 * `vue-router`, `vuetify`, `vuetify/components`, and `vuetify/directives`.
 * It rejects framework deep imports, Vuetify Labs, locale, and style imports.
 * The runtime does not expose configured shell service instances. Place this
 * plugin after Vue and Vuetify plugins.
 */
export function prostoAdminRuntime(): Plugin[] {
  const validatePlugin: Plugin = {
    name: 'prosto-admin-runtime-source-validation',
    enforce: 'pre',
    transform(code) {
      validateSourceImports(code);
      return null;
    },
  };

  const transformPlugin: Plugin = {
    name: 'prosto-admin-runtime',
    enforce: 'post',
    transform(code) {
      let usesSharedRuntime = false;

      const transformedStaticImports = code.replace(
        runtimeImportPattern,
        (
          statement: string,
          bindingClause: string,
          _quote: string,
          specifier: string,
        ) => {
          if (!isSharedRuntimeSpecifier(specifier)) {
            return statement;
          }

          const runtimeTarget = generatedRuntimeTarget(specifier);

          if (runtimeTarget === undefined) {
            throw unsupportedSpecifierError(specifier);
          }

          usesSharedRuntime = true;
          return bindingsForImport(
            bindingClause,
            `__prostoAdminRuntime.${runtimeTarget}`,
            specifier.startsWith('vuetify/components/') ||
              specifier.startsWith('vuetify/directives/')
              ? specifier.split('/').at(-1)
              : undefined,
          );
        },
      );

      const transformedSideEffectImports = transformedStaticImports.replace(
        sideEffectImportPattern,
        (statement: string, _quote: string, specifier: string) => {
          if (!isSharedRuntimeSpecifier(specifier)) {
            return statement;
          }

          if (!isSupportedSpecifier(specifier)) {
            throw unsupportedSpecifierError(specifier);
          }

          usesSharedRuntime = true;
          return '';
        },
      );

      transformedSideEffectImports.replace(
        dynamicImportPattern,
        (_statement: string, _quote: string, specifier: string) => {
          if (isSharedRuntimeSpecifier(specifier)) {
            throw unsupportedSpecifierError(specifier);
          }

          return _statement;
        },
      );

      if (!usesSharedRuntime) {
        return null;
      }

      const runtimeGuard =
        `const __prostoAdminRuntime = globalThis.${ADMIN_SHELL_RUNTIME_GLOBAL};\n` +
        `if (!__prostoAdminRuntime || __prostoAdminRuntime.apiVersion !== ${ADMIN_SHELL_RUNTIME_API_VERSION.toString()}) throw new Error(${JSON.stringify(runtimeUnavailableError().message)});\n`;

      return {
        code: `${runtimeGuard}${transformedSideEffectImports}`,
        map: null,
      };
    },
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') {
          continue;
        }

        if (hasBareSharedRuntimeImport(output.code)) {
          this.error(
            '[prosto-admin-runtime] Generated bundle retains a shared runtime bare import.',
          );
        }

        const bundledRuntimeModule = Object.keys(output.modules).find(
          hasBundledSharedRuntime,
        );

        if (bundledRuntimeModule !== undefined) {
          this.error(
            `[prosto-admin-runtime] Generated bundle includes shared runtime module "${bundledRuntimeModule}".`,
          );
        }
      }
    },
  };

  return [validatePlugin, transformPlugin];
}
