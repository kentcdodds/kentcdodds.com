import {spawn} from 'child_process'
import type {DataFunctionArgs} from '@remix-run/node'
import {requireAdminUser} from '~/utils/session.server'

declare global {
  // avoids issues with the purgeCache
  // eslint-disable-next-line
  var __prismaSubprocess: ReturnType<typeof spawn> | null
}

global.__prismaSubprocess = global.__prismaSubprocess ?? null

async function ensurePrismaStudioIsRunning() {
  if (global.__prismaSubprocess) return
  global.__prismaSubprocess = spawn(
    'npx',
    ['prisma', 'studio', '--browser', 'none', '--port', '5555'],
    {
      stdio: 'inherit',
      shell: true,
      detached: true,
    },
  )
  // give it a second to start up
  await new Promise(resolve => setTimeout(resolve, 1000))
}

export async function loader({request}: DataFunctionArgs) {
  await requireAdminUser(request)
  if (new URL(request.url).searchParams.has('close')) {
    if (global.__prismaSubprocess) {
      global.__prismaSubprocess.kill()
      global.__prismaSubprocess = null
      return new Response('Prisma Studio closed')
    } else {
      return new Response('Prisma Studio was not running')
    }
  }

  await ensurePrismaStudioIsRunning()
  const response = await fetch('http://localhost:5555', request)
  const studioHtml = await response.text()
  const relativeStudioHtml = studioHtml.replace(
    /<head>/,
    '<head><base href="/prisma-studio/" />',
  )
  return new Response(relativeStudioHtml, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Length': String(Buffer.byteLength(relativeStudioHtml)),
    },
  })
}
