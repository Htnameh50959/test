import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import importPlugin from 'eslint-plugin-import';
import prettierConfig from 'eslint-config-prettier';

export default [
  { ignores: ['dist', 'node_modules', 'coverage'] },

  // ── Base JS rules ─────────────────────────────────────────────────────────
  js.configs.recommended,

  // ── React files ───────────────────────────────────────────────────────────
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks':    reactHooks,
      'react-refresh':  reactRefresh,
      import:           importPlugin,
    },
    rules: {
      // ── React Hooks ──────────────────────────────────────────────────────
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // ── Import ordering ──────────────────────────────────────────────────
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-duplicates': 'error',

      // ── General best practices ───────────────────────────────────────────
      'no-console':          ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars':      ['warn', { argsIgnorePattern: '^_' }],
      'prefer-const':        'error',
      'no-var':              'error',
      eqeqeq:                ['error', 'always'],
      'no-param-reassign':   ['error', { props: false }],
      'consistent-return':   'warn',
    },
  },

  // ── Prettier must be last to turn off conflicting rules ───────────────────
  prettierConfig,
];
