module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      files: ['__tests__/**/*.{js,jsx}', '*.test.{js,jsx}', 'jest.setup.js'],
      env: { jest: true },
    },
    {
      // Node tooling scripts (ES modules, run with node - not app code).
      files: ['scripts/**/*.mjs'],
      env: { node: true },
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
  ],
};
