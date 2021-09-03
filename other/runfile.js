require('dotenv').config()
// eslint-disable-next-line import/no-extraneous-dependencies
require('@remix-run/node/globals').installGlobals()
require('esbuild-register/dist/node').register()
require(require('path').join(process.cwd(), process.argv[2]))
