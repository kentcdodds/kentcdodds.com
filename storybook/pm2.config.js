const path = require('path')

module.exports = {
  apps: [
    {
      name: 'Storybook',
      script:
        'start-storybook -p 6006 --no-version-updates --no-release-notes --quiet -s ../public',
      ignore_watch: ['.'], // watch mode is managed by storybook
      cwd: __dirname,
      env: {
        NODE_ENV: 'development',
      },
    },
    {
      name: 'Postcss',
      script: 'npm run css:watch',
      cwd: path.join(__dirname, '..'),
      ignore_watch: ['.'], // watch mode is managed by postcss
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
}
