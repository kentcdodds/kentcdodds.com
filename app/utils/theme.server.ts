import type {Request, Session} from 'remix'
import {createCookieSessionStorage} from 'remix'
import {Theme, themes} from './theme-provider'

const themeStorage = createCookieSessionStorage({
  cookie: {
    name: 'KCD_theme',
    // FIXME: env variable this
    secrets: ['sorta secret'],
    sameSite: 'lax',
    path: '/',
    // no theme for you on my 100th birthday! 😂
    expires: new Date('2088-10-18'),
  },
})

function getThemeSession(request: Request) {
  return themeStorage.getSession(request.headers.get('Cookie'))
}

function getTheme(session: Session) {
  const themeValue = session.get('theme')
  return isTheme(themeValue) ? themeValue : Theme.DARK
}

function setTheme(session: Session, theme: Theme) {
  session.set('theme', theme)
}

function commitThemeSession(session: Session) {
  return themeStorage.commitSession(session)
}

function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && themes.includes(value as Theme)
}

export {getThemeSession, getTheme, setTheme, commitThemeSession, isTheme}
