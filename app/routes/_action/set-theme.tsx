import * as React from 'react'
import {redirect} from 'remix'
import type {ActionFunction} from 'remix'
import {getThemeSession} from '../../utils/theme.server'
import {isTheme} from '../../utils/theme-provider'

export const action: ActionFunction = async ({request}) => {
  const themeSession = await getThemeSession(request)
  const params = await request.json()
  const theme = params.theme
  if (!isTheme(theme)) return redirect(new URL(request.url).pathname)

  themeSession.setTheme(theme)
  return redirect(new URL(request.url).pathname, {
    headers: {'Set-Cookie': await themeSession.commit()},
  })
}

export const loader = () => redirect('/', {status: 404})

export default function MarkRead() {
  return <div>Oops... You should not see this.</div>
}
