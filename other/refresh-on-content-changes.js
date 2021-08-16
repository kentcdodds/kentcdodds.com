// the `entry.server.tsx` file requires app/refresh.ignored.js
// so if we change our content then update app/refresh.ignored.js we'll
// get an auto-refresh even though content isn't directly required in our app.
const fs = require('node:fs')
const path = require('node:path')
// eslint-disable-next-line import/no-extraneous-dependencies
const chokidar = require('chokidar')

const refreshPath = path.join(__dirname, '../app/refresh.ignored.js')

chokidar.watch(path.join(__dirname, '../content')).on('change', updatedFile => {
  console.log('changed', updatedFile)
  fs.writeFileSync(refreshPath, `// ${Date.now()}: ${updatedFile}`)
})
