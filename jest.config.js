const config = require('./config/jest.config.common')

module.exports = {
  ...config,
  roots: null,
  projects: [
    './config/jest.config.client.js',
    './config/jest.config.server.js',
  ],
}
