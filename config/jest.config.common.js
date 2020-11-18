const path = require('path')
const config = require('kcd-scripts/jest')

module.exports = {
  ...config,
  rootDir: path.join(__dirname, '..'),
  resetMocks: true,
  coveragePathIgnorePatterns: [],
  collectCoverageFrom: [
    '**/app/**/*.{js,ts,tsx}',
    '**/loaders/**/*.{js,ts,tsx}',
  ],
  coverageThreshold: null,
}
