// the `entry.server.tsx` file requires app/refresh.ignored.js
// so if we change our content then update app/refresh.ignored.js we'll
// get an auto-refresh even though content isn't directly required in our app.
const fs = require('fs')
const path = require('path')
require('dotenv').config()
// eslint-disable-next-line import/no-extraneous-dependencies
require('@remix-run/node/globals').installGlobals()
// eslint-disable-next-line import/no-extraneous-dependencies
const chokidar = require('chokidar')
const {postRefreshCache} = require('./utils')

const refreshPath = path.join(__dirname, '../app/refresh.ignored.js')

chokidar
  .watch(path.join(__dirname, '../content'))
  .on('change', async updatedFile => {
    console.log('changed', updatedFile)
    await postRefreshCache({
      http: require('http'),
      options: {
        hostname: 'localhost',
        port: 3000,
      },
      postData: {
        contentPaths: [updatedFile.replace(`${process.cwd()}/content/`, '')],
      },
    }).then(
      response => console.log(`Content change request finished.`, {response}),
      error => console.error(`Content change request errored`, {error}),
    )
    // give the cache a second to update
    setTimeout(() => {
      fs.writeFileSync(refreshPath, `// ${Date.now()}: ${updatedFile}`)
    }, 250)
  })
