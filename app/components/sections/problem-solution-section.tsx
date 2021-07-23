import * as React from 'react'
import {
  Tabs,
  Tab as ReachTab,
  TabProps,
  TabList,
  TabPanels,
  TabPanel,
} from '@reach/tabs'
import clsx from 'clsx'
import {motion, AnimatePresence} from 'framer-motion'
import {images} from '../../images'
import {Grid} from '../grid'
import {H2, H3, Paragraph} from '../typography'
import {ArrowLink} from '../arrow-button'
import {ArrowIcon} from '../icons/arrow-icon'

function Tab({isSelected, children}: TabProps & {isSelected?: boolean}) {
  return (
    <ReachTab
      className={clsx(
        'hover:text-primary inline-flex items-center p-0 w-full focus:bg-transparent border-none lowercase space-x-8 transition',
        {
          'text-primary': isSelected,
          'dark:text-blueGray-500 text-gray-400': !isSelected,
        },
      )}
    >
      <span>{children}</span>
      <AnimatePresence>
        {isSelected ? (
          <motion.span
            className="hidden items-center mt-4 h-12 lg:flex"
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

function ImagePanel({
  active,
  imageUrl,
  imageAlt,
}: {
  active: boolean
  imageUrl: string
  imageAlt: string
}) {
  return (
    <TabPanel className="block col-start-1 row-start-1 h-44">
      <AnimatePresence>
        {active ? (
          <motion.img
            initial={{x: -40, opacity: 0}}
            animate={{x: 0, opacity: 1}}
            exit={{x: 40, opacity: 0}}
            transition={{damping: 0, duration: 0.25}}
            className="h-44"
            src={imageUrl}
            alt={imageAlt}
          />
        ) : null}
      </AnimatePresence>
    </TabPanel>
  )
}

function ContentPanel({
  children,
  active,
}: {
  children: React.ReactNode | React.ReactNode[]
  active: boolean
}) {
  return (
    <TabPanel className="block col-start-1 row-start-1">
      <AnimatePresence>
        {active ? (
          <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            transition={{duration: 0.25}}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </TabPanel>
  )
}

function ProblemSolutionSection() {
  const [activeTabIndex, setActiveTabIndex] = React.useState(0)

  return (
    <div className="px-5vw w-full">
      <div className="pb-16 pt-24 w-full bg-gray-100 dark:bg-gray-800 rounded-lg lg:pb-40 lg:pt-36">
        <div className="-mx-5vw">
          <Tabs as={Grid} onChange={index => setActiveTabIndex(index)}>
            <div className="col-span-full lg:col-span-5">
              <H2>
                The JavaScript landscape is incredibly confusing to keep up with
                right?
              </H2>
            </div>
            <div className="col-span-full lg:col-span-5 lg:col-start-7">
              <H2 variant="secondary" as="p">
                You’re in the right place, my website is your one stop shop for
                everything JavaScript related.
              </H2>
            </div>

            <hr className="col-span-full mb-20 mt-24 border-gray-200 dark:border-gray-600" />

            {/*
              Note that we use two TabPanels for a single TabList, so that we can
              align the elements on a single grid.

              TODO: replace placeholders with right assets
            */}
            <TabPanels className="relative grid col-span-full order-2 mt-16 lg:col-span-5 lg:col-start-7 lg:mt-0">
              <ImagePanel
                imageUrl={images.skis()}
                imageAlt={images.skis.alt}
                active={activeTabIndex === 0}
              />

              <ImagePanel
                imageUrl={images.onewheel()}
                imageAlt={images.onewheel.alt}
                active={activeTabIndex === 1}
              />

              <ImagePanel
                imageUrl={images.kayak()}
                imageAlt={images.kayak.alt}
                active={activeTabIndex === 2}
              />
            </TabPanels>

            <div className="col-span-full col-start-1 order-1 lg:col-span-5 lg:order-3 lg:mt-10">
              <TabList className="inline-flex flex-row text-white text-xl leading-snug bg-transparent space-x-8 lg:flex-col lg:text-7xl lg:space-x-0">
                <Tab>Blog</Tab>
                <Tab>Courses</Tab>
                <Tab>Podcast</Tab>
              </TabList>
            </div>

            <TabPanels className="grid col-span-full order-4 mt-14 lg:col-span-5 lg:col-start-7">
              <ContentPanel active={activeTabIndex === 0}>
                <H3>Educational blog</H3>

                <Paragraph className="mt-8">
                  Vestibulum in cursus est, sit amet rhoncus sapien. Fusce nec
                  quam euismod, aliquet nulla at, gravida nunc. Nulla vitae
                  hendrerit velit. Duis nisi felis, porta eu convallis sit amet,
                  vulputate non mi. Mauris vel pellentesque mauris vivamus.
                </Paragraph>

                <ArrowLink to="/blog" className="mt-14">
                  Start reading the blog
                </ArrowLink>
              </ContentPanel>

              <ContentPanel active={activeTabIndex === 1}>
                <H3>Courses</H3>

                <Paragraph className="mt-8">
                  Duis nisi felis, porta eu convallis sit amet, vulputate non
                  mi. Mauris vel pellentesque mauris vivamus. Vestibulum in
                  cursus est, sit amet rhoncus sapien. Fusce nec quam euismod,
                  aliquet nulla at, gravida nunc. Nulla vitae hendrerit velit.
                </Paragraph>

                <ArrowLink to="/courses" className="mt-14">
                  Explore the courses
                </ArrowLink>
              </ContentPanel>

              <ContentPanel active={activeTabIndex === 2}>
                <H3>Podcast</H3>

                <Paragraph className="mt-8">
                  Mauris vel pellentesque mauris vivamus. Vestibulum in cursus
                  est, sit amet rhoncus sapien. Fusce nec quam euismod, aliquet
                  nulla at, gravida nunc. Nulla vitae hendrerit velit. Duis nisi
                  felis, porta eu convallis sit amet, vulputate non mi.
                </Paragraph>

                <ArrowLink to="/chats" className="mt-14">
                  Start listening to the podcasts
                </ArrowLink>
              </ContentPanel>
            </TabPanels>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export {ProblemSolutionSection}
