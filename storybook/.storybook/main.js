const path = require('path')
const webpack = require('webpack')

module.exports = {
  features: {
    // we just reference the built files so we don't have to worry about
    // two different builds.
    postcss: false,
  },
  stories: [
    '../stories/**/*.stories.mdx',
    '../stories/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: ['@storybook/addon-links', '@storybook/addon-essentials'],
  typescript: {
    reactDocgen: 'none',
  },
  webpackFinal: async config => {
    config.resolve.alias['@kcd'] = path.join(__dirname, '../../app')
    return config
  },
}
