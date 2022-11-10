require('dotenv').config()
// eslint-disable-next-line import/no-extraneous-dependencies
require('@remix-run/node/dist/globals').installGlobals()
require(require('path').join(process.cwd(), process.argv[2]))
