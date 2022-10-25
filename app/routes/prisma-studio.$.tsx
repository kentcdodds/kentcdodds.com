import type {ActionArgs, LoaderArgs} from '@remix-run/node'
import {requireAdminUser} from '~/utils/session.server'

export async function loader({request}: LoaderArgs) {
  await requireAdminUser(request)
  const {pathname} = new URL(request.url)
  const url = `http://localhost:5555${pathname.replace('/prisma-studio', '')}`
  return fetch(url, {
    headers: request.headers,
  })
}

export async function action({request}: ActionArgs) {
  await requireAdminUser(request)
  const {pathname} = new URL(request.url)
  const url = `http://localhost:5555${pathname.replace('/prisma-studio', '')}`
  return fetch(url, {
    method: request.method,
    body: request.body,
    headers: request.headers,
  })
}
