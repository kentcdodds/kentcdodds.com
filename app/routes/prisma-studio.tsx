import {spawn} from 'child_process'
import type {DataFunctionArgs} from '@remix-run/node'
import {requireAdminUser} from '~/utils/session.server'

async function ensurePrismaStudioIsRunning() {
  try {
    await fetch('http://localhost:5555', {method: 'HEAD'})
    // eslint-disable-next-line @typescript-eslint/no-implicit-any-catch, @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if ('code' in error) {
      if (error.code !== 'ECONNREFUSED') throw error
    }

    spawn('npx', ['prisma', 'studio'], {
      stdio: 'inherit',
      shell: true,
      detached: true,
    })
    // give it a second to start up
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}

export async function loader({request}: DataFunctionArgs) {
  await requireAdminUser(request)
  await ensurePrismaStudioIsRunning()
  const response = await fetch('http://localhost:5555', request)
  const studioHtml = await response.text()
  const relativeStudioHtml = studioHtml.replace(
    /"\.\/(.*)"/g,
    '"/prisma-studio/$1"',
  )
  return new Response(relativeStudioHtml, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Length': String(Buffer.byteLength(relativeStudioHtml)),
    },
  })
}
