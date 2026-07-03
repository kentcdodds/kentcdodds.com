import fs from 'node:fs'
import path from 'node:path'
import { setConfig as setCloudinaryConfig } from 'cloudinary-build-url'
import { config as loadDotenv } from 'dotenv'

setCloudinaryConfig({ cloudName: 'kentcdodds-com' })

const cwd = process.cwd()
const dotenvPath = path.join(cwd, '.env')
if (fs.existsSync(dotenvPath)) {
	loadDotenv({ path: dotenvPath, override: false, quiet: true })
}
loadDotenv({
	path: path.join(cwd, '.env.example'),
	override: false,
	quiet: true,
})

process.env.NODE_ENV ??= 'production'
process.env.MOCKS = 'false'
