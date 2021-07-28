import * as React from 'react'
import {
  Links,
  Meta,
  Scripts,
  LiveReload,
  usePendingLocation,
  LoaderFunction,
  json,
  useRouteData,
  useMatches,
} from 'remix'
import type {LinksFunction, MetaFunction, Session} from 'remix'
import {Outlet} from 'react-router-dom'
import clsx from 'clsx'
import type {Await, KCDHandle, User} from 'types'
import tailwindStyles from './styles/tailwind.css'
import vendorStyles from './styles/vendors.css'
import appStyles from './styles/app.css'
import proseStyles from './styles/prose.css'
import {
  useTheme,
  ThemeProvider,
  sessionKey,
  NonFlashOfWrongThemeEls,
} from './utils/theme-provider'
import {getUser, rootStorage, sessionKeys} from './utils/session.server'
import {getDomainUrl, typedBoolean} from './utils/misc'
import {
  RequestInfo,
  UserInfoProvider,
  UserProvider,
  RequestInfoProvider,
  TeamProvider,
  useTeam,
} from './utils/providers'
import {getEnv} from './utils/env.server'
import {getUserInfo} from './utils/user-info.server'
import {validateMagicLink} from './utils/prisma.server'
import {Navbar} from './components/navbar'
import {Spacer} from './components/spacer'
import {Footer} from './components/footer'

export const meta: MetaFunction = () => {
  return {
    // TODO: remove this when we're ready to launch
    robots: 'noindex',
    title: 'Kent C. Dodds',
    description:
      'Come check out how Kent C. Dodds can help you level up your career as a software engineer.',
    viewport: 'width=device-width,initial-scale=1,viewport-fit=cover',
    charSet: 'utf-8',
    'theme-color': '#A9ADC1',
    'twitter:widgets:autoload': 'off',
  }
}

export const links: LinksFunction = () => {
  return [
    {rel: 'icon', href: '/favicon.ico'},
    {rel: 'stylesheet', href: vendorStyles},
    {rel: 'stylesheet', href: tailwindStyles},
    {rel: 'stylesheet', href: proseStyles},
    {rel: 'stylesheet', href: appStyles},
  ]
}

type LoaderData = {
  user: User | null
  userInfo: Await<ReturnType<typeof getUserInfo>> | null
  ENV: ReturnType<typeof getEnv>
  requestInfo: RequestInfo
}

async function getSessionInfo(session: Session) {
  const magicLink = session.get(sessionKeys.magicLink)
  let hasActiveMagicLink = false
  if (typeof magicLink === 'string') {
    try {
      await validateMagicLink(magicLink)
      hasActiveMagicLink = true
    } catch {
      // ignore the error
    }
  }
  return {
    email: session.get(sessionKeys.email),
    hasActiveMagicLink,
    theme: session.get(sessionKey),
  }
}

export const loader: LoaderFunction = async ({request}) => {
  const user = await getUser(request)

  const session = await rootStorage.getSession(request.headers.get('Cookie'))

  const data: LoaderData = {
    user,
    userInfo: user ? await getUserInfo(user) : null,
    ENV: getEnv(),
    requestInfo: {
      origin: getDomainUrl(request),
      searchParams: new URL(request.url).searchParams.toString(),
      session: await getSessionInfo(session),
    },
  }

  return json(data)
}

function App() {
  const matches = useMatches()
  const metas = matches
    .flatMap(({handle}) => (handle as KCDHandle | undefined)?.metas)
    .filter(typedBoolean)

  const data = useRouteData<LoaderData>()
  const [team] = useTeam()
  const [theme] = useTheme()
  const pendingLocation = usePendingLocation()
  const showPendingState = pendingLocation

  return (
    <html lang="en" className={theme ?? ''}>
      <head>
        <Meta />
        {metas.map((m, i) => (
          <meta key={i} {...m} />
        ))}
        <Links />
        <style>{`
          :root {
            --color-team-current: var(--color-team-${team.toLowerCase()}); 
          }
        `}</style>
        <NonFlashOfWrongThemeEls
          ssrTheme={Boolean(data.requestInfo.session.theme)}
        />
      </head>
      <body
        className={clsx('dark:bg-gray-900 bg-white transition duration-500', {
          'opacity-50': showPendingState,
        })}
      >
        <Navbar />
        <Outlet />
        <Spacer size="medium" />
        <Footer />
        <Scripts />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(data.ENV)};`,
          }}
        />
        {process.env.NODE_ENV === 'development' && <LiveReload />}
      </body>
    </html>
  )
}

export default function AppWithProviders() {
  const data = useRouteData<LoaderData>()
  return (
    <RequestInfoProvider value={data.requestInfo}>
      <UserProvider value={data.user}>
        <UserInfoProvider value={data.userInfo}>
          <TeamProvider>
            <ThemeProvider specifiedTheme={data.requestInfo.session.theme}>
              <App />
            </ThemeProvider>
          </TeamProvider>
        </UserInfoProvider>
      </UserProvider>
    </RequestInfoProvider>
  )
}
