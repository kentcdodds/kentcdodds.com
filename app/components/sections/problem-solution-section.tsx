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
import {ArrowButton} from '../arrow-button'
import {ArrowIcon} from '../icons/arrow-icon'

function Tab({isSelected, children}: TabProps & {isSelected?: boolean}) {
  return (
    <ReachTab
      className={clsx(
        'inline-flex items-center w-full focus:bg-transparent border-none lowercase space-x-8 transition',
        {
          'text-black dark:text-white': isSelected,
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

function ProblemSolutionSection() {
  return (
    <div className="px-5vw w-full">
      <div className="pb-16 pt-24 w-full bg-gray-100 dark:bg-gray-800 rounded-lg lg:pb-40 lg:pt-36">
        <div className="-mx-5vw">
          <Tabs as={Grid}>
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
            <TabPanels className="col-span-full order-2 mt-16 lg:col-span-5 lg:col-start-7 lg:mt-0">
              <TabPanel>
                <img
                  className="-ml-10 w-48"
                  src={images.skis.src}
                  alt={images.skis.alt}
                />
              </TabPanel>
              <TabPanel>
                <img
                  className="-ml-10 w-48"
                  src="https://epicreact.dev/static/e9e50b43a9526373f48a11340fdfdbdc/e4e36/01-react-fundamentals.webp"
                  alt="TODO: give a real alt"
                />
              </TabPanel>
              <TabPanel>
                <img
                  className="-ml-10 w-48"
                  src="https://epicreact.dev/static/2eec163c81b5805ff089fc59813197f8/35871/03-advanced-react-hooks.webp"
                  alt="TODO: give a real alt"
                />
              </TabPanel>
            </TabPanels>

            <div className="col-span-full col-start-1 order-1 lg:col-span-5 lg:order-3 lg:mt-5">
              <TabList className="inline-flex flex-row text-white text-xl bg-transparent space-x-8 lg:flex-col lg:text-7xl lg:space-x-0 lg:space-y-7">
                <Tab>Blog</Tab>
                <Tab>Courses</Tab>
                <Tab>Podcast</Tab>
              </TabList>
            </div>

            <TabPanels className="col-span-full order-4 mt-14 space-y-7 lg:col-span-5 lg:col-start-7">
              <TabPanel>
                <H3>Educational blog</H3>

                <Paragraph>
                  Vestibulum in cursus est, sit amet rhoncus sapien. Fusce nec
                  quam euismod, aliquet nulla at, gravida nunc. Nulla vitae
                  hendrerit velit. Duis nisi felis, porta eu convallis sit amet,
                  vulputate non mi. Mauris vel pellentesque mauris vivamus.
                </Paragraph>

                <div className="pt-7">
                  <ArrowButton>Start reading the blog</ArrowButton>
                </div>
              </TabPanel>

              <TabPanel>
                <H3>Courses</H3>

                <Paragraph>
                  Duis nisi felis, porta eu convallis sit amet, vulputate non
                  mi. Mauris vel pellentesque mauris vivamus. Vestibulum in
                  cursus est, sit amet rhoncus sapien. Fusce nec quam euismod,
                  aliquet nulla at, gravida nunc. Nulla vitae hendrerit velit.
                </Paragraph>

                <div className="pt-7">
                  <ArrowButton>Explore the courses</ArrowButton>
                </div>
              </TabPanel>

              <TabPanel>
                <H3>Podcast</H3>

                <Paragraph>
                  Mauris vel pellentesque mauris vivamus. Vestibulum in cursus
                  est, sit amet rhoncus sapien. Fusce nec quam euismod, aliquet
                  nulla at, gravida nunc. Nulla vitae hendrerit velit. Duis nisi
                  felis, porta eu convallis sit amet, vulputate non mi.
                </Paragraph>

                <div className="pt-7">
                  <ArrowButton>Start listening to the podcasts</ArrowButton>
                </div>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export {ProblemSolutionSection}
