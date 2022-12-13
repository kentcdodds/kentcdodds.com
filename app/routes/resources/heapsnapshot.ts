import path from 'path'
import fs from 'fs'
import v8 from 'v8'
import {Response} from '@remix-run/node'
import {PassThrough} from 'stream'
import type {DataFunctionArgs} from '@remix-run/node'
import {requireAdminUser} from '~/utils/session.server'

export async function loader({request}: DataFunctionArgs) {
  await requireAdminUser(request)

  const snapshotPath = v8.writeHeapSnapshot()
  if (!snapshotPath) {
    throw new Response('No snapshot saved', {status: 500})
  }

  const body = new PassThrough()
  const stream = fs.createReadStream(snapshotPath)
  stream.on('open', () => stream.pipe(body))
  stream.on('error', err => body.end(err))
  stream.on('end', () => body.end())

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${path.basename(
        snapshotPath,
      )}"`,
      'Content-Length': (await fs.promises.stat(snapshotPath)).size.toString(),
    },
  })
}
