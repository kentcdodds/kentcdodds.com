module.exports = {
  extends: './node_modules/kcd-scripts/eslint.js',
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.json',
  },
  rules: {
    'no-console': 'off',

    // meh...
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/sort-type-union-intersection-members': 'off',
    'jsx-a11y/media-has-caption': 'off',
    'jsx-a11y/label-has-associated-control': 'off',
    '@babel/new-cap': 'off',
    'react/jsx-filename-extension': 'off',
    '@typescript-eslint/no-namespace': 'off',

    // I can't figure these out:
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',

    // enable these again someday:
    '@typescript-eslint/no-unsafe-argument': 'off',
  },
}
