import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**'],
  },
  {
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
    files: ['**/*.{ts,tsx,mts,cts}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strict,
      ...tseslint.configs.stylistic,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { disallowTypeAnnotations: false },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
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
    },
  },
  prettierConfig,
);
