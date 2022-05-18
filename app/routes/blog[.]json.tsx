import type {LoaderFunction} from '@remix-run/node'
import {getPostJson} from '~/utils/blog.server'

export const loader: LoaderFunction = async ({request}) => {
  const data = await getPostJson(request)
  const string = JSON.stringify(data)
  return new Response(string, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': String(Buffer.byteLength(string)),
    },
  })
}
