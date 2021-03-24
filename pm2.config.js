module.exports = {
  apps: [
    {
      name: 'Express',
      script: 'ts-node-transpile-only -r ./mocks/index.ts start.js',
      // uncomment this if you want to skip the local mocks
      // script: 'node start.js',
      watch: ['build/assets.json', 'mocks'],
      watch_options: {
        followSymlinks: false,
      },
      env: {
        NODE_ENV: 'development',
      },
    },
    {
      name: 'Remix',
      script: 'remix run',
      ignore_watch: ['.'],
      env: {
        NODE_ENV: 'development',
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
