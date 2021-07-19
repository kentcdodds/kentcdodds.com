module.exports = {
  apps: [
    {
      name: 'Server',
      script: [
        'node',
        '--experimental-wasm-threads',
        '--require ./node_modules/dotenv/config',
        '--require ./mocks',
        './index.js',
      ]
        .filter(Boolean)
        .join(' '),
      watch: ['./mocks/**/*.ts', './index.js', './.env'],
      env: {
        NODE_ENV: 'development',
        ENABLE_TEST_ROUTES: true,
        RUNNING_E2E: process.env.RUNNING_E2E,
      },
    },
    {
      name: 'Remix',
      script: 'remix dev',
      ignore_watch: ['.'],
      env: {
        NODE_ENV: 'development',
        ENABLE_TEST_ROUTES: true,
        RUNNING_E2E: process.env.RUNNING_E2E,
      },
    },
    {
      name: 'Postcss',
      script: 'npm run css:watch',
      ignore_watch: ['.'],
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
}
