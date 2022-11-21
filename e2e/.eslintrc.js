/** @type {import('@types/eslint').Linter.BaseConfig} */
module.exports = {
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.json',
  },
  rules: {
    'testing-library/prefer-screen-queries': 'off',
  },
}
