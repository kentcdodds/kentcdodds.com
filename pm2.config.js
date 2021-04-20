module.exports = {
  apps: [
    {
      name: 'Express',
      script:
        'ts-node-transpile-only --ignore "/app|node_modules/" -r ./mocks/index.ts start.js',
      // uncomment this if you want to skip the local mocks
      // script: 'node start.js',
      watch: ['start.js'],
      watch_options: {
        followSymlinks: false,
      },
      env: {
        NODE_ENV: 'development',
      },
    },
    {
      name: 'Remix',
      script: 'remix run2',
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
    {
      name: 'LiveReload',
      script: 'livereload --wait 500 --exclusions css',
      ignore_watch: ['.'],
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
}
