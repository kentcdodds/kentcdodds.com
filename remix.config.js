const path = require('path')
const fs = require('fs/promises')
const matter = require('gray-matter')

const isProd = process.env.NODE_ENV === 'production'

module.exports = {
  appDirectory: './app',
  loadersDirectory: isProd ? './server-build/loaders' : './server/loaders',
  serverBuildDirectory: './server-build/remix',
  browserBuildDirectory: './public/build',
  publicPath: '/build/',
  devServerPort: 8002,
  routes: async defineRoute => {
    const posts = await Promise.all(
      (await fs.readdir('app/content/blog'))
        .map(postDir =>
          path.join(__dirname, `app/content/blog/${postDir}/index.mdx`),
        )
        .map(async mdxPath => {
          return {
            mdxPath,
            ...matter(await fs.readFile(mdxPath)),
          }
        }),
    )

    return defineRoute(route => {
      route(
        'blog',
        'post.tsx',
        {loader: isProd ? 'post.js' : 'post.ts'},
        () => {
          for (const post of posts) {
            const postPath = path.relative(
              path.join(__dirname, 'app'),
              post.mdxPath,
            )
            route(post.data.slug, postPath)
          }
        },
      )
    })
  },
}
