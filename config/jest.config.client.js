const path = require('path')
const config = require('./jest.config.common')

const fromRoot = d => path.join(__dirname, '..', d)

module.exports = {
  ...config,
  displayName: 'client',
  roots: [fromRoot('app')],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleDirectories: ['node_modules', fromRoot('app'), fromRoot('tests')],
}
