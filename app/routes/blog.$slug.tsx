import * as React from 'react'
import type {HeadersFunction, DataFunctionArgs} from '@remix-run/node'
import {json} from '@remix-run/node'
import {useCatch, useFetcher, useLoaderData, useParams} from '@remix-run/react'
import type {KCDHandle, MdxListItem, Team} from '~/types'
import {useRootData} from '~/utils/use-root-data'
import {getImageBuilder, getImgProps, images} from '~/images'
import {
  getBlogMdxListItems,
  getMdxPage,
  mdxPageMeta,
  useMdxComponent,
  getBannerTitleProp,
  getBannerAltProp,
} from '~/utils/mdx'
import {H2, H6, Paragraph} from '~/components/typography'
import {Grid} from '~/components/grid'
import {ArrowLink, BackLink} from '~/components/arrow-button'
import {BlogSection} from '~/components/sections/blog-section'
import type {ReadRankings} from '~/utils/blog.server'
import {
  getBlogReadRankings,
  getTotalPostReads,
  getBlogRecommendations,
  notifyOfOverallTeamLeaderChange,
  notifyOfTeamLeaderChangeOnPost,
} from '~/utils/blog.server'
import {FourOhFour, ServerError} from '~/components/errors'
import {TeamStats} from '~/components/team-stats'
import {formatNumber, reuseUsefulLoaderHeaders} from '~/utils/misc'
import {BlurrableImage} from '~/components/blurrable-image'
import {getSession} from '~/utils/session.server'
import {addPostRead} from '~/utils/prisma.server'
import {getClientSession} from '~/utils/client.server'
import {getRankingLeader} from '~/utils/blog'
import {externalLinks} from '../external-links'
import {teamEmoji, useTeam} from '~/utils/team-provider'
import {getWorkshops} from '~/utils/workshops.server'
import {getScheduledEvents} from '~/utils/workshop-tickets.server'
import {WorkshopCard} from '~/components/workshop-card'
import {Spacer} from '~/components/spacer'
import clsx from 'clsx'
import {HeaderSection} from '~/components/sections/header-section'
import {CourseCard} from '~/components/course-card'
import {getServerTimeHeader} from '~/utils/timing.server'

const handleId = 'blog-post'
export const handle: KCDHandle = {
  id: handleId,
  getSitemapEntries: async request => {
    const pages = await getBlogMdxListItems({request})
    return pages
      .filter(page => !page.frontmatter.draft)
      .map(page => {
        return {route: `/blog/${page.slug}`, priority: 0.7}
      })
  },
}

export async function action({params, request}: DataFunctionArgs) {
  if (!params.slug) {
    throw new Error('params.slug is not defined')
  }
  const formData = await request.formData()
  const intent = formData.get('intent')
  switch (intent) {
    case 'mark-as-read': {
      const {slug} = params
      const session = await getSession(request)
      const user = await session.getUser()

      const [beforePostLeader, beforeOverallLeader] = await Promise.all([
        getBlogReadRankings({request, slug}).then(getRankingLeader),
        getBlogReadRankings({request}).then(getRankingLeader),
      ])
      if (user) {
        await addPostRead({
          slug,
          userId: user.id,
        })
      } else {
        const client = await getClientSession(request, user)
        const clientId = client.getClientId()
        if (clientId) {
          await addPostRead({slug, clientId})
        }
      }

      // trigger an update to the ranking cache and notify when the leader changed
      const [afterPostLeader, afterOverallLeader] = await Promise.all([
        getBlogReadRankings({
          request,
          slug,
          forceFresh: true,
        }).then(getRankingLeader),
        getBlogReadRankings({request, forceFresh: true}).then(getRankingLeader),
      ])

      if (
        afterPostLeader?.team &&
        afterPostLeader.team !== beforePostLeader?.team
      ) {
        // fire and forget notification because the user doesn't care whether this finishes
        void notifyOfTeamLeaderChangeOnPost({
          request,
          postSlug: slug,
          reader: user,
          newLeader: afterPostLeader.team,
          prevLeader: beforePostLeader?.team,
        })
      }
      if (
        afterOverallLeader?.team &&
        afterOverallLeader.team !== beforeOverallLeader?.team
      ) {
        // fire and forget notification because the user doesn't care whether this finishes
        void notifyOfOverallTeamLeaderChange({
          request,
          postSlug: slug,
          reader: user,
          newLeader: afterOverallLeader.team,
          prevLeader: beforeOverallLeader?.team,
        })
      }

      return json({success: true})
    }
    default: {
      throw new Error(`Unknown intent: ${intent}`)
    }
  }
}

type CatchData = {
  recommendations: Array<MdxListItem>
  readRankings: ReadRankings
  totalReads: string
  leadingTeam: Team | null
}

export async function loader({request, params}: DataFunctionArgs) {
  if (!params.slug) {
    throw new Error('params.slug is not defined')
  }
  const timings = {}

  const page = await getMdxPage(
    {contentDir: 'blog', slug: params.slug},
    {request, timings},
  )

  const [recommendations, readRankings, totalReads, workshops, workshopEvents] =
    await Promise.all([
      getBlogRecommendations({
        request,
        timings,
        limit: 3,
        keywords: [
          ...(page?.frontmatter.categories ?? []),
          ...(page?.frontmatter.meta?.keywords ?? []),
        ],
        exclude: [params.slug],
      }),
      getBlogReadRankings({request, slug: params.slug, timings}),
      getTotalPostReads({request, slug: params.slug, timings}),
      getWorkshops({request, timings}),
      getScheduledEvents({request, timings}),
    ])

  const catchData: CatchData = {
    recommendations,
    readRankings,
    totalReads: formatNumber(totalReads),
    leadingTeam: getRankingLeader(readRankings)?.team ?? null,
  }
  const headers = {
    'Cache-Control': 'private, max-age=3600',
    Vary: 'Cookie',
    'Server-Timing': getServerTimeHeader(timings),
  }
  if (!page) {
    throw json(catchData, {status: 404, headers})
  }

  const topics = [
    ...(page.frontmatter.categories ?? []),
    ...(page.frontmatter.meta?.keywords ?? []),
  ]
  const relevantWorkshops = workshops.filter(workshop => {
    const workshopTopics = [
      ...workshop.categories,
      ...(workshop.meta.keywords ?? []),
    ]
    return (
      workshopTopics.some(t => topics.includes(t)) &&
      (workshop.events.length ||
        workshopEvents.some(
          event => event.metadata.workshopSlug === workshop.slug,
        ))
    )
  })

  const data = {
    page,
    workshops: relevantWorkshops,
    workshopEvents,
    ...catchData,
  }
  return json(data, {status: 200, headers})
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export const meta = mdxPageMeta

function useOnRead({
  parentElRef,
  time,
  onRead,
}: {
  parentElRef: React.RefObject<HTMLElement>
  time: number | undefined
  onRead: () => void
}) {
  React.useEffect(() => {
    const parentEl = parentElRef.current
    if (!parentEl || !time) return

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
    let timeoutTime = time * 0.6
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
  }, [time, onRead, parentElRef])
}

function ArticleFooter({
  editLink,
  permalink,
  title = 'an awesome post',
  isDraft,
}: {
  editLink: string
  permalink: string
  title?: string
  isDraft: boolean
}) {
  const [team] = useTeam()
  const tweetMessage =
    team === 'UNKNOWN'
      ? `I just read "${title}" by @kentcdodds\n\n`
      : `I just scored a point for the ${team.toLowerCase()} team ${
          teamEmoji[team]
        } by reading "${title}" by @kentcdodds\n\n`

  return (
    <Grid>
      <div className="col-span-full mb-12 flex flex-col flex-wrap justify-between gap-2 border-b border-gray-600 pb-12 text-lg font-medium text-slate-500 lg:col-span-8 lg:col-start-3 lg:flex-row lg:pb-6">
        <div className="flex space-x-5">
          <a
            className={clsx(
              'underlined hover:text-black focus:text-black focus:outline-none dark:hover:text-white dark:focus:text-white',
              {hidden: isDraft},
            )}
            target="_blank"
            rel="noreferrer noopener"
            href={`https://twitter.com/intent/tweet?${new URLSearchParams({
              url: permalink,
              text: tweetMessage,
            })}`}
          >
            Tweet this article
          </a>
        </div>

        <div className="flex">
          <a
            className={clsx(
              'underlined hover:text-black focus:text-black focus:outline-none dark:hover:text-white dark:focus:text-white',
              {hidden: isDraft},
            )}
            target="_blank"
            rel="noreferrer noopener"
            href={`https://twitter.com/search?${new URLSearchParams({
              q: permalink,
            })}`}
          >
            Discuss on Twitter
          </a>
          <span className={clsx('mx-3 self-center text-xs', {hidden: isDraft})}>
            •
          </span>
          <a
            className="underlined hover:text-black focus:text-black focus:outline-none dark:hover:text-white dark:focus:text-white"
            target="_blank"
            rel="noreferrer noopener"
            href={editLink}
          >
            Edit on GitHub
          </a>
        </div>
      </div>
      <div className="col-span-full lg:col-span-2 lg:col-start-3">
        <img
          className="mb-8 w-32 rounded-lg"
          {...getImgProps(images.kentTransparentProfile, {
            widths: [128, 256, 512],
            sizes: ['8rem'],
          })}
        />
      </div>
      <div className="lg:col-start:5 col-span-full lg:col-span-6">
        <H6 as="div">Written by Kent C. Dodds</H6>
        <Paragraph className="mb-12 mt-3">
          {`
Kent C. Dodds is a JavaScript software engineer and teacher. Kent's taught hundreds
of thousands of people how to make the world a better place with quality software
development tools and practices. He lives with his wife and four kids in Utah.
          `.trim()}
        </Paragraph>
        <ArrowLink to="/about">Learn more about Kent</ArrowLink>
      </div>
    </Grid>
  )
}

export default function MdxScreen() {
  const data = useLoaderData<typeof loader>()
  const {requestInfo} = useRootData()

  const {code, dateDisplay, frontmatter} = data.page
  const params = useParams()
  const markAsRead = useFetcher()
  const markAsReadRef = React.useRef(markAsRead)
  React.useEffect(() => {
    markAsReadRef.current = markAsRead
  }, [markAsRead])
  const {slug} = params
  const Component = useMdxComponent(code)

  const permalink = `${requestInfo.origin}/blog/${slug}`

  const readMarker = React.useRef<HTMLDivElement>(null)
  const isDraft = Boolean(data.page.frontmatter.draft)
  const isArchived = Boolean(data.page.frontmatter.archived)
  const categoriesAndKeywords = [
    ...(data.page.frontmatter.categories ?? []),
    ...(data.page.frontmatter.meta?.keywords ?? []),
  ]
  useOnRead({
    parentElRef: readMarker,
    time: data.page.readTime?.time,
    onRead: React.useCallback(() => {
      if (isDraft) return
      markAsReadRef.current.submit({intent: 'mark-as-read'}, {method: 'post'})
    }, [isDraft]),
  })

  return (
    <div
      key={slug}
      className={
        data.leadingTeam
          ? `set-color-team-current-${data.leadingTeam.toLowerCase()}`
          : ''
      }
    >
      <Grid className="mb-10 mt-24 lg:mb-24">
        <div className="col-span-full flex justify-between lg:col-span-8 lg:col-start-3">
          <BackLink to="/blog">Back to overview</BackLink>
          <TeamStats
            totalReads={data.totalReads}
            rankings={data.readRankings}
            direction="down"
            pull="right"
          />
        </div>
      </Grid>

      <Grid as="header" className="mb-12">
        <div className="col-span-full lg:col-span-8 lg:col-start-3">
          {isDraft ? (
            <div className="prose prose-light mb-6 max-w-full dark:prose-dark">
              {React.createElement(
                'callout-warning',
                {},
                `This blog post is a draft. Please don't share it in its current state.`,
              )}
            </div>
          ) : null}
          {isArchived ? (
            <div className="prose prose-light mb-6 max-w-full dark:prose-dark">
              {React.createElement(
                'callout-warning',
                {},
                `This blog post is archived. It's no longer maintained and may contain outdated information.`,
              )}
            </div>
          ) : null}
          <H2>{frontmatter.title}</H2>
          <H6 as="p" variant="secondary" className="mt-2">
            {[dateDisplay, data.page.readTime?.text ?? 'quick read']
              .filter(Boolean)
              .join(' — ')}
          </H6>
        </div>
        {frontmatter.bannerCloudinaryId ? (
          <div className="col-span-full mt-10 lg:col-span-10 lg:col-start-2 lg:mt-16">
            <BlurrableImage
              key={frontmatter.bannerCloudinaryId}
              blurDataUrl={frontmatter.bannerBlurDataUrl}
              className="aspect-h-4 aspect-w-3 md:aspect-w-3 md:aspect-h-2"
              img={
                <img
                  key={frontmatter.bannerCloudinaryId}
                  title={getBannerTitleProp(frontmatter)}
                  className="rounded-lg object-cover object-center"
                  {...getImgProps(
                    getImageBuilder(
                      frontmatter.bannerCloudinaryId,
                      getBannerAltProp(frontmatter),
                    ),
                    {
                      widths: [280, 560, 840, 1100, 1650, 2500, 2100, 3100],
                      sizes: [
                        '(max-width:1023px) 80vw',
                        '(min-width:1024px) and (max-width:1620px) 67vw',
                        '1100px',
                      ],
                      transformations: {
                        background: 'rgb:e6e9ee',
                      },
                    },
                  )}
                />
              }
            />
          </div>
        ) : null}
      </Grid>

      <main ref={readMarker}>
        <Grid className="mb-24">
          <div className="col-span-full lg:col-start-3 lg:col-end-11">
            <div className="flex flex-wrap">
              {frontmatter.translations?.length ? (
                <>
                  <ul className="col-span-full -mb-4 -mr-4 flex flex-wrap lg:col-span-10 lg:col-start-3">
                    {frontmatter.translations.map(({language, link}) => (
                      <li key={`${language}:${link}`}>
                        <a
                          href={link}
                          className="focus-ring bg-secondary text-primary relative mb-4 mr-4 block h-auto w-auto whitespace-nowrap rounded-full px-6 py-3"
                        >
                          {language}
                        </a>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={externalLinks.translationContributions}
                    className="text-secondary underlined my-3 mb-6 ml-5 block text-lg font-medium hover:text-team-current focus:text-team-current focus:outline-none"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Add translation
                  </a>
                </>
              ) : (
                <>
                  <span className="text-secondary text-lg italic">
                    No translations available.
                  </span>

                  <a
                    href={externalLinks.translationContributions}
                    className="text-secondary underlined ml-5 block text-lg font-medium hover:text-team-current focus:text-team-current focus:outline-none"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Add translation
                  </a>
                </>
              )}
            </div>
          </div>
        </Grid>

        <Grid className="prose prose-light mb-24 break-words dark:prose-dark">
          <Component />
        </Grid>
      </main>

      {categoriesAndKeywords.includes('react') ||
      categoriesAndKeywords.includes('testing') ? (
        <div className="mx-auto mb-24 flex max-w-lg flex-col items-center justify-center gap-8 md:max-w-none md:flex-row">
          {categoriesAndKeywords.includes('react') ? (
            <div className="w-full max-w-lg md:w-auto">
              <CourseCard
                title="Epic React"
                description="Get Really Good at React"
                imageBuilder={images.courseEpicReact}
                courseUrl="https://epicreact.dev"
              />
            </div>
          ) : null}
          {categoriesAndKeywords.includes('testing') ? (
            <div className="w-full max-w-lg md:w-auto">
              <CourseCard
                title="Testing JavaScript"
                description="Ship Apps with Confidence"
                imageBuilder={images.courseTestingJS}
                courseUrl="https://testingjavascript.com"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <Grid className="mb-24">
        <div className="col-span-full flex justify-end lg:col-span-8 lg:col-start-3">
          <TeamStats
            totalReads={data.totalReads}
            rankings={data.readRankings}
            direction="up"
            pull="right"
          />
        </div>
      </Grid>

      <ArticleFooter
        editLink={data.page.editLink}
        permalink={permalink}
        title={data.page.frontmatter.title}
        isDraft={isDraft}
      />

      <Spacer size="base" />

      {data.workshops.length > 0 ? (
        <>
          <HeaderSection
            title="Want to learn more?"
            subTitle="Join Kent in a live workshop"
          />
          <Spacer size="2xs" />

          <Grid>
            <div className="col-span-full">
              <Grid nested rowGap>
                {data.workshops.map((workshop, idx) => (
                  <div
                    key={idx}
                    className={clsx('col-span-4', {
                      'hidden lg:block': idx >= 2,
                    })}
                  >
                    <WorkshopCard
                      workshop={workshop}
                      // @ts-expect-error need to figure out a better way to
                      // handle the fact that this is a SeralizeObject type...
                      titoEvents={data.workshopEvents.filter(
                        e => e.metadata.workshopSlug === workshop.slug,
                      )}
                    />
                  </div>
                ))}
              </Grid>
            </div>
          </Grid>

          <Spacer size="base" />
        </>
      ) : null}

      <BlogSection
        articles={data.recommendations}
        title="If you found this article helpful."
        description="You will love these ones as well."
        showArrowButton={false}
      />
    </div>
  )
}

export function ErrorBoundary({error}: {error: Error}) {
  console.error(error)
  return <ServerError />
}

export function CatchBoundary() {
  const caught = useCatch()
  console.error('CatchBoundary', caught)
  if (caught.data.recommendations) {
    return <FourOhFour articles={caught.data.recommendations} />
  }
  throw new Error(`Unhandled error: ${caught.status}`)
}
