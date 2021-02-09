module.exports = {
  apps: [
    {
      name: 'Express',
      script: 'start.js',
      watch: ['remix.config.js', 'app'],
      watch_options: {
        followSymlinks: false,
      },
      env: {
        NODE_ENV: 'development',
      },
    },
    {
      name: 'Remix',
      // ignoring the error output because of circular deps with the compile-mdx stuff
      script: 'remix run 2> /dev/null',
      ignore_watch: ['.'],
      env: {
        NODE_ENV: 'development',
      },
    },
    {
      name: 'PostCSS',
      script: 'postcss styles --base styles --dir app/ -w',
      watch: ['styles'],
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
}
