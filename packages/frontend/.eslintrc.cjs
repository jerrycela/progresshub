/* eslint-env node */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/vue3-recommended',
    'plugin:prettier/recommended',
  ],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
    'vue/multi-word-component-names': 'off',
    'vue/no-v-html': 'error',
    'vue/require-v-for-key': 'error',
    'vue/no-unused-vars': 'error',
    'vue/no-mutating-props': ['error', { shallowOnly: true }],
    'vue/require-default-prop': 'off',
  },
}
