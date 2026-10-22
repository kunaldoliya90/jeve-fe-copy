import js from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import testingLibrary from 'eslint-plugin-testing-library';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Architectural layers, outermost first. A layer may import from layers below
 * it, never from layers above it. Each entry below lists the forbidden targets
 * for one layer, which is what keeps the dependency graph acyclic and the
 * shared code genuinely shared.
 *
 *   app      -> composes everything; the only layer that knows about routing
 *   pages    -> route-level screens; compose features + shared UI
 *   features -> self-contained vertical slices; must not import sibling features
 *   shared   -> components, hooks, lib, utils, config, types, stores
 */
const layerRules = [
  {
    name: 'features may not reach into app, pages, or sibling feature internals',
    files: ['src/features/*/**/*.{ts,tsx}'],
    restrict: [
      {
        group: ['@/app', '@/app/*', '@/app/**'],
        message:
          'A feature must not depend on the app shell. Invert it: let app/ pass what the feature needs in.',
      },
      {
        group: ['@/pages', '@/pages/*', '@/pages/**'],
        message:
          'A feature must not depend on a page. Pages compose features, not the other way round.',
      },
      {
        group: ['@/features/*/*', '@/features/*/**'],
        message:
          'Import a sibling feature only through its public API: @/features/<name>, never a file inside it.',
      },
    ],
  },
  {
    name: 'shared layers may not depend on app, pages, or features',
    files: [
      'src/components/**/*.{ts,tsx}',
      'src/hooks/**/*.{ts,tsx}',
      'src/lib/**/*.{ts,tsx}',
      'src/utils/**/*.{ts,tsx}',
      'src/config/**/*.{ts,tsx}',
      'src/types/**/*.{ts,tsx}',
      'src/stores/**/*.{ts,tsx}',
    ],
    restrict: [
      {
        group: ['@/app', '@/app/*', '@/app/**'],
        message: 'Shared code must not depend on the app shell -- that makes it unshareable.',
      },
      {
        group: ['@/pages', '@/pages/*', '@/pages/**'],
        message: 'Shared code must not depend on a page.',
      },
      {
        group: ['@/features', '@/features/*', '@/features/**'],
        message:
          'Shared code must not depend on a feature. If one feature needs it, it belongs in that feature; if several do, it belongs here without the feature import.',
      },
    ],
  },
  {
    name: 'pages may not import feature internals',
    files: ['src/pages/**/*.{ts,tsx}'],
    restrict: [
      {
        group: ['@/features/*/*', '@/features/*/**'],
        message: 'Import a feature only through its public API: @/features/<name>.',
      },
    ],
  },
  {
    name: 'app may not import feature internals',
    files: ['src/app/**/*.{ts,tsx}'],
    restrict: [
      {
        group: ['@/features/*/*', '@/features/*/**'],
        message: 'Import a feature only through its public API: @/features/<name>.',
      },
    ],
  },
];

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'playwright-report',
      'test-results',
      'node_modules',
      '*.timestamp-*',
    ],
  },

  // -- Base: all TypeScript source -----------------------------------------
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      // Deterministic import order, so diffs stay about behaviour.
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000'], // side-effect imports
            ['^node:'],
            ['^@?\\w'], // external packages
            ['^@/'], // internal aliases
            ['^\\.'], // relative
          ],
        },
      ],
      'simple-import-sort/exports': 'error',

      // Prefer the alias over deep relative paths; aliases survive file moves.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../*'],
              message: 'Use the @/ alias instead of climbing more than one directory.',
            },
          ],
        },
      ],

      // Type safety that pays for itself.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],

      // Logging is a decision, not a debugging leftover: route it through
      // @/lib/logger so it can be silenced or pointed at a sink.
      'no-console': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-param-reassign': ['error', { props: false }],
      'object-shorthand': ['error', 'always'],
      'prefer-const': ['error', { destructuring: 'all' }],
    },
  },

  // -- React ---------------------------------------------------------------
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest'], jsxA11y.flatConfigs.recommended],
    plugins: {
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // The route table is a configuration module that happens to contain JSX: its
  // only export is the router, and HMR for routes is the router's own concern.
  {
    files: ['src/app/router/routes.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  // -- Architectural boundaries --------------------------------------------
  ...layerRules.map(({ files, restrict }) => ({
    files,
    rules: {
      'no-restricted-imports': ['error', { patterns: restrict }],
    },
  })),

  // -- Tests ---------------------------------------------------------------
  {
    files: ['src/**/*.{test,spec}.{ts,tsx}', 'src/testing/**/*.{ts,tsx}'],
    extends: [vitest.configs.recommended, testingLibrary.configs['flat/react']],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      'no-console': 'off',
    },
  },

  // -- Playwright E2E (Node environment, no jsdom globals) -----------------
  {
    files: ['e2e/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.node },
    rules: {
      'no-console': 'off',
    },
  },

  // -- Config files run in Node --------------------------------------------
  {
    files: ['*.config.{ts,js}', '*.config.*.{ts,js}'],
    languageOptions: { globals: globals.node },
    rules: {
      'no-console': 'off',
    },
  },

  // Must stay last: turns off every rule Prettier owns.
  prettier,
);
