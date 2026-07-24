/* Legacy-friendly config: errors that would block CI on this un-linted codebase are downgraded
   to warnings. Formatting is Prettier's job, so eslint-config-prettier disables style rules. */
module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: { react: { version: 'detect' } },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  plugins: ['react-refresh'],
  rules: {
    'no-unused-vars': 'warn',
    'no-empty': 'warn',
    'no-constant-condition': 'warn',
    'no-case-declarations': 'warn',
    'react/prop-types': 'off',
    'react/no-unescaped-entities': 'off',
    'react/display-name': 'off',
    'react-hooks/exhaustive-deps': 'warn',
  },
  ignorePatterns: ['dist', 'build', 'node_modules', '.eslintrc.cjs', 'src/auto_generated'],
};
