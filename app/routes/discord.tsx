import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  useAccordionItemContext,
} from '@reach/accordion'
import type {
  HeadersFunction,
  LoaderFunction,
  MetaFunction,
} from '@remix-run/node'
import {json} from '@remix-run/node'
import {Outlet, useLoaderData} from '@remix-run/react'
import {motion} from 'framer-motion'
import {ArrowLink} from '~/components/arrow-button'
import {ButtonLink} from '~/components/button'
import {FeatureCard} from '~/components/feature-card'
import {Grid} from '~/components/grid'
import {
  BriefcaseIcon,
  CodeIcon,
  DiscordLogo,
  EmojiHappyIcon,
  HeartIcon,
  LaptopIcon,
  MessageIcon,
  RocketIcon,
  TrophyIcon,
  UsersIcon,
} from '~/components/icons'
import {NumberedPanel} from '~/components/numbered-panel'
import {CourseSection} from '~/components/sections/course-section'
import {HeaderSection} from '~/components/sections/header-section'
import {HeroSection} from '~/components/sections/hero-section'
import {TestimonialSection} from '~/components/sections/testimonial-section'
import {Spacer} from '~/components/spacer'
import {H2, H5, H6, Paragraph} from '~/components/typography'
import {getGenericSocialImage, getImgProps, images} from '~/images'
import {
  getDiscordAuthorizeURL,
  getDisplayUrl,
  getUrl,
  reuseUsefulLoaderHeaders,
} from '~/utils/misc'
import {getSocialMetas} from '~/utils/seo'
import type {Testimonial} from '~/utils/testimonials.server'
import {getTestimonials} from '~/utils/testimonials.server'
import {getServerTimeHeader} from '~/utils/timing.server'
import {useRootData} from '~/utils/use-root-data'
import {externalLinks} from '../external-links'
import type {LoaderData as RootLoaderData} from '../root'

type LoaderData = {
  testimonials: Array<Testimonial>
}

export const loader: LoaderFunction = async ({request}) => {
  const timings = {}
  const testimonials = await getTestimonials({
    request,
    timings,
    subjects: ['Discord Community'],
    categories: ['community'],
  })

  const data: LoaderData = {testimonials}
  return json(data, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      Vary: 'Cookie',
      'Server-Timing': getServerTimeHeader(timings),
    },
  })
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export const meta: MetaFunction = ({parentsData}) => {
  const {requestInfo} = parentsData.root as RootLoaderData
  return {
    ...getSocialMetas({
      title: 'The KCD Community on Discord',
      description:
        'Make friends, share ideas, connect, network, and improve yourself in the KCD Community on Discord',
      url: getUrl(requestInfo),
      image: getGenericSocialImage({
        url: getDisplayUrl(requestInfo),
        featuredImage: images.helmet.id,
        words: `Join the KCD Community on Discord`,
      }),
    }),
  }
}

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
    <AccordionItem className="bg-secondary hover:bg-alt focus-within:bg-alt col-span-full flex w-full flex-col items-start rounded-lg px-8 py-12 transition lg:col-span-6 lg:pl-28 lg:pr-20">
      <CategoryCardContent {...props} />
    </AccordionItem>
  )
}

export default function Discord() {
  const data = useLoaderData<LoaderData>()
  const {requestInfo, user} = useRootData()
  const authorizeURL = user
    ? getDiscordAuthorizeURL(requestInfo.origin)
    : externalLinks.discord

  return (
    <>
      <HeroSection
        title={
          <>
            <DiscordLogo />
            {`Make friends on our discord server.`}
          </>
        }
        subtitle="Learn to become better developers together."
        imageBuilder={images.helmet}
        arrowUrl="#reasons-to-join"
        arrowLabel="Is this something for me?"
        action={<Outlet />}
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

            <ButtonLink className="mb-32" variant="primary" href={authorizeURL}>
              Join Discord
            </ButtonLink>

            <H6 as="h3" className="mb-4">
              {`What is it?`}
            </H6>
            <Paragraph className="mb-12">
              {`
                Discord is a chat application. The KCD Community on Discord is
                a community of people who want to make connections, share ideas,
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
                embrace that (we even have a channel on parenting!).
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
              {`Here are some features for you at a glance.`}
            </H2>
          </div>

          <div className="col-span-full">
            <Grid rowGap nested>
              <div className="col-span-full lg:col-span-4">
                <FeatureCard
                  title="High quality people"
                  description="Our onboarding process, enforced code of conduct, and fantastic moderators keep it a friendly place to be."
                  icon={<HeartIcon size={48} />}
                />
              </div>
              <div className="col-span-full lg:col-span-4">
                <FeatureCard
                  title="Learning clubs"
                  description="Form study groups and learn better together."
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
                  icon={<LaptopIcon size={48} />}
                />
              </div>
              <div className="col-span-full lg:col-span-4">
                <FeatureCard
                  title="Life Channels"
                  description="We're not robots. We're people. And we have kids, pets, and money. Channels for those and more."
                  icon={<EmojiHappyIcon size={48} />}
                />
              </div>
              <div className="col-span-full lg:col-span-4">
                <FeatureCard
                  title="Jobs channel"
                  description="Looking for work or an engineer? You wouldn't be the first to start an employment relationship here."
                  icon={<BriefcaseIcon size={48} />}
                />
              </div>
              <div className="col-span-full lg:col-span-4">
                <FeatureCard
                  title="EpicReact.dev Channels"
                  description="There's a channel for each of the workshops in EpicReact.dev so you can get/give a hand when you get stuck."
                  icon={<RocketIcon size={48} />}
                />
              </div>
              <div className="col-span-full lg:col-span-4">
                <FeatureCard
                  title="TestingJavaScript.com Channels"
                  description="Leveling up your testing experience? Sweet! Get and give help in these channels."
                  icon={<TrophyIcon size={48} />}
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
                  icon={<MessageIcon size={48} />}
                />
              </div>
            </Grid>
          </div>
        </Grid>

        <Grid className="mb-24 lg:mb-64">
          <div className="col-span-full mb-12 hidden lg:col-span-4 lg:mb-0 lg:block">
            <H6 as="h2">{`Set up your own learning club.`}</H6>
          </div>
          <div className="col-span-full mb-20 lg:col-span-8 lg:mb-28">
            <H2 as="p" className="mb-3">
              {`
                KCD Learning Clubs are like study groups you put together yourself.
              `}
            </H2>
            <H2 as="p" variant="secondary">
              {`
                Having a group of people with the same challenges will help you
                learn faster. The discord bot can help you find them.
              `}
            </H2>
          </div>
          <div className="col-span-full lg:col-span-4 lg:col-start-5 lg:pr-12">
            <H6 as="h3" className="mb-4">
              {`When we learn together, we learn better, and that's the idea.`}
            </H6>
            <Paragraph className="mb-16">
              {`
                Research has shown that learning is more effective when you have
                a group of people to hold you accountable. It's also more fun
                and less frustrating when you can help each other.
              `}
            </Paragraph>

            <H6 as="h3" className="mb-4">
              {`You can choose anything as your learning club topic.`}
            </H6>
            <Paragraph className="mb-16">
              {`
                A learning club can be about anything. All that's really
                required is some sort of curriculum or schedule to keep everyone
                focused on the same goal. So you can definitely choose one of
                my courses, but you could also choose something completely
                unrelated to software. The bot doesn't care and nobody's had
                trouble filling their learning club with interested members yet!
              `}
            </Paragraph>
          </div>
          <div className="col-span-full lg:col-span-4 lg:col-start-9 lg:pr-12">
            <H6 as="h3" className="mb-4">
              {`Develop friendships with other nice learners in the community.`}
            </H6>
            <Paragraph className="mb-16">
              {`
                The KCD Community on Discord is full of friendly people. When
                you put together a learning club here, in addition to learning
                better, you'll develop new friendships.
              `}
            </Paragraph>

            <H6 as="h3" className="mb-4">
              {`You have access to me (Kent) during weekly office hours.`}
            </H6>
            <Paragraph className="mb-16">
              {`
                By joining the KCD Community on Discord, you can ask questions
                that I'll answer during office hours. Often these questions come
                from discussions you and your fellow learners have during your
                learning club meetings. So if you all get stuck on the same
                thing, I'm there to help you get unstuck.
              `}
            </Paragraph>
          </div>
        </Grid>

        <div className="mb-24 lg:mb-48">
          <Grid featured>
            <div className="col-span-full mb-40 flex flex-col items-stretch lg:col-span-5 lg:mb-0 lg:items-start">
              <H2 className="mb-8">
                {`Enjoy community meetups in the discord server (and host your own!).`}
              </H2>
              <H2 className="mb-16" variant="secondary" as="p">
                Voice and video chats hosted and managed on the KCD Discord
                server.
              </H2>
              <ButtonLink variant="primary" href={authorizeURL}>
                Join Discord
              </ButtonLink>
            </div>

            <div className="col-span-full lg:col-span-5 lg:col-start-8 lg:mr-12">
              <ol className="space-y-24 lg:space-y-16">
                <NumberedPanel
                  number={1}
                  title={`What are "meetups"?`}
                  description={`It's an event. It can be about anything and have any format.`}
                />
                <NumberedPanel
                  number={2}
                  title="So, how do I use them?"
                  description={`You go to the meetups channel to see who's hosting meetups and let the bot know which you'd like to be notified about.`}
                />
                <NumberedPanel
                  number={3}
                  title="Can I organize meetups myself or are there only curated meetups?"
                  description={`Anyone can host a meetup. Simply tell the bot about what you want to do and it'll let everyone know about it in the meetups channel.`}
                />
                <ArrowLink to="/meetups" direction="right">
                  Learn more about meetups
                </ArrowLink>
              </ol>
            </div>
          </Grid>
        </div>

        {data.testimonials.length ? <Spacer size="base" /> : null}

        <TestimonialSection testimonials={data.testimonials} />

        <Spacer size="base" />

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
            <CategoryCard
              number={1}
              title="Welcome"
              description="A place to introduce yourself, read the rules, talk to the bot, and get tips about the server"
            />
            <CategoryCard
              number={2}
              title="KCD"
              description="All the stuff I'm up to goes here. You might consider adding special notification settings to the announcements channel so you don't miss anything important."
            />
            <CategoryCard
              number={3}
              title="Meetups"
              description="This is where all meetup activity happens. Go here to chat during meetups, follow meetup hosts, and sign up to be notified of new meetups."
            />
            <CategoryCard
              number={4}
              title="Clubs"
              description="Here's where you can coordinate setting up a new KCD Learning Club. Club captains also get access to a special channel for captains to talk about how to make the most of the experience for everyone."
            />
          </Accordion>
          <Accordion
            collapsible
            multiple
            className="col-span-full space-y-4 lg:col-span-6 lg:space-y-6"
          >
            <CategoryCard
              number={5}
              title="Tech"
              description={`Need to talk software? That's what this category is for. We've got your whole tech stack covered here (and if we're missing anything, that's what "general" is for 😅). And you've got career related topics here too.`}
            />
            <CategoryCard
              number={6}
              title="Life"
              description={`We're not automatons "turning coffee into code" 🙄. We're humans with lives, families, pets, preferences, money decisions, and joys. So we've got a channel to talk about that stuff.`}
            />
            <CategoryCard
              number={7}
              title="EpicReact.dev"
              description={`Are you trying to learn React? It can help a lot to have others to help you go through the material. Ask questions about the material in these channels and people will know what you're talking about and jump in to help if they can.`}
            />
            <CategoryCard
              number={8}
              title="TestingJavaScript.com"
              description={`Testing can be a tricky subject, so we've got channels for every module in TestingJavaScript.com for you to ask and answer questions about the material.`}
            />
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
              {`Life is better with friends. Find them on discord.`}
            </H2>
            <H2 variant="secondary" as="p" className="mb-16">
              {`
                Click the button below and join the community. Let's get
                better together.
              `}
            </H2>
            <ButtonLink variant="primary" href={authorizeURL}>
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
  console.error(error)
  return (
    <div>
      <h2>Error</h2>
      <pre>{error.stack}</pre>
    </div>
  )
}
