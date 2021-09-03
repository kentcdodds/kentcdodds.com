import {createCookieSessionStorage} from 'remix'
import {getRequiredServerEnvVar} from './misc'
import {Theme, isTheme} from './theme-provider'

const themeStorage = createCookieSessionStorage({
  cookie: {
    name: 'KCD_theme',
    secrets: [getRequiredServerEnvVar('SESSION_SECRET')],
    sameSite: 'lax',
    path: '/',
    // no theme for you on my 100th birthday! 😂
    expires: new Date('2088-10-18'),
  },
})

async function getThemeSession(request: Request) {
  const session = await themeStorage.getSession(request.headers.get('Cookie'))
  return {
    getTheme: () => {
      const themeValue = session.get('theme')
      return isTheme(themeValue) ? themeValue : Theme.DARK
    },
    setTheme: (theme: Theme) => session.set('theme', theme),
    commit: () => themeStorage.commitSession(session),
  }
}

export {getThemeSession}
