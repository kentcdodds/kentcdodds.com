import fs from 'fs'
import path from 'path'
import type {DataFunctionArgs} from '@remix-run/node'
import {Response, redirect} from '@remix-run/node'
import {PassThrough} from 'stream'
import {getRequiredServerEnvVar} from '~/utils/misc'

export async function loader({request}: DataFunctionArgs) {
  const token = getRequiredServerEnvVar('INTERNAL_COMMAND_TOKEN')
  const isAuthorized =
    request.headers.get('Authorization') === `Bearer ${token}`
  if (!isAuthorized) {
    // rick roll them
    return redirect('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  }
  // stream the database file in response
  const dbPath = getRequiredServerEnvVar('CACHE_DATABASE_PATH')

  const body = new PassThrough()
  const stream = fs.createReadStream(dbPath)
  stream.on('open', () => stream.pipe(body))
  stream.on('error', err => body.end(err))
  stream.on('end', () => body.end())

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${path.basename(dbPath)}"`,
      'Content-Length': (await fs.promises.stat(dbPath)).size.toString(),
    },
  })
}
