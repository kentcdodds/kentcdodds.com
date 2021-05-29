module.exports = {
  apps: [
    {
      name: 'Remix',
      script: [
        'node',
        '--require ./node_modules/dotenv/config',
        '--require ./mocks',
        './node_modules/.bin/remix run',
      ].join(' '),
      watch: ['./mocks/**/*.*'],
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
