const isProd = process.env.NODE_ENV === 'production'

module.exports = {
  appDirectory: './app',
  dataDirectory: isProd ? './server-build/data' : './server/data',
  serverBuildDirectory: './server-build/remix',
  browserBuildDirectory: './public/build',
  publicPath: '/build/',
  devServerPort: 8002,
}
