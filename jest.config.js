const path = require('path')
const config = require('kcd-scripts/jest')

const fromRoot = d => path.join(__dirname, d)
module.exports = {
  ...config,
  roots: [fromRoot('app')],
  resetMocks: true,
  coveragePathIgnorePatterns: [],
  collectCoverageFrom: ['**/app/**/*.{js,ts,tsx}'],
  coverageThreshold: null,
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleDirectories: ['node_modules', fromRoot('app'), fromRoot('tests')],
}
