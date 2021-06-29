module.exports = {
  apps: [
    {
      name: 'Remix',
      script: [
        'node',
        '--experimental-wasm-threads',
        '--require ./node_modules/dotenv/config',
        '--require ./mocks',
        './node_modules/.bin/remix run',
      ]
        .filter(Boolean)
        .join(' '),
      watch: ['./mocks/**/*.ts'],
      env: {
        NODE_ENV: 'development',
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
