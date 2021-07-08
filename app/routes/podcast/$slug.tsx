import React, {useState} from 'react'
import {useRouteData, json} from 'remix'
import {Link} from 'react-router-dom'
import type {KCDLoader, MdxPage} from 'types'
import clsx from 'clsx'
import {motion} from 'framer-motion'
import {
  getMdxPage,
  getMdxComponent,
  getMdxPagesInDirectory,
  mapFromMdxPageToMdxListItem,
} from '../../utils/mdx'
import {H2, H3, H6, Paragraph} from '../../components/typography'
import {Grid} from '../../components/grid'
import {ArrowIcon} from '../../components/icons/arrow-icon'
import {ClipboardIcon} from '../../components/icons/clipboard-icon'
import {CheckIcon} from '../../components/icons/check-icon'
import {GithubIcon} from '../../components/icons/github-icon'
import {TwitterIcon} from '../../components/icons/twitter-icon'
import {PlusIcon} from '../../components/icons/plus-icon'
import {FeaturedSection} from '../../components/sections/featured-section'
import {ArrowLink} from '../../components/arrow-button'
import {ChevronRightIcon} from '../../components/icons/chevron-right-icon'
import {ChevronLeftIcon} from '../../components/icons/chevron-left-icon'

type LoaderData = {
  prevPage: MdxPage
  nextPage: MdxPage
  page: MdxPage
}

export const loader: KCDLoader<{slug: string}> = async ({params}) => {
  // TODO: this should support the season dirs
  // TODO: sort pages descending
  const pages = (await getMdxPagesInDirectory('podcast-next/01')).map(
    mapFromMdxPageToMdxListItem,
  )

  const page = await getMdxPage({
    contentDir: 'podcast-next/01',
    slug: params.slug,
  })

  const index = pages.findIndex(current => current.slug === page?.slug)
  const prevPage = pages[index + 1] ?? null
  const nextPage = pages[index - 1] ?? null

  // TODO: add 404 handling
  return json({prevPage, nextPage, page})
}

interface HomeworkProps {
  todos: string[]
}

function Homework({todos = []}: HomeworkProps) {
  return (
    <div className="bg-secondary p-10 pb-16 w-full rounded-lg">
      <H6 className="inline-flex items-center mb-8 space-x-4">
        <ClipboardIcon />
        <span>Homework</span>
      </H6>

      <ul className="text-primary">
        {todos.map(todo => (
          <li
            key={todo}
            className="flex pb-12 pt-8 border-t border-gray-200 dark:border-gray-600"
          >
            <CheckIcon
              className="flex-none mr-6 text-gray-400 dark:text-gray-600"
              size={24}
            />

            <p className="text-lg font-medium">{todo}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface ResourcesProps {
  resources: {url: string; name: string}[]
}

function Resources({resources = []}: ResourcesProps) {
  return (
    <div className="bg-secondary p-10 pb-16 rounded-lg">
      <h6 className="text-primary inline-flex items-center mb-8 text-xl font-medium">
        Resources
      </h6>

      <ul className="text-primary space-y-8">
        {resources.map(resource => (
          <li key={resource.url}>
            <a href={resource.url} className="text-secondary text-xl space-x-4">
              <span>{resource.name}</span>
              <span className="inline-block align-bottom">
                <ArrowIcon direction="top-right" />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface GuestProps {
  guest: Exclude<MdxPage['frontmatter']['guest'], undefined>
}

function Guest({guest}: GuestProps) {
  return (
    <div className="text-secondary bg-secondary flex flex-col p-10 pb-16 rounded-lg md:flex-row md:items-center md:pb-12">
      <img
        src={guest.image}
        alt={guest.name}
        className="flex-none mb-6 mr-8 w-20 h-20 rounded-lg object-cover md:mb-0"
      />
      <div className="mb-6 w-full md:flex-auto md:mb-0">
        <h6 className="text-primary mb-2 text-xl font-medium leading-none">
          {guest.name}
        </h6>
        <p className="text-xl leading-none">{guest.company}</p>
      </div>
      <div className="flex flex-none space-x-4">
        {guest.twitter ? (
          <a href={guest.twitter} aria-label="twitter profile">
            <TwitterIcon />
          </a>
        ) : null}

        {guest.github ? (
          <a href={guest.github} aria-label="github profile">
            <GithubIcon />
          </a>
        ) : null}
      </div>
    </div>
  )
}

function Transcript({children}: {children: React.ReactNode}) {
  const [collapsed, setCollapsed] = useState(true)

  return (
    <div className="bg-secondary col-span-full p-10 pb-16 rounded-lg">
      <h6 className="text-primary inline-flex items-center mb-8 text-xl font-medium">
        Transcript
      </h6>

      <div
        className={clsx(
          'prose prose-light dark:prose-dark relative overflow-hidden',
          {
            'max-h-96': collapsed,
          },
        )}
      >
        {children}

        {collapsed ? (
          <div className="absolute bottom-0 w-full h-48 bg-gradient-to-b from-transparent dark:to-gray-800 to-white" />
        ) : null}
      </div>
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="text-primary inline-flex items-center mt-16 text-xl transition"
        >
          <span>Read the full transcript</span>
          <span className="inline-flex flex-none items-center justify-center ml-8 p-1 w-14 h-14 border-2 border-gray-200 dark:border-gray-600 rounded-full">
            <PlusIcon />
          </span>
        </button>
      ) : null}
    </div>
  )
}

const imageVariants = {
  initial: {
    opacity: 1,
  },
  hover: {
    opacity: 0.2,
  },
}
const arrowVariants = {
  initial: {
    opacity: 0,
  },
  hover: {
    scale: 2,
    opacity: 1,
  },
  tapLeft: {
    x: -5,
    opacity: 0,
  },
  tapRight: {
    x: 5,
    opacity: 1,
  },
}

interface PrevNextButtonProps {
  podcast?: MdxPage
  direction: 'prev' | 'next'
}

const MotionLink = motion(Link)

function PrevNextButton({podcast, direction}: PrevNextButtonProps) {
  if (!podcast) {
    return <div /> // return empty div for easy alignment
  }

  const {guest} = podcast.frontmatter

  return (
    <MotionLink
      initial="initial"
      whileHover="hover"
      whileFocus="hover"
      whileTap={direction === 'next' ? 'tapRight' : 'tapLeft'}
      animate="initial"
      to={`/podcast/${podcast.slug}`}
      className={clsx('flex items-center focus:outline-none', {
        'flex-row-reverse': direction === 'next',
      })}
    >
      <div className="relative rounded-lg overflow-hidden">
        <motion.img
          variants={imageVariants}
          transition={{duration: 0.2}}
          className="w-12 h-12"
          src={guest?.image}
          alt={guest?.name}
        />
        <motion.div
          variants={arrowVariants}
          className="text-primary absolute inset-0 flex items-center justify-center origin-center"
        >
          {direction === 'next' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </motion.div>
      </div>
      <div
        className={clsx('flex flex-col', {
          'ml-4 items-start': direction === 'prev',
          'mr-4 items-end': direction === 'next',
        })}
      >
        <p className="text-primary text-lg font-medium">{guest?.name}</p>
        {/* TODO: get episode from somewhere */}
        <h6 className="text-secondary text-lg font-medium">
          {direction === 'next' ? 'Episode 12' : 'Episode 10'}
        </h6>
      </div>
    </MotionLink>
  )
}

function PodcastDetail() {
  const data = useRouteData<LoaderData>()
  const {frontmatter, code} = data.page
  const TranscriptContent = React.useMemo(() => getMdxComponent(code), [code])

  return (
    <>
      <Grid className="mb-24 mt-24 lg:mb-12">
        <Link
          to="/"
          className="flex col-span-full text-black dark:text-white space-x-4 lg:col-span-8 lg:col-start-3"
        >
          <ArrowIcon direction="left" />
          <H6 as="span">Back to overview</H6>
        </Link>
      </Grid>

      <Grid as="header" className="mb-12">
        <H2 className="col-span-full lg:col-span-8 lg:col-span-8 lg:col-start-3">
          {frontmatter.title}
        </H2>
      </Grid>

      <Grid as="main" className="mb-24 lg:mb-96">
        <div className="col-span-full mb-16 lg:col-span-8 lg:col-start-3">
          <iframe
            className="mb-4"
            title="player"
            height="200px"
            width="100%"
            frameBorder="no"
            scrolling="no"
            seamless
            src={`https://player.simplecast.com/${frontmatter.simpleCastId}?dark=false`}
          />

          <div className="flex justify-between">
            <PrevNextButton podcast={data.prevPage} direction="prev" />
            <PrevNextButton podcast={data.nextPage} direction="next" />
          </div>
        </div>

        <H3 className="col-span-full mb-6 lg:col-span-8 lg:col-start-3">
          {frontmatter.description}
        </H3>

        <Paragraph className="col-span-full mb-10 space-y-6 lg:col-span-8 lg:col-start-3">
          {frontmatter.summary}
        </Paragraph>

        <div className="col-span-full space-y-4 lg:col-span-8 lg:col-start-3">
          {frontmatter.homework && frontmatter.homework.length > 0 ? (
            <Homework todos={frontmatter.homework} />
          ) : null}
          {frontmatter.resources && frontmatter.resources.length > 0 ? (
            <Resources resources={frontmatter.resources} />
          ) : null}
          {frontmatter.guest ? <Guest guest={frontmatter.guest} /> : null}
          <Transcript>
            <TranscriptContent />
          </Transcript>
        </div>
      </Grid>

      <Grid>
        <div className="flex flex-col col-span-full mb-20 space-y-10 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div className="space-y-2 lg:space-y-0">
            <H2>Sweet episode right?</H2>
            <H2 variant="secondary" as="p">
              You will love this one too.{' '}
            </H2>
          </div>

          <ArrowLink to="/podcasts" direction="right">
            See all episodes
          </ArrowLink>
        </div>
      </Grid>

      {/* TODO: get a related episode from the backend */}
      <FeaturedSection
        imageAlt={frontmatter.guest?.name}
        imageUrl={frontmatter.guest?.image}
        title={frontmatter.title}
        slug={data.page.slug}
        subTitle="Season 3, Episode 2 — 36:01"
        caption="Related episode"
        cta="Listen to this episode"
      />
    </>
  )
}

export default PodcastDetail
