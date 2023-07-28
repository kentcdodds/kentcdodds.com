import {
  Tab as ReachTab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  type TabProps,
} from '@reach/tabs'
import {Link} from '@remix-run/react'
import {clsx} from 'clsx'
import {differenceInYears} from 'date-fns'
import {AnimatePresence, motion} from 'framer-motion'
import * as React from 'react'
import {getImgProps, images, type ImageBuilder} from '~/images.tsx'
import {type Team} from '~/types.ts'
import {teamTextColorClasses} from '~/utils/misc.tsx'
import {ArrowLink} from '../arrow-button.tsx'
import {Grid} from '../grid.tsx'
import {ArrowIcon} from '../icons.tsx'
import {H2, H3, Paragraph} from '../typography.tsx'

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
          Besoin de passer du bon temps et d'en apprendre plus sur moi et même le monde ?
        </H2>
      </div>
      <div className="col-span-full lg:col-span-5 lg:col-start-7">
        <H2 variant="secondary" as="p">
          {`
            Vous êtes au meilleur endroit ! Chaque semaine, on discute cinéma, musique, culture 
            et surtout partage d'expérience en dehors du web ! 
          `}
        </H2>
      </div>

      <hr className="col-span-full mb-10 mt-16 border-gray-200 dark:border-gray-600 lg:mb-20 lg:mt-24" />

      <div className="order-1 col-span-full col-start-1 lg:order-3 lg:col-span-5 lg:mt-52 lg:pt-2">
        <TabList className="inline-flex flex-row space-x-8 bg-transparent text-xl leading-snug text-white lg:flex-col lg:space-x-0 lg:text-7xl">
          <Tab>Blog</Tab>
          <Tab>Se former</Tab>
          <Tab>Podcasts</Tab>
        </TabList>
      </div>

      <TabPanels className="order-4 col-span-full mt-16 grid lg:col-span-5 lg:col-start-7 lg:mt-0">
        <ContentPanel active={activeTabIndex === 0} imageBuilder={images.skis}>
          <H3>Talk about us </H3>

          <Paragraph className="mt-8">
            {`Mes `}
            <strong>{blogPostCount}</strong>
            {` articles de blogs (and counting) sont lus plus de `}
            <Link prefetch="intent" to="/teams#read-rankings">
              read
            </Link>
            {` ${totalBlogReads} fois par plus de ${totalBlogReaders} de gens. Sur notre blog, nous parlons de sujets comme `}
            <Link prefetch="intent" to="/blog?q=javascript">
              le développement web
            </Link>
            {`, `}
            <Link prefetch="intent" to="/blog?q=typescript">
              l'actualité cinéma
            </Link>
            {`, `}
            <Link prefetch="intent" to="/blog?q=react">
              les dernières tendances musicales
            </Link>
            {`, `}
            <Link prefetch="intent" to="/blog?q=testing">
              le domaine de la tech
            </Link>
            {`, `}
            <Link prefetch="intent" to="/blog?q=career">
              l'amour
            </Link>
            {`, et `}
            <Link prefetch="intent" to="/blog">
             bien plus encore
            </Link>
            .
          </Paragraph>
          <ArrowLink to="/blog" className="mt-14">
            Commencer à lire le blog
          </ArrowLink>
        </ContentPanel>

        <ContentPanel
          active={activeTabIndex === 1}
          imageBuilder={images.onewheel}
        >
          <H3>Formations</H3>

          <Paragraph className="mt-8">
            {`
              Apprendre aux gens à savoir construire des systèmes innovants, mieux 
              développer leurs talents d'écrivains et bien plus reste une passion pour moi depuis plus 
              de ${differenceInYears(
                Date.now(),
                new Date(2014, 0, 0),
              )}
              years. En ses nombreuses années d'accompagnement des jeunes avec le CVADD
            `}
            <a href="https://testingjavascript.com">TestingJavaScript.com</a>
            {`
              notamment à la gestion de projets, je suis capable de vous aider à atteindre vos objectifs... Mais cette
              fois avec l'IA !          `}
          </Paragraph>

          <ArrowLink to="/courses" className="mt-14">
            Voir les cours
          </ArrowLink>
        </ContentPanel>

        <ContentPanel active={activeTabIndex === 2} imageBuilder={images.kayak}>
          <H3>Mon podcast !</H3>

          <Paragraph className="mt-8">
            {`
              En lançant l'un des meilleurs podcasts du milieu de l'innovation et du milieu tech en Afrique, j'espérais 
              mettre la lumière sur les talents existants, mais pas que. Il s'agissait de pouvoir inspirer les personnes de
              tout horizon et de pouvoir changer leur vie. Au programme, un mythique rendez vous sur 
            `}
            <Link prefetch="intent" to="/chats">
              l'importance des systèmes innovants
            </Link>
            {`, `}
            <Link prefetch="intent" to="/calls">
              le choix de sa carrière dans la tech
            </Link>
            {` et même une interview intime avec `}
             <Link prefetch="intent" to="/calls">
             Dekelly
            </Link>
          </Paragraph>

          <ArrowLink to="/chats" className="mt-14">
            Allons écouter mon podcast !
          </ArrowLink>
        </ContentPanel>
      </TabPanels>
    </Tabs>
  )
}

export {ProblemSolutionSection}
