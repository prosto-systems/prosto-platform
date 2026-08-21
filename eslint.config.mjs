import js from '@eslint/js';
import vuePrettierConfig from '@vue/eslint-config-prettier';
import {
  defineConfigWithVueTs,
  vueTsConfigs,
} from '@vue/eslint-config-typescript';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import tsEslint from 'typescript-eslint';

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-ignore',
    ignores: [
      '**/public/**',
      '**/artifacts/**',
      '**/dist/**',
      '**/dist-ssr/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.idea/**',
    ],
  },
  {
    name: 'app/js-files',
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
  {
    name: 'app/ts-vue-files',
    files: ['**/*.{ts,tsx,mts,cts,vue}'],
    extends: [
      js.configs.recommended,
      ...tsEslint.configs.strict,
      ...tsEslint.configs.stylistic,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  vuePrettierConfig,
  {
    name: 'app/override-rules',
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { disallowTypeAnnotations: false },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          filter: {
            regex: '^(?:ImportMeta|ImportMetaEnv|RouteMeta)$',
            match: true,
          },
          format: ['PascalCase'],
        },
        { selector: 'interface', format: ['PascalCase'], prefix: ['I'] },
        {
          selector: 'typeAlias',
          format: ['PascalCase'],
          suffix: ['Type'],
          leadingUnderscore: 'allowSingleOrDouble',
        },
        { selector: 'enum', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['PascalCase'] },
      ],
      '@typescript-eslint/no-extraneous-class': 'off',
      // '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      curly: ['warn', 'multi-line', 'consistent'],
      'no-shadow': 'off', // See: https://typescript-eslint.io/rules/no-shadow/#how-to-use
      'no-unused-vars': 'off',
      'prefer-rest-params': 'warn',
      'spaced-comment': [
        'warn',
        'always',
        {
          //-+-+-+-+-+-+-+-+
          // Banner example
          //-+-+-+-+-+-+-+-+

          //----------------
          // Banner example
          //----------------
          line: {
            markers: ['/'],
            exceptions: ['-', '-+'],
          },

          /*****************
           * Banner example
           *****************/
          block: {
            markers: ['!'],
            exceptions: ['*'],
            balanced: true,
          },
        },
      ],
      'vue/block-lang': ['error', { script: { lang: 'ts' } }],
      'vue/block-order': [
        'warn',
        {
          order: [
            'template',
            'script:not([setup])',
            'script[setup]',
            'style:not([scoped])',
            'style[scoped]',
          ],
        },
      ],
      'vue/custom-event-name-casing': [
        'warn',
        'camelCase',
        {
          ignores: ['/^[a-z]+:[a-z]+(?:[A-Z][a-z]+)*$/u'], // Пример: $emit('change:itemQuantity', $event)
        },
      ],
      'vue/define-macros-order': [
        'error',
        {
          order: [
            'defineOptions',
            'defineEmits',
            'defineProps',
            'defineSlots',
            'defineModel',
          ],
          defineExposeLast: true,
        },
      ],
    },
  },
);
