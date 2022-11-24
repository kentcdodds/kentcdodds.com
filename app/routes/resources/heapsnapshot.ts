import path from 'path'
import os from 'os'
import fs from 'fs'
import heapdump from 'heapdump'
import {Response} from '@remix-run/node'
import {PassThrough} from 'stream'
import type {DataFunctionArgs} from '@remix-run/node'
import {requireAdminUser} from '~/utils/session.server'

export async function loader({request}: DataFunctionArgs) {
  await requireAdminUser(request)
  const host =
    request.headers.get('X-Forwarded-Host') ?? request.headers.get('host')

  const snapshotPath = await new Promise<string | undefined>(
    (resolve, reject) => {
      const tempDir = os.tmpdir()
      const filepath = path.join(
        tempDir,
        `${host}-heapdump-${Date.now()}.heapsnapshot`,
      )
      console.log(`Writing heapdump to ${filepath}`)
      heapdump.writeSnapshot(filepath, (err, filename) => {
        if (err) reject(err)
        resolve(filename)
      })
    },
  )
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
