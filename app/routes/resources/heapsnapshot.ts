import path from 'path'
import os from 'os'
import fs from 'fs'
import v8 from 'v8'
import {Response} from '@remix-run/node'
import {PassThrough} from 'stream'
import type {DataFunctionArgs} from '@remix-run/node'
import {requireAdminUser} from '~/utils/session.server'
import {formatDate} from '~/utils/misc'

export async function loader({request}: DataFunctionArgs) {
  await requireAdminUser(request)
  const host =
    request.headers.get('X-Forwarded-Host') ?? request.headers.get('host')

  const tempDir = os.tmpdir()
  const filepath = path.join(
    tempDir,
    `${host}-${formatDate(new Date(), 'yyyy-MM-dd HH_mm_ss_SSS')}.heapsnapshot`,
  )

  const snapshotPath = v8.writeHeapSnapshot(filepath)
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
