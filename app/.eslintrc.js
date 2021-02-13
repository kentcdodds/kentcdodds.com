module.exports = {
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.json',
  },
  rules: {
    // this was compalining on "url:./styles.css" files
    'import/extensions': 'off',
  },
  overrides: [
    {
      files: ['**/__tests__/**/*.{js,ts,tsx}'],
      settings: {
        'import/resolver': {
          jest: {
            jestConfigFile: './jest.config.js',
          },
        },
      },
    },
  ],
}
