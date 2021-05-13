module.exports = {
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.json',
  },
  rules: {
    'testing-library/prefer-screen-queries': 'off',
    'testing-library/await-async-utils': 'off',
  },
}
