module.exports = {
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.json',
  },
  overrides: [
    {
      files: ['**/__tests__/**/*.{js,ts,tsx}'],
      settings: {
        'import/resolver': {
          jest: {
            jestConfigFile: './config/jest.config.server.js',
          },
        },
      },
    },
  ],
}
