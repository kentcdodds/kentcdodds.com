import * as React from 'react'
import {motion} from 'framer-motion'
import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  useAccordionItemContext,
} from '@reach/accordion'
import type {HeadersFunction} from 'remix'
import {json, useLoaderData} from 'remix'
import type {KCDLoader} from '~/types'
import {getDiscordAuthorizeURL, reuseUsefulLoaderHeaders} from '~/utils/misc'
import {useOptionalUser, useRequestInfo} from '~/utils/providers'
import {ArrowLink} from '~/components/arrow-button'
import {ButtonLink} from '~/components/button'
import {H2, H5, H6, Paragraph} from '~/components/typography'
import {getImgProps, images} from '~/images'
import {Grid} from '~/components/grid'
import {externalLinks} from '../external-links'
import {UsersIcon} from '~/components/icons/users-icon'
import {CodeIcon} from '~/components/icons/code-icon'
import {NumberedPanel} from '~/components/numbered-panel'
import {TestimonialSection} from '~/components/sections/testimonial-section'
import {CourseSection} from '~/components/sections/course-section'
import {FeatureCard} from '~/components/feature-card'
import {HeroSection} from '~/components/sections/hero-section'
import {HeaderSection} from '~/components/sections/header-section'
import {getTestimonials} from '~/utils/testimonials.server'
import type {Testimonial} from '~/utils/testimonials.server'

type LoaderData = {
  testimonials: Array<Testimonial>
}

export const loader: KCDLoader = async ({request}) => {
  const testimonials = await getTestimonials({
    request,
    subjects: ['Discord Community'],
    categories: ['community'],
  })

  const data: LoaderData = {testimonials}
  return json(data, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export interface CategoryCardProps {
  title: string
  description: string
  number: number
}

function CategoryCardContent({title, description, number}: CategoryCardProps) {
  const {isExpanded} = useAccordionItemContext()

  return (
    <>
      <H5 as="div" className="text-primary w-full transition">
        <AccordionButton className="relative w-full text-left focus:outline-none">
          <div className="absolute -bottom-12 -left-8 -right-8 -top-12 rounded-lg lg:-left-28 lg:-right-20" />

          <span className="absolute -left-16 top-0 hidden text-lg lg:block">
            {number.toString().padStart(2, '0')}.
          </span>

          <span>{title}</span>

          <span className="absolute right-0 top-1 lg:-right-8">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <motion.path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M12 5.75V18.25"
                animate={{scaleY: isExpanded ? 0 : 1}}
              />
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M18.25 12L5.75 12"
              />
            </svg>
          </span>
        </AccordionButton>
      </H5>

      <AccordionPanel
        as={motion.div}
        className="block overflow-hidden"
        initial={false}
        animate={
          isExpanded ? {opacity: 1, height: 'auto'} : {opacity: 0, height: 0}
        }
      >
        <Paragraph className="mt-4 lg:mt-12">{description}</Paragraph>
      </AccordionPanel>
    </>
  )
}

function CategoryCard(props: CategoryCardProps) {
  return (
    <AccordionItem className="bg-secondary hover:bg-alt focus-within:bg-alt flex flex-col col-span-full items-start px-8 py-12 w-full rounded-lg transition lg:col-span-6 lg:pl-28 lg:pr-20">
      <CategoryCardContent {...props} />
    </AccordionItem>
  )
}

const categories = Array.from({length: 8}).map((_, idx) => ({
  number: idx + 1,
  title: ['Development Livestreams', 'Learning clubs'][idx % 2] as string,
  description:
    'Mauris auctor nulla at felis placerat, ut elementum urna commodo. Aenean et rutrum quam. Etiam odio massa, congue in orci nec, ornare suscipit sem aen.',
}))

function partitionCategories<T>(entries: T[]): [T[], T[]] {
  const left: T[] = []
  const right: T[] = []

  for (let idx = 0; idx < entries.length; idx++) {
    if (idx % 2 === 0) {
      left.push(entries[idx] as T)
    } else {
      right.push(entries[idx] as T)
    }
  }

  return [left, right]
}

export default function Discord() {
  const data = useLoaderData<LoaderData>()
  const user = useOptionalUser()
  const requestInfo = useRequestInfo()
  const authorizeURL = user
    ? getDiscordAuthorizeURL(requestInfo.origin)
    : externalLinks.discord

  const categoryGroups = partitionCategories(categories)

  return (
    <>
      <HeroSection
        title="Make friends on our discord server."
        subtitle="Learn to become better developers together."
        imageBuilder={images.helmet}
        arrowUrl="#reasons-to-join"
        arrowLabel="Is this something for me?"
        action={
          <ButtonLink variant="primary" to={authorizeURL}>
            Join Discord
          </ButtonLink>
        }
      />
      <main>
        <Grid className="mb-24 lg:mb-64">
          <div className="col-span-full lg:col-span-6 lg:col-start-1">
            <div className="aspect-h-6 aspect-w-4 mb-12 lg:mb-0">
              <img
                className="rounded-lg object-cover"
                {...getImgProps(images.kentListeningAtReactRally, {
                  widths: [410, 650, 820, 1230, 1640, 2460],
                  sizes: [
                    '(max-width: 1023px) 80vw',
                    '(min-width:1024px) and (max-width:1620px) 40vw',
                    '630px',
                  ],
                  transformations: {
                    resize: {
                      type: 'fill',
                      aspectRatio: '3:4',
                    },
                  },
                })}
              />
            </div>
          </div>

          <div className="col-span-full lg:col-span-5 lg:col-start-8 lg:row-start-1">
            <H2 id="reasons-to-join" className="mb-10">
              {`Here's why you should join the server.`}
            </H2>

            <ButtonLink className="mb-32" variant="primary" to={authorizeURL}>
              Join Discord
            </ButtonLink>

            <H6 as="h3" className="mb-4">
              {`What is it?`}
            </H6>
            <Paragraph className="mb-12">
              {`
                Discord is a chat application. The KCD Community on Discord is
                community of people who want to make connections, share ideas,
                and use software to help make the world a better place.
              `}
            </Paragraph>
            <H6 as="h3" className="mb-4">
              {`Make connections and friends`}
            </H6>
            <Paragraph className="mb-12">
              {`
                We're better when we work together. Discord allows us to have
                meaningful and nuanced conversations about building software.
                If you want to ask questions or provide your own opinions, this
                discord community is for you. We'll celebrate your sucesses and
                lament your misfortunes and failures. This community is focused
                on software development primarily, but we're humans and we
                embrase that (we even have a channel on parenting!).
              `}
            </Paragraph>
            <H6 as="h3" className="mb-4">
              {`Share ideas`}
            </H6>
            <Paragraph className="mb-12">
              {`
                This community is a fantastic place to get and provide feedback
                on fun and interesting ideas. We're all motivated to use
                software to make the world better in a wide variety of ways.
                Got a project you've been working on? Want to discover
                facinating ways people are using software? This is the place to
                be.
              `}
            </Paragraph>
          </div>
        </Grid>

        <Grid className="mb-24 lg:mb-48">
          <div className="col-span-full">
            <H2 className="mb-3 lg:mt-6">
              {`Not sure what to expect from the discord?`}
            </H2>
            <H2 as="p" variant="secondary" className="mb-14">
              {`Here's some features for you in a glance. `}
            </H2>
          </div>

          <div className="col-span-full">
            <Grid rowGap nested>
              <div className="col-span-full lg:col-span-4">
                <FeatureCard
                  title="High quality people"
                  description="Our onboarding process, enforced code of conduct, and fantastic moderators keep it a friendly place to be."
                  icon={<CodeIcon size={48} />}
                />
              </div>
              <div className="col-span-full lg:col-span-4">
                <FeatureCard
                  title="Learning clubs"
                  description="Form study groups and learn together."
                  icon={<UsersIcon size={48} />}
                />
              </div>
              <div className="col-span-full lg:col-span-4">
                <FeatureCard
                  title="Meetups"
                  description="Discord-bot facilitated feature to plan virtual events (like streams) and connect with other devs."
                  icon={<CodeIcon size={48} />}
                />
              </div>

              <div className="col-span-full lg:col-span-4">
                <FeatureCard
                  title="Software Channels"
                  description="Channels on popular topics like frontend, backend, career, and more."
                  icon={<UsersIcon size={48} />}
                />
              </div>
              <div className="col-span-full lg:col-span-4">
                <FeatureCard
                  title="Life Channels"
                  description="We're not robots. We're people. And we have kids, pets, and money. Channels for those and more."
                  icon={<UsersIcon size={48} />}
                />
              </div>
              <div className="col-span-full lg:col-span-4">
                <FeatureCard
                  title="Jobs channel"
                  description="Looking for work or an engineer? You wouldn't be the first to start an employment relationship here."
                  icon={<UsersIcon size={48} />}
                />
              </div>
              <div className="col-span-full lg:col-span-4">
                <FeatureCard
                  title="EpicReact.dev Channels"
                  description="There's a channel for each of the workshops in EpicReact.dev so you can get/give a hand when you get stuck."
                  icon={<UsersIcon size={48} />}
                />
              </div>
              <div className="col-span-full lg:col-span-4">
                <FeatureCard
                  title="TestingJavaScript.com Channels"
                  description="Leveling up your testing experience? Sweet! Get and give help in these channels."
                  icon={<UsersIcon size={48} />}
                />
              </div>
              <div className="col-span-full lg:col-span-4">
                <FeatureCard
                  title="Team Channels"
                  description={
                    user
                      ? `As a member of the ${user.team.toLocaleLowerCase()} team, connect your discord account and you'll get access to the exclusive ${user.team.toLocaleLowerCase()} team channels.`
                      : 'Sign up for an account on kentcdodds.com and connect your discord account to get access to the exclusive team channels.'
                  }
                  icon={<UsersIcon size={48} />}
                />
              </div>
            </Grid>
          </div>
        </Grid>

        <Grid className="mb-24 lg:mb-64">
          <div className="hidden col-span-full mb-12 lg:block lg:col-span-4 lg:mb-0">
            <H6 as="h2">Set up your own learning club.</H6>
          </div>
          <div className="col-span-full mb-20 lg:col-span-8 lg:mb-28">
            <H2 as="p" className="mb-3">
              Learning clubs in the discord are like study groups you put
              together yourself.
            </H2>
            <H2 as="p" variant="secondary">
              Having a group of people with the same challenges will help you
              learn faster.
            </H2>
          </div>
          <div className="col-span-full mb-8 lg:col-span-4 lg:col-start-5 lg:mb-0 lg:pr-12">
            <H6 as="h3" className="mb-4">
              When we learn together, we learn better, and that&apos;s the idea.
            </H6>
            <Paragraph className="mb-16">
              Praesent eu lacus odio. Pellentesque vitae lectus tortor. Donec
              elit nunc, dictum quis condimentum in, imp erdiet at arcu.
            </Paragraph>

            <H6 as="h3" className="mb-4">
              Develop friendships with other nice learners in the community.
            </H6>
            <Paragraph>
              Praesent eu lacus odio. Pellentesque vitae lectus tortor. Donec
              elit nunc, dictum quis condimentum in, imp erdiet at arcu.
            </Paragraph>
          </div>
          <div className="col-span-full lg:col-span-4 lg:col-start-9 lg:pr-12">
            <H6 as="h3" className="mb-4">
              You have access to me (Kent) during twice-weekly office hours.
            </H6>
            <Paragraph className="mb-16">
              Praesent eu lacus odio. Pellentesque vitae lectus tortor. Donec
              elit nunc, dictum quis condimentum in, imp erdiet at arcu.
            </Paragraph>

            <H6 as="h3" className="mb-4">
              You can chat with members of the KCD Community on Discord.
            </H6>
            <Paragraph>
              Praesent eu lacus odio. Pellentesque vitae lectus tortor. Donec
              elit nunc, dictum quis condimentum in, imp erdiet at arcu.
            </Paragraph>
          </div>
        </Grid>

        <div className="mb-24 lg:mb-48">
          <Grid featured>
            <div className="flex flex-col col-span-full items-stretch mb-40 lg:col-span-5 lg:items-start lg:mb-0">
              <H2 className="mb-8">
                Enjoy community meetups in the discord server.
              </H2>
              <H2 className="mb-16" variant="secondary" as="p">
                Voice and video chats hosted and managed on the Kent C. Dodds
                Discord server.
              </H2>
              <ButtonLink variant="primary" to={authorizeURL}>
                Join Discord
              </ButtonLink>
            </div>

            <div className="col-span-full lg:col-span-5 lg:col-start-8 lg:mr-12">
              <ol className="space-y-24 lg:space-y-16">
                <NumberedPanel
                  number={1}
                  title="What are the meetups?"
                  description="Praesent eu lacus odio. Pellentesque vitae lectus tortor. Donec elit
        nunc, dictum quis condimentum in, imper diet at arcu."
                />
                <NumberedPanel
                  number={2}
                  title="So, how do I use them?"
                  description="Praesent eu lacus odio. Pellentesque vitae lectus tortor. Donec elit
        nunc, dictum quis condimentum in, imper diet at arcu."
                />
                <NumberedPanel
                  number={3}
                  title="Can I organize meetups myself or are there only curated meetups?"
                  description="Praesent eu lacus odio. Pellentesque vitae lectus tortor. Donec elit
        nunc, dictum quis condimentum in, imper diet at arcu."
                />
                <ArrowLink to="/meetups" direction="right">
                  More about meetups
                </ArrowLink>
              </ol>
            </div>
          </Grid>
        </div>

        <TestimonialSection
          testimonials={data.testimonials}
          className="mb-24 lg:mb-64"
        />

        <HeaderSection
          title="Here's a quick look at all categories."
          subTitle="Click on any category to get more info."
          className="mb-14"
        />

        <Grid className="mb-24 lg:mb-64">
          <Accordion
            collapsible
            multiple
            className="col-span-full mb-4 space-y-4 lg:col-span-6 lg:mb-0 lg:space-y-6"
          >
            {categoryGroups[0].map(category => (
              <CategoryCard key={category.number} {...category} />
            ))}
          </Accordion>
          <Accordion
            collapsible
            multiple
            className="col-span-full space-y-4 lg:col-span-6 lg:space-y-6"
          >
            {categoryGroups[1].map(category => (
              <CategoryCard key={category.number} {...category} />
            ))}
          </Accordion>
        </Grid>

        <Grid className="mb-24 lg:mb-64">
          <div className="col-span-full lg:col-span-4 lg:col-start-2">
            <img
              className="object-contain"
              {...getImgProps(images.helmet, {
                widths: [420, 512, 840, 1260, 1024, 1680, 2520],
                sizes: [
                  '(max-width: 1023px) 80vw',
                  '(min-width: 1024px) and (max-width: 1620px) 40vw',
                  '630px',
                ],
              })}
            />
          </div>

          <div className="col-span-full mt-4 lg:col-span-6 lg:col-start-7 lg:mt-0">
            <H2 className="mb-8">
              Learning is always better with like minded people, join the
              discord.
            </H2>
            <H2 variant="secondary" as="p" className="mb-16">
              Click the button below and join the community, let&apos;s get
              better together.
            </H2>
            <ButtonLink variant="primary" to={authorizeURL}>
              Join Discord
            </ButtonLink>
          </div>
        </Grid>
      </main>

      <CourseSection />
    </>
  )
}

export function ErrorBoundary({error}: {error: Error}) {
  return (
    <div>
      <h2>Error</h2>
      <pre>{error.stack}</pre>
    </div>
  )
}
