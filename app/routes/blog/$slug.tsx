import React from 'react'
import {useRouteData, json} from 'remix'
import {Link, useParams} from 'react-router-dom'
import type {KCDLoader, MdxPage} from 'types'
import formatDate from 'date-fns/format'
import type {ComponentMap} from 'mdx-bundler/client'
import {
  FourOhFour,
  getMdxPage,
  mdxPageMeta,
  getMdxComponent,
} from '../../utils/mdx'
import {useOptionalUser} from '../../utils/misc'
import {H2, H6, Paragraph} from '../../components/typography'
import {Grid} from '../../components/grid'
import {ArrowIcon} from '../../components/icons/arrow-icon'
import {ArrowLink} from '../../components/arrow-button'
import {BlogSection} from '../../components/sections/blog-section'
import {articles} from '../../../storybook/stories/fixtures'

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

    return json(data)
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

function ArticleFooter() {
  return (
    <Grid>
      <div className="flex flex-col col-span-full justify-between mb-12 pb-12 text-blueGray-500 text-lg font-medium border-b border-gray-600 lg:flex-row lg:col-span-8 lg:col-start-3 lg:pb-6">
        <div className="flex space-x-5">
          <H6>Share article</H6>
          {/* TODO: fix links */}
          <Link
            className="dark:hover:text-white dark:focus:text-white hover:text-black focus:text-black focus:outline-none"
            to="/"
          >
            Facebook
          </Link>
          <Link
            className="dark:hover:text-white dark:focus:text-white hover:text-black focus:text-black focus:outline-none"
            to="/"
          >
            Twitter
          </Link>
        </div>

        <div className="flex items-center">
          <Link
            className="dark:hover:text-white dark:focus:text-white hover:text-black focus:text-black focus:outline-none"
            to="/"
          >
            Discuss on Twitter
          </Link>
          <span className="mx-3 text-xs">•</span>
          <Link
            className="dark:hover:text-white dark:focus:text-white hover:text-black focus:text-black focus:outline-none"
            to="/"
          >
            Edit on GitHub
          </Link>
        </div>
      </div>
      <div className="col-span-full lg:col-span-2 lg:col-start-3">
        {/* TODO: replace with correct profile photo */}
        <img
          src="https://kentcdodds.com/static/kent-985f8a0db8a37e47da2c07080cffa865.png"
          alt="Kent C. Dodds"
          className="mb-8 w-32 rounded-lg"
        />
      </div>
      <div className="lg:col-start:5 col-span-full lg:col-span-6">
        <H6>Written by Kent C. Dodds</H6>
        <Paragraph className="mb-12 mt-3">
          Kent C. Dodds is a JavaScript software engineer and teacher. He's
          taught hundreds of thousands of people how to make the world a better
          place with quality software development tools and practices. He lives
          with his wife and four kids in Utah.
        </Paragraph>
        <ArrowLink to="/about">Learn more about Kent</ArrowLink>
      </div>
    </Grid>
  )
}

const MdxComponentMap: ComponentMap = {
  // remove extra wrapping div from elements like <div> (TheSpectrumOfAbstraction) and <pre> (code blocks)
  // eslint-disable-next-line react/display-name
  div: ({children}) => <>{children}</>,
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

  const readMarker = React.useRef<HTMLDivElement>(null)
  useOnRead({
    parentElRef: readMarker,
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
      <Grid className="mb-24 mt-24">
        <Link
          to="/"
          className="flex col-span-full text-black dark:text-white space-x-4 lg:col-span-8 lg:col-start-3"
        >
          <ArrowIcon direction="left" />
          <H6 as="span">Back to overview</H6>
        </Link>
      </Grid>

      <Grid as="header" className="mb-12">
        <div className="col-span-full lg:col-span-8 lg:col-start-3">
          <H2>{frontmatter.title}</H2>
          {/* TODO: add readTime */}
          <H6 as="p" variant="secondary" className="mt-2 lowercase">
            {frontmatter.date
              ? formatDate(new Date(frontmatter.date), 'PPP')
              : 'some day in the past'}{' '}
            — quick read
          </H6>
        </div>
        <img
          className="col-span-full mt-10 rounded-lg lg:col-span-10 lg:col-start-2"
          src={frontmatter.bannerUrl}
          alt={frontmatter.bannerAlt}
        />
      </Grid>

      <div ref={readMarker} />

      <Grid as="main" className="prose prose-light dark:prose-dark mb-24">
        <Component components={MdxComponentMap} />
      </Grid>

      <div className="mb-64">
        <ArticleFooter />
      </div>

      {/* TODO: replace `articles` with something smart from the backend */}
      <BlogSection
        articles={articles}
        title="If you found this article helpful."
        description="
            You will love these ones as well."
        showArrowButton={false}
      />
    </>
  )
}
