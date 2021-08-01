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
        'hover:text-primary inline-flex items-center p-0 w-full focus:bg-transparent border-none lowercase transition',
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
            className="hidden items-center ml-8 mt-4 h-12 lg:flex"
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
  imageUrl,
  imageAlt,
  active,
}: {
  children: React.ReactNode | React.ReactNode[]
  active: boolean
  imageUrl: string
  imageAlt: string
}) {
  return (
    <TabPanel className="block col-start-1 row-start-1">
      <AnimatePresence>
        {active ? (
          <>
            <motion.img
              initial={{x: -40, opacity: 0}}
              animate={{x: 0, opacity: 1}}
              exit={{x: 40, opacity: 0}}
              transition={{damping: 0, duration: 0.25}}
              className="mb-6 h-44 lg:mb-14"
              src={imageUrl}
              alt={imageAlt}
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

function ProblemSolutionSection() {
  const [activeTabIndex, setActiveTabIndex] = React.useState(0)

  return (
    <Tabs as={Grid} featured onChange={index => setActiveTabIndex(index)}>
      <div className="col-span-full lg:col-span-5">
        <H2 className="mb-4 lg:mb-0">
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

      <hr
        id="p"
        className="col-span-full mb-10 mt-16 border-gray-200 dark:border-gray-600 lg:mb-20 lg:mt-24"
      />

      <div className="col-span-full col-start-1 order-1 lg:col-span-5 lg:order-3 lg:mt-52 lg:pt-2">
        <TabList className="inline-flex flex-row text-white text-xl leading-snug bg-transparent space-x-8 lg:flex-col lg:text-7xl lg:space-x-0">
          <Tab>Blog</Tab>
          <Tab>Courses</Tab>
          <Tab>Podcast</Tab>
        </TabList>
      </div>

      <TabPanels className="grid col-span-full order-4 mt-16 lg:col-span-5 lg:col-start-7 lg:mt-0">
        <ContentPanel
          active={activeTabIndex === 0}
          imageUrl={images.skis()}
          imageAlt={images.skis.alt}
        >
          <H3>Educational blog</H3>

          <Paragraph className="mt-8">
            Vestibulum in cursus est, sit amet rhoncus sapien. Fusce nec quam
            euismod, aliquet nulla at, gravida nunc. Nulla vitae hendrerit
            velit. Duis nisi felis, porta eu convallis sit amet, vulputate non
            mi. Mauris vel pellentesque mauris vivamus.
          </Paragraph>

          <ArrowLink to="/blog" className="mt-14">
            Start reading the blog
          </ArrowLink>
        </ContentPanel>

        <ContentPanel
          active={activeTabIndex === 1}
          imageUrl={images.onewheel()}
          imageAlt={images.onewheel.alt}
        >
          <H3>Courses</H3>

          <Paragraph className="mt-8">
            Duis nisi felis, porta eu convallis sit amet, vulputate non mi.
            Mauris vel pellentesque mauris vivamus. Vestibulum in cursus est,
            sit amet rhoncus sapien. Fusce nec quam euismod, aliquet nulla at,
            gravida nunc. Nulla vitae hendrerit velit.
          </Paragraph>

          <ArrowLink to="/courses" className="mt-14">
            Explore the courses
          </ArrowLink>
        </ContentPanel>

        <ContentPanel
          active={activeTabIndex === 2}
          imageUrl={images.kayak()}
          imageAlt={images.kayak.alt}
        >
          <H3>Podcast</H3>

          <Paragraph className="mt-8">
            Mauris vel pellentesque mauris vivamus. Vestibulum in cursus est,
            sit amet rhoncus sapien. Fusce nec quam euismod, aliquet nulla at,
            gravida nunc. Nulla vitae hendrerit velit. Duis nisi felis, porta eu
            convallis sit amet, vulputate non mi.
          </Paragraph>

          <ArrowLink to="/chats" className="mt-14">
            Start listening to the podcasts
          </ArrowLink>
        </ContentPanel>
      </TabPanels>
    </Tabs>
  )
}

export {ProblemSolutionSection}
