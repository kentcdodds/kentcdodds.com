module.exports = {
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.json',
  },
  rules: {
    // we grab deps from the directory up
    'import/no-extraneous-dependencies': 'off',
  },
}
