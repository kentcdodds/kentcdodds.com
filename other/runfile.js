require('dotenv').config()
require('@remix-run/node/globals').installGlobals()
require('esbuild-register/dist/node').register()
require(require('path').join(process.cwd(), process.argv[2]))
