import * as React from 'react'
import {redirect} from 'remix'
import type {ActionFunction} from 'remix'
import {
  getThemeSession,
  setTheme,
  isTheme,
  commitThemeSession,
} from '../../utils/theme.server'

export const action: ActionFunction = async ({request}) => {
  const session = await getThemeSession(request)
  const params = await request.json()
  const theme = params.theme
  if (!isTheme(theme)) return redirect(new URL(request.url).pathname)

  setTheme(session, theme)
  return redirect(new URL(request.url).pathname, {
    headers: {'Set-Cookie': await commitThemeSession(session)},
  })
}

export const loader = () => redirect('/', {status: 404})

export default function MarkRead() {
  return <div>Oops... You should not see this.</div>
}
