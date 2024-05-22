import 'dotenv/config'
import path from 'path'
import { pathToFileURL } from 'url'
import { installGlobals } from '@remix-run/node'

installGlobals()

const { href: scriptPath } = pathToFileURL(
	path.join(process.cwd(), process.argv[2]),
)

await import(scriptPath)
