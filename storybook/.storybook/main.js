const webpack = require('webpack')

module.exports = {
  stories: [
    '../stories/**/*.stories.mdx',
    '../stories/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: ['@storybook/addon-links', '@storybook/addon-essentials'],

  webpackFinal: async config => {
    config.plugins.push(
      // swap @remix-run/react for our own mock
      // this way folks don't have to have remix installed to work
      // on components that are built using remix...
      // To handle useRouteData, stories must expose a routeData property
      new webpack.NormalModuleReplacementPlugin(
        /\/@remix-run\/react/,
        require.resolve('./@remix-run/react.mock.js'),
      ),
    )
    return config
  },
}
