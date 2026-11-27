import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'coverage/'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      // catch vazio é intencional em pontos de "melhor esforço" (ex.: log de sync)
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
];
