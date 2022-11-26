import * as React from 'react'
import {Link} from '@remix-run/react'
import clsx from 'clsx'
import type {TabProps} from '@reach/tabs'
import {Tabs, Tab as ReachTab, TabList, TabPanels, TabPanel} from '@reach/tabs'
import {differenceInYears} from 'date-fns'
import {motion, AnimatePresence} from 'framer-motion'
import type {Team} from '~/types'
import {images, getImgProps} from '~/images'
import type {ImageBuilder} from '~/images'
import {teamTextColorClasses} from '~/utils/misc'
import {Grid} from '../grid'
import {H2, H3, Paragraph} from '../typography'
import {ArrowLink} from '../arrow-button'
import {ArrowIcon} from '../icons'

function Tab({isSelected, children}: TabProps & {isSelected?: boolean}) {
  return (
    <ReachTab
      className={clsx(
        'hover:text-primary inline-flex w-full items-center border-none p-0 transition focus:bg-transparent',
        {
          'text-primary': isSelected,
          'text-gray-400 dark:text-slate-500': !isSelected,
        },
      )}
    >
      <span>{children}</span>
      <AnimatePresence>
        {isSelected ? (
          <motion.span
            className="ml-8 mt-4 hidden h-12 items-center lg:flex"
            initial={{x: -20, opacity: 0}}
            animate={{x: 0, opacity: 1, transition: {duration: 0.15}}}
            exit={{x: 20, opacity: 0, transition: {duration: 0.15}}}
          >
            <ArrowIcon size={76} direction="right" />
          </motion.span>
        ) : null}
      </AnimatePresence>
    </ReachTab>
  )
}

function ContentPanel({
  children,
  active,
  imageBuilder,
}: {
  children: React.ReactNode | React.ReactNode[]
  active: boolean
  imageBuilder: ImageBuilder
}) {
  return (
    <TabPanel className="col-start-1 row-start-1 block">
      <AnimatePresence>
        {active ? (
          <>
            <motion.img
              initial={{x: -40, opacity: 0}}
              animate={{x: 0, opacity: 1}}
              exit={{x: 40, opacity: 0}}
              transition={{damping: 0, duration: 0.25}}
              className="mb-6 h-44 lg:mb-14"
              {...getImgProps(imageBuilder, {
                widths: [180, 360, 540],
                sizes: ['11rem'],
              })}
            />

            <motion.div
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              transition={{duration: 0.25}}
            >
              {children}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </TabPanel>
  )
}

function ProblemSolutionSection({
  blogPostCount,
  totalBlogReaders,
  totalBlogReads,
  currentBlogLeaderTeam,
}: {
  blogPostCount: string
  totalBlogReaders: string
  totalBlogReads: string
  currentBlogLeaderTeam: Team | undefined
}) {
  const [activeTabIndex, setActiveTabIndex] = React.useState(0)

  return (
    <Tabs as={Grid} featured onChange={index => setActiveTabIndex(index)}>
      <div className="col-span-full lg:col-span-5">
        <H2 className="mb-4 lg:mb-0">
          Having a hard time keeping up with JavaScript?
        </H2>
      </div>
      <div className="col-span-full lg:col-span-5 lg:col-start-7">
        <H2 variant="secondary" as="p">
          {`
            Well, you're in the right place. My website is your one stop shop
            for everything you need to build JavaScript apps.
          `}
        </H2>
      </div>

      <hr className="col-span-full mb-10 mt-16 border-gray-200 dark:border-gray-600 lg:mb-20 lg:mt-24" />

      <div className="order-1 col-span-full col-start-1 lg:order-3 lg:col-span-5 lg:mt-52 lg:pt-2">
        <TabList className="inline-flex flex-row space-x-8 bg-transparent text-xl leading-snug text-white lg:flex-col lg:space-x-0 lg:text-7xl">
          <Tab>blog</Tab>
          <Tab>courses</Tab>
          <Tab>podcasts</Tab>
        </TabList>
      </div>

      <TabPanels className="order-4 col-span-full mt-16 grid lg:col-span-5 lg:col-start-7 lg:mt-0">
        <ContentPanel active={activeTabIndex === 0} imageBuilder={images.skis}>
          <H3>Educational blog</H3>

          <Paragraph className="mt-8">
            {`My `}
            <strong>{blogPostCount}</strong>
            {` blog posts (and counting) have been `}
            <Link prefetch="intent" to="/teams#read-rankings">
              read
            </Link>
            {` ${totalBlogReads} times by ${totalBlogReaders} people. There you'll find blogs about `}
            <Link prefetch="intent" to="/blog?q=javascript">
              JavaScript
            </Link>
            {`, `}
            <Link prefetch="intent" to="/blog?q=typescript">
              TypeScript
            </Link>
            {`, `}
            <Link prefetch="intent" to="/blog?q=react">
              React
            </Link>
            {`, `}
            <Link prefetch="intent" to="/blog?q=testing">
              Testing
            </Link>
            {`, `}
            <Link prefetch="intent" to="/blog?q=career">
              your career
            </Link>
            {`, and `}
            <Link prefetch="intent" to="/blog">
              and more
            </Link>
            .
          </Paragraph>
          {currentBlogLeaderTeam ? (
            <Paragraph
              prose={false}
              textColorClassName={teamTextColorClasses[currentBlogLeaderTeam]}
            >
              {`The `}
              <Link
                to="/teams"
                className={`${teamTextColorClasses[currentBlogLeaderTeam]} underlined`}
              >
                <strong>{currentBlogLeaderTeam.toLowerCase()}</strong>
              </Link>
              {` team is winning.`}
            </Paragraph>
          ) : null}

          <ArrowLink to="/blog" className="mt-14">
            Start reading the blog
          </ArrowLink>
        </ContentPanel>

        <ContentPanel
          active={activeTabIndex === 1}
          imageBuilder={images.onewheel}
        >
          <H3>Courses</H3>

          <Paragraph className="mt-8">
            {`
              I've been teaching people just like you how to build better
              software for over ${differenceInYears(
                Date.now(),
                new Date(2014, 0, 0),
              )}
              years. Tens of thousands of people have increased their confidence
              in shipping software with
            `}
            <a href="https://testingjavascript.com">TestingJavaScript.com</a>
            {`
              and even more have improved the performance and maintainability
              of their React applications from what they've learned from
            `}
            <a href="https://epicreact.dev">EpicReact.dev</a>.
          </Paragraph>

          <ArrowLink to="/courses" className="mt-14">
            Explore the courses
          </ArrowLink>
        </ContentPanel>

        <ContentPanel active={activeTabIndex === 2} imageBuilder={images.kayak}>
          <H3>Podcast</H3>

          <Paragraph className="mt-8">
            {`
              I really enjoy chatting with people about software development and
              life as a software developer. So I have several podcasts for you
              to enjoy like
            `}
            <Link prefetch="intent" to="/chats">
              Chats with Kent
            </Link>
            {`, `}
            <Link prefetch="intent" to="/calls">
              Call Kent
            </Link>
            {`, and `}
            <a href="https://epicreact.dev/podcast">
              the EpicReact.dev podcast
            </a>
            .
          </Paragraph>

          <Paragraph>
            {`
              I've also had the pleasure to be a guest on many other podcasts
              where I've been able to share my thoughts on webdev. You can find
              those on my
            `}
            <Link prefetch="intent" to="/appearances">
              appearances
            </Link>
            {` page.`}
          </Paragraph>

          <ArrowLink to="/chats" className="mt-14">
            Start listening to chats with Kent
          </ArrowLink>
        </ContentPanel>
      </TabPanels>
    </Tabs>
  )
}

export {ProblemSolutionSection}
