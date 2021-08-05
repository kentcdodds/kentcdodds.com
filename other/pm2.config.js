module.exports = {
  apps: [
    {
      name: 'Server',
      script: [
        'node',
        '--inspect',
        '--experimental-wasm-threads',
        '--require ./node_modules/dotenv/config',
        '--require ./mocks',
        './index.js',
      ]
        .filter(Boolean)
        .join(' '),
      watch: ['./mocks/**/*.ts', './index.js', './.env'],
      env: {
        NODE_ENV: process.env.NODE_ENV ?? 'development',
        ENABLE_TEST_ROUTES: process.env.ENABLE_TEST_ROUTES ?? true,
        RUNNING_E2E: process.env.RUNNING_E2E,
        FORCE_COLOR: '1',
      },
    },
    {
      name: 'Remix',
      script: 'remix dev',
      ignore_watch: ['.'],
      env: {
        NODE_ENV: process.env.NODE_ENV ?? 'development',
        ENABLE_TEST_ROUTES: process.env.ENABLE_TEST_ROUTES ?? true,
        RUNNING_E2E: process.env.RUNNING_E2E,
        FORCE_COLOR: '1',
      },
    },

    // We build postcss to other/postcss.ignored and use rsync to copy them to
    // the app directory. If we point postcss directly to the app directory then
    // it updates the files even if there are no changes, which triggers a
    // double rebuild. So we use rsync with --checksum so it only updates the
    // files when their contents have changed.
    {
      name: 'Postcss',
      script:
        'postcss styles/**/*.css --base styles --dir other/postcss.ignored',
      autorestart: false,
      watch: [
        './tailwind.config.js',
        './app/**/*.ts',
        './app/**/*.tsx',
        './styles/**/*.css',
      ],
      env: {
        NODE_ENV: process.env.NODE_ENV ?? 'development',
        FORCE_COLOR: '1',
      },
    },
    {
      name: 'rsync',
      script: 'rsync -v --checksum -r other/postcss.ignored/ app/styles',
      watch: ['other/postcss.ignored'],
      autorestart: false,
      env: {
        FORCE_COLOR: '1',
      },
    },
  ],
}
