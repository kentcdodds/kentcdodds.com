module.exports = {
  apps: [
    {
      name: 'Server',
      script: 'tsx --inspect ./index.js',
      watch: ['./mocks/**/*.ts', './index.js', './server/**/*.ts', './.env'],
      env: {
        MOCKS: 'true',
        NODE_ENV: process.env.NODE_ENV ?? 'development',
        FORCE_COLOR: '1',
      },
    },
    {
      name: 'Remix',
      script: 'remix watch',
      ignore_watch: ['.'],
      env: {
        NODE_ENV: process.env.NODE_ENV ?? 'development',
        FORCE_COLOR: '1',
      },
    },
    {
      name: 'Content',
      script: 'node ./other/refresh-on-content-changes.js',
      ignore_watch: ['.'],
    },
    {
      name: 'Postcss',
      script: 'postcss styles/**/*.css --base styles --dir app/styles',
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
  ],
}
