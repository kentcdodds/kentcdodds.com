import * as React from 'react'
import type {
  HeadersFunction,
  LinksFunction,
  MetaFunction,
  DataFunctionArgs,
  SerializeFrom,
} from '@remix-run/node'
import {json} from '@remix-run/node'
import {
  Link,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useCatch,
  useLoaderData,
  useLocation,
  useTransition,
} from '@remix-run/react'

import {MetronomeLinks} from '@metronome-sh/react'
import {AnimatePresence, motion} from 'framer-motion'
import {useSpinDelay} from 'spin-delay'
import clsx from 'clsx'
import {getInstanceInfo} from 'litefs-js'
import type {KCDHandle} from '~/types'
import tailwindStyles from './styles/tailwind.css'
import vendorStyles from './styles/vendors.css'
import appStyles from './styles/app.css'
import proseStyles from './styles/prose.css'
import noScriptStyles from './styles/no-script.css'
import {
  useTheme,
  ThemeProvider,
  NonFlashOfWrongThemeEls,
} from './utils/theme-provider'
import {getThemeSession} from './utils/theme.server'
import {getSession} from './utils/session.server'
import {getLoginInfoSession} from './utils/login.server'
import {
  getDisplayUrl,
  getDomainUrl,
  getUrl,
  parseDate,
  removeTrailingSlash,
  typedBoolean,
} from './utils/misc'
import {getEnv} from './utils/env.server'
import {getUserInfo} from './utils/user-info.server'
import {getClientSession} from './utils/client.server'
import {Navbar} from './components/navbar'
import {Spacer} from './components/spacer'
import {Footer} from './components/footer'
import {TeamCircle} from './components/team-circle'
import {NotificationMessage} from './components/notification-message'
import {pathedRoutes} from './other-routes.server'
import {ErrorPage} from './components/errors'
import {TeamProvider, useTeam} from './utils/team-provider'
import {getSocialMetas} from './utils/seo'
import {getGenericSocialImage, illustrationImages, images} from './images'
import {Grimmacing, MissingSomething} from './components/kifs'
import {ArrowLink} from './components/arrow-button'
import {getServerTimeHeader} from './utils/timing.server'
import {useNonce} from './utils/nonce-provider'
import {
  Promotification,
  getPromoCookieValue,
} from './routes/resources/promotification'
import {getWorkshops} from './utils/workshops.server'
import {getScheduledEvents} from './utils/workshop-tickets.server'
import {isFuture} from 'date-fns'
import {ArrowIcon, LaptopIcon} from './components/icons'

export const handle: KCDHandle & {id: string} = {
  id: 'root',
}

export const meta: MetaFunction = ({data}) => {
  const requestInfo = data?.requestInfo
  const title = 'Kent C. Dodds'
  const description =
    'Come check out how Kent C. Dodds can help you level up your career as a software engineer.'
  return {
    viewport: 'width=device-width,initial-scale=1,viewport-fit=cover',
    'theme-color': requestInfo?.session.theme === 'dark' ? '#1F2028' : '#FFF',
    ...getSocialMetas({
      keywords:
        'Learn React, React Workshops, Testing JavaScript Training, React Training, Learn JavaScript, Learn TypeScript',
      url: getUrl(requestInfo),
      image: getGenericSocialImage({
        url: getDisplayUrl(requestInfo),
        words:
          'Helping people make the world a better place through quality software.',
        featuredImage: 'kentcdodds.com/illustrations/kody-flying_blue',
      }),
      title,
      description,
    }),
  }
}

export const links: LinksFunction = () => {
  return [
    {
      rel: 'preload',
      as: 'font',
      href: '/fonts/Matter-Medium.woff2',
      type: 'font/woff2',
      crossOrigin: 'anonymous',
    },
    {
      rel: 'preload',
      as: 'font',
      href: '/fonts/Matter-Regular.woff2',
      type: 'font/woff2',
      crossOrigin: 'anonymous',
    },
    {
      rel: 'apple-touch-icon',
      sizes: '180x180',
      href: '/favicons/apple-touch-icon.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '32x32',
      href: '/favicons/favicon-32x32.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '16x16',
      href: '/favicons/favicon-16x16.png',
    },
    {rel: 'manifest', href: '/site.webmanifest'},
    {rel: 'icon', href: '/favicon.ico'},
    {rel: 'stylesheet', href: vendorStyles},
    {rel: 'stylesheet', href: tailwindStyles},
    {rel: 'stylesheet', href: proseStyles},
    {rel: 'stylesheet', href: appStyles},
  ]
}

export type LoaderData = SerializeFrom<typeof loader>

const WORKSHOP_PROMO_NAME = 'workshop-promo'

async function loader({request}: DataFunctionArgs) {
  const timings = {}
  const session = await getSession(request)
  const [
    user,
    themeSession,
    clientSession,
    loginInfoSession,
    primaryInstance,
    workshops,
    workshopEvents,
  ] = await Promise.all([
    session.getUser({timings}),
    getThemeSession(request),
    getClientSession(request, session.getUser({timings})),
    getLoginInfoSession(request),
    getInstanceInfo().then(i => i.primaryInstance),
    getWorkshops({request, timings}),
    getScheduledEvents({request, timings}),
  ])

  const randomFooterImageKeys = Object.keys(illustrationImages)
  const randomFooterImageKey = randomFooterImageKeys[
    Math.floor(Math.random() * randomFooterImageKeys.length)
  ] as keyof typeof illustrationImages

  const data = {
    user,
    userInfo: user ? await getUserInfo(user, {request, timings}) : null,
    ENV: getEnv(),
    randomFooterImageKey,
    workshopPromotifications: workshopEvents
      .map(e => {
        const workshop = workshops.find(w => w.slug === e.metadata.workshopSlug)
        if (!workshop) return null

        const discounts = Object.entries(e.discounts)
          .filter(([, discount]) => isFuture(parseDate(discount.ends)))
          .sort(([, a], [, b]) => {
            return parseDate(a.ends).getTime() - parseDate(b.ends).getTime()
          })

        // the promoEndTime should be the earliest of:
        // 1. earliest discount end
        // 2. the end of ticket sales
        // 3. the start of the event
        const promoEndTime = [
          discounts[0]
            ? {
                type: 'discount' as const,
                time: parseDate(discounts[0][1].ends).getTime(),
                url: discounts[0][1].url,
              }
            : null,
          e.salesEndTime
            ? {
                type: 'sales' as const,
                time: parseDate(e.salesEndTime).getTime(),
                url: e.url,
              }
            : null,
          e.startTime
            ? {
                type: 'start' as const,
                time: parseDate(e.startTime).getTime(),
                url: e.url,
              }
            : null,
        ]
          .filter(typedBoolean)
          .sort((a, b) => a.time - b.time)[0]

        if (!promoEndTime) return null

        const promoName = `${WORKSHOP_PROMO_NAME}-${workshop.slug}`

        return {
          title: e.title,
          slug: workshop.slug,
          promoName,
          dismissTimeSeconds: Math.min(
            Math.max(
              // one quarter of the time until the salesEndTime (in seconds)
              (promoEndTime.time - Date.now()) / 4 / 1000,
              // Minimum of 3 hours (in seconds)
              60 * 60 * 3,
            ),
            // Maximum of 1 week (in seconds)
            60 * 60 * 24 * 7,
          ),
          cookieValue: getPromoCookieValue({
            promoName,
            request,
          }),
          promoEndTime,
        }
      })
      .filter(typedBoolean),
    requestInfo: {
      origin: getDomainUrl(request),
      path: new URL(request.url).pathname,
      flyPrimaryInstance: primaryInstance,
      session: {
        email: loginInfoSession.getEmail(),
        magicLinkVerified: loginInfoSession.getMagicLinkVerified(),
        theme: themeSession.getTheme(),
      },
    },
  }

  const headers: HeadersInit = new Headers()
  // this can lead to race conditions if a child route is also trying to commit
  // the cookie as well. This is a bug in remix that will hopefully be fixed.
  // we reduce the likelihood of a problem by only committing if the value is
  // different.
  await session.getHeaders(headers)
  await clientSession.getHeaders(headers)
  await loginInfoSession.getHeaders(headers)
  headers.append('Server-Timing', getServerTimeHeader(timings))

  return json(data, {headers})
}

export {loaderImpl as loader}

async function loaderImpl({request, ...rest}: DataFunctionArgs) {
  // because this is called for every route, we'll do an early return for anything
  // that has a other route setup. The response will be handled there.
  if (pathedRoutes[new URL(request.url).pathname]) {
    return new Response()
  }
  const result = await loader({request, ...rest})
  return result
}

export const headers: HeadersFunction = ({loaderHeaders}) => {
  return {
    'Server-Timing': loaderHeaders.get('Server-Timing') ?? '',
  }
}

const LOADER_WORDS = [
  'loading',
  'checking cdn',
  'checking cache',
  'fetching from db',
  'compiling mdx',
  'updating cache',
  'transfer',
]

const ACTION_WORDS = [
  'packaging',
  'zapping',
  'validating',
  'processing',
  'calculating',
  'computing',
  'computering',
]

// we don't want to show the loading indicator on page load
let firstRender = true

function PageLoadingMessage() {
  const transition = useTransition()
  const [words, setWords] = React.useState<Array<string>>([])
  const [pendingPath, setPendingPath] = React.useState('')
  const showLoader = useSpinDelay(Boolean(transition.state !== 'idle'), {
    delay: 400,
    minDuration: 1000,
  })

  React.useEffect(() => {
    if (firstRender) return
    if (transition.state === 'idle') return
    if (transition.state === 'loading') setWords(LOADER_WORDS)
    if (transition.state === 'submitting') setWords(ACTION_WORDS)

    const interval = setInterval(() => {
      setWords(([first, ...rest]) => [...rest, first] as Array<string>)
    }, 2000)

    return () => clearInterval(interval)
  }, [pendingPath, transition.state])

  React.useEffect(() => {
    if (firstRender) return
    if (transition.state === 'idle') return
    setPendingPath(transition.location.pathname)
  }, [transition])

  React.useEffect(() => {
    firstRender = false
  }, [])

  const action = words[0]

  return (
    <NotificationMessage position="bottom-right" visible={showLoader}>
      <div className="flex w-64 items-center">
        <motion.div
          transition={{repeat: Infinity, duration: 2, ease: 'linear'}}
          animate={{rotate: 360}}
        >
          <TeamCircle size={48} team="UNKNOWN" />
        </motion.div>
        <div className="ml-4 inline-grid">
          <AnimatePresence>
            <div className="col-start-1 row-start-1 flex overflow-hidden">
              <motion.span
                key={action}
                initial={{y: 15, opacity: 0}}
                animate={{y: 0, opacity: 1}}
                exit={{y: -15, opacity: 0}}
                transition={{duration: 0.25}}
                className="flex-none"
              >
                {action}
              </motion.span>
            </div>
          </AnimatePresence>
          <span className="text-secondary truncate">path: {pendingPath}</span>
        </div>
      </div>
    </NotificationMessage>
  )
}

declare global {
  interface Window {
    fathom:
      | {
          trackPageview(): void
        }
      | undefined
  }
}

type FathomQueue = Array<{command: 'trackPageview'}>

function CanonicalLink({
  origin,
  fathomQueue,
}: {
  origin: string
  fathomQueue: React.MutableRefObject<FathomQueue>
}) {
  const {pathname} = useLocation()
  const canonicalUrl = removeTrailingSlash(`${origin}${pathname}`)

  React.useEffect(() => {
    if (window.fathom) {
      window.fathom.trackPageview()
    } else {
      // Fathom hasn't finished loading yet! queue the command
      fathomQueue.current.push({command: 'trackPageview'})
    }
    // Fathom looks uses the canonical URL to track visits, so we're using it
    // as a dependency even though we're not using it explicitly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canonicalUrl])

  return <link rel="canonical" href={canonicalUrl} />
}

function App() {
  const data = useLoaderData<typeof loader>()
  const nonce = useNonce()
  const [team] = useTeam()
  const [theme] = useTheme()
  const fathomQueue = React.useRef<FathomQueue>([])

  return (
    <html
      lang="en"
      className={clsx(theme, `set-color-team-current-${team.toLowerCase()}`)}
    >
      <head>
        <meta charSet="utf-8" />
        <Meta />

        <CanonicalLink
          origin={data.requestInfo.origin}
          fathomQueue={fathomQueue}
        />

        <Links />
        {ENV.NODE_ENV === 'production' && !ENV.DISABLE_METRONOME ? (
          <MetronomeLinks nonce={nonce} />
        ) : null}
        <noscript>
          <link rel="stylesheet" href={noScriptStyles} />
        </noscript>
        <NonFlashOfWrongThemeEls
          nonce={nonce}
          ssrTheme={Boolean(data.requestInfo.session.theme)}
        />
      </head>
      <body className="bg-white transition duration-500 dark:bg-gray-900">
        <PageLoadingMessage />
        {data.workshopPromotifications.map(e => (
          <Promotification
            key={e.slug}
            cookieValue={e.cookieValue}
            promoName={e.promoName}
            promoEndTime={new Date(e.promoEndTime.time)}
            dismissTimeSeconds={e.dismissTimeSeconds}
          >
            <div className="flex flex-col">
              <p className="flex items-center gap-1">
                <LaptopIcon />
                <span>
                  Join Kent for an interactive{' '}
                  <Link to="/workshops" className="underline">
                    live workshop
                  </Link>
                </span>
              </p>
              <Link
                className="mt-3 text-lg underline"
                to={`/workshops/${e.slug}`}
              >
                {e.title}
              </Link>
              {e.promoEndTime.type === 'discount' ? (
                <p className="mt-1 text-sm text-gray-500">
                  Limited time{' '}
                  <a
                    href={e.promoEndTime.url}
                    className="inline-flex items-center gap-1 underline"
                  >
                    <span>discount available</span>
                    <ArrowIcon direction="top-right" size={16} />
                  </a>
                </p>
              ) : e.promoEndTime.type === 'sales' ? (
                <p className="mt-1 text-sm text-gray-500">
                  Limited time{' '}
                  <a
                    href={e.promoEndTime.url}
                    className="inline-flex items-center gap-1 underline"
                  >
                    <span>tickets available</span>
                    <ArrowIcon direction="top-right" size={16} />
                  </a>
                </p>
              ) : null}
            </div>
          </Promotification>
        ))}
        <NotificationMessage queryStringKey="message" delay={0.3} />
        <Navbar />
        <Outlet />
        <Spacer size="base" />
        <Footer image={images[data.randomFooterImageKey]} />
        <ScrollRestoration nonce={nonce} />
        {ENV.NODE_ENV === 'development' ? null : (
          <script
            nonce={nonce}
            src="https://sailfish.kentcdodds.com/script.js"
            data-site="HJUUDKMT"
            data-spa="history"
            data-auto="false" // prevent tracking visit twice on initial page load
            data-excluded-domains="localhost"
            defer
            onLoad={() => {
              fathomQueue.current.forEach(({command}) => {
                if (window.fathom) {
                  window.fathom[command]()
                } else {
                  // Fathom isn't available even though the script has loaded
                  // this should never happen!
                }
              })
              fathomQueue.current = []
            }}
          />
        )}
        <Scripts nonce={nonce} />
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(data.ENV)};`,
          }}
        />
        {ENV.NODE_ENV === 'development' ? <LiveReload nonce={nonce} /> : null}
      </body>
    </html>
  )
}

export default function AppWithProviders() {
  const data = useLoaderData<LoaderData>()
  return (
    <TeamProvider>
      <ThemeProvider specifiedTheme={data.requestInfo.session.theme}>
        <App />
      </ThemeProvider>
    </TeamProvider>
  )
}

function ErrorDoc({children}: {children: React.ReactNode}) {
  const nonce = useNonce()
  return (
    <html lang="en" className="dark">
      <head>
        <title>Oh no...</title>
        <Links />
      </head>
      <body className="bg-white transition duration-500 dark:bg-gray-900">
        {children}
        <Scripts nonce={nonce} />
      </body>
    </html>
  )
}

// best effort, last ditch error boundary. This should only catch root errors
// all other errors should be caught by the index route which will include
// the footer and stuff, which is much better.
export function ErrorBoundary({error}: {error: Error}) {
  console.error(error)
  const location = useLocation()
  return (
    <ErrorDoc>
      <ErrorPage
        heroProps={{
          title: '500 - Oh no, something did not go well.',
          subtitle: `"${location.pathname}" is currently not working. So sorry.`,
          image: <Grimmacing className="rounded-lg" aspectRatio="3:4" />,
          action: <ArrowLink href="/">Go home</ArrowLink>,
        }}
      />
    </ErrorDoc>
  )
}

export function CatchBoundary() {
  const caught = useCatch()
  const location = useLocation()
  console.error('CatchBoundary', caught)
  if (caught.status === 404) {
    return (
      <ErrorDoc>
        <ErrorPage
          heroProps={{
            title: "404 - Oh no, you found a page that's missing stuff.",
            subtitle: `"${location.pathname}" is not a page on kentcdodds.com. So sorry.`,
            image: (
              <MissingSomething className="rounded-lg" aspectRatio="3:4" />
            ),
            action: <ArrowLink href="/">Go home</ArrowLink>,
          }}
        />
      </ErrorDoc>
    )
  }
  if (caught.status === 409) {
    return (
      <ErrorDoc>
        <ErrorPage
          heroProps={{
            title: '409 - Oh no, you should never see this.',
            subtitle: `"${location.pathname}" tried telling fly to replay your request and missed this one.`,
            image: <Grimmacing className="rounded-lg" aspectRatio="3:4" />,
            action: <ArrowLink href="/">Go home</ArrowLink>,
          }}
        />
      </ErrorDoc>
    )
  }
  if (caught.status !== 500) {
    return (
      <ErrorDoc>
        <ErrorPage
          heroProps={{
            title: `${caught.status} - Oh no, something did not go well.`,
            subtitle: `"${location.pathname}" is currently not working. So sorry.`,
            image: <Grimmacing className="rounded-lg" aspectRatio="3:4" />,
            action: <ArrowLink href="/">Go home</ArrowLink>,
          }}
        />
      </ErrorDoc>
    )
  }
  throw new Error(`Unhandled error: ${caught.status}`)
}

/*
eslint
  @typescript-eslint/no-use-before-define: "off",
*/
