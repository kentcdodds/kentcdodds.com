import React from 'react'
import {useRouteData, json} from 'remix'
import type {HeadersFunction} from 'remix'
import {useParams} from 'react-router-dom'
import type {KCDLoader, MdxPage} from 'types'
import {
  FourOhFour,
  getMdxPage,
  mdxPageMeta,
  getMdxComponent,
} from '../../utils/mdx'
import {useOptionalUser} from '../../utils/misc'

export const headers: HeadersFunction = ({loaderHeaders}) => {
  return {
    'Cache-Control': loaderHeaders.get('Cache-Control') ?? 'no-cache',
  }
}

type LoaderData = {
  page: MdxPage | null
}

export const loader: KCDLoader<{slug: string}> = async ({request, params}) => {
  const page = await getMdxPage({
    contentDir: 'blog',
    slug: params.slug,
    bustCache: new URL(request.url).searchParams.get('bust-cache') === 'true',
  })

  let data: LoaderData

  if (page) {
    data = {page}

    return json(data, {
      headers: {
        'Cache-Control': 'public, max-age=60 s-maxage=3600',
      },
    })
  } else {
    data = {page: null}
    return json(data, {status: 404})
  }
}

export const meta = mdxPageMeta

export default function MdxScreenBase() {
  const data = useRouteData<LoaderData>()

  if (data.page) return <MdxScreen />
  else return <FourOhFour />
}

function useOnRead({
  parentElRef,
  readTime,
  onRead,
  enabled = true,
}: {
  parentElRef: React.RefObject<HTMLElement>
  readTime: MdxPage['readTime']
  onRead: () => void
  enabled: boolean
}) {
  React.useEffect(() => {
    const parentEl = parentElRef.current
    if (!enabled || !parentEl || !parentEl.textContent) return

    const visibilityEl = document.createElement('div')

    let scrolledTheMain = false
    const observer = new IntersectionObserver(entries => {
      const isVisible = entries.some(entry => {
        return entry.target === visibilityEl && entry.isIntersecting
      })
      if (isVisible) {
        scrolledTheMain = true
        maybeMarkAsRead()
        observer.disconnect()
        visibilityEl.remove()
      }
    })

    let startTime = new Date().getTime()
    let timeoutTime = (readTime?.time ?? Infinity) * 0.6
    let timerId: ReturnType<typeof setTimeout>
    let timerFinished = false
    function startTimer() {
      timerId = setTimeout(() => {
        timerFinished = true
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        maybeMarkAsRead()
      }, timeoutTime)
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        clearTimeout(timerId)
        const timeElapsedSoFar = new Date().getTime() - startTime
        timeoutTime = timeoutTime - timeElapsedSoFar
      } else {
        startTime = new Date().getTime()
        startTimer()
      }
    }

    function maybeMarkAsRead() {
      if (timerFinished && scrolledTheMain) {
        cleanup()
        onRead()
      }
    }

    // dirty-up
    parentEl.append(visibilityEl)
    observer.observe(visibilityEl)
    startTimer()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    function cleanup() {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearTimeout(timerId)
      observer.disconnect()
      visibilityEl.remove()
    }
    return cleanup
  }, [enabled, readTime, onRead, parentElRef])
}

function MdxScreen() {
  const data = useRouteData<LoaderData>()
  if (!data.page) {
    throw new Error(
      'This should be impossible because we only render the MdxScreen if there is a data.page object.',
    )
  }
  const user = useOptionalUser()
  const {code, frontmatter} = data.page
  const params = useParams()
  const {slug} = params
  const Component = React.useMemo(() => getMdxComponent(code), [code])

  const mainRef = React.useRef<HTMLDivElement>(null)
  useOnRead({
    parentElRef: mainRef,
    readTime: data.page.readTime,
    onRead: React.useCallback(() => {
      const searchParams = new URLSearchParams([
        ['_data', 'routes/_action/mark-read'],
      ])
      void fetch(`/_action/mark-read?${searchParams}`, {
        method: 'POST',
        body: JSON.stringify({articleSlug: slug}),
      })
    }, [slug]),
    enabled: Boolean(user),
  })

  return (
    <>
      <header>
        <h2>{frontmatter.title}</h2>
        <p>{frontmatter.description}</p>
      </header>
      <main ref={mainRef}>
        <Component />
      </main>
    </>
  )
}
