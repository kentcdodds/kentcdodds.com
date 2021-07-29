import * as React from 'react'
import {motion} from 'framer-motion'
import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  useAccordionItemContext,
} from '@reach/accordion'
import {getDiscordAuthorizeURL} from '../utils/misc'
import {useOptionalUser, useRequestInfo} from '../utils/providers'
import {ArrowLink} from '../components/arrow-button'
import {ButtonLink} from '../components/button'
import {H2, H5, H6, Paragraph} from '../components/typography'
import {images} from '../images'
import {Grid} from '../components/grid'
import {externalLinks} from '../external-links'
import {UsersIcon} from '../components/icons/users-icon'
import {DollarIcon} from '../components/icons/dollar-icon'
import {CodeIcon} from '../components/icons/code-icon'
import {NumberedPanel} from '../components/numbered-panel'
import {TestimonialSection} from '../components/sections/testimonial-section'
import {CourseSection} from '../components/sections/course-section'
import {FeatureCard} from '../components/feature-card'
import {HeroSection} from '../components/sections/hero-section'
import {HeaderSection} from '../components/sections/header-section'

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

          <span className="absolute -left-16 top-0 flex hidden text-lg lg:block">
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

const testimonials = Array.from({length: 6}).map((_, idx) => ({
  imageUrl: `https://randomuser.me/api/portraits/lego/${idx}.jpg`,
  imageAlt: 'profile photo of person',
  author: `Person ${idx + 1}`,
  company: 'Freelance Figurine',
  testimonial:
    'Mauris auctor nulla at felis placerat, ut elementum urna commodo. Aenean et rutrum quam. Etiam odio massa.',
}))

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
  const user = useOptionalUser()
  const requestInfo = useRequestInfo()
  const authorizeURL = user
    ? getDiscordAuthorizeURL(requestInfo.origin)
    : externalLinks.discord

  const categoryGroups = partitionCategories(categories)

  return (
    <>
      <HeroSection
        title="Meet like minded people on our discord server."
        subtitle="Learn to become better developers together."
        imageUrl={images.helmet({
          resize: {type: 'crop', width: 2000, height: 2100},
        })}
        imageAlt={images.helmet.alt}
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
                src={images.kentCodingWithKody()}
                alt={images.kentCodingWithKody.alt}
              />
            </div>
          </div>

          <div className="col-span-full lg:col-span-5 lg:col-start-8 lg:row-start-1">
            <H2 id="reasons-to-join" className="mb-10">
              Here’s why you should join the server.
            </H2>

            <ButtonLink className="mb-32" variant="primary" to={authorizeURL}>
              Join Discord
            </ButtonLink>

            <H6 as="h3" className="mb-4">
              Here will go the first title..
            </H6>
            <Paragraph className="mb-12">
              Praesent eu lacus odio. Pellentesque vitae lectus tortor. Donec
              elit nunc, dictum quis condimentum in, impe rdiet at arcu.{' '}
            </Paragraph>
            <H6 as="h3" className="mb-4">
              Here will go the second title..
            </H6>
            <Paragraph className="mb-12">
              Mauris auctor nulla at felis placerat, ut elementum urna commodo.
              Aenean et rutrum quam. Etiam odio massa, congue in orci nec,
              ornare suscipit sem aenean turpis.
            </Paragraph>
            <H6 as="h3" className="mb-4">
              Here will go the third title.
            </H6>
            <Paragraph className="mb-12">
              Mauris auctor nulla at felis placerat, ut elementum urna commodo.
              Aenean et rutrum quam. Etiam odio massa, congue in orci nec,
              ornare suscipit sem aenean turpis.
            </Paragraph>
          </div>
        </Grid>

        <Grid className="mb-24 lg:mb-48">
          <div className="col-span-full">
            <H2 className="mb-3 lg:mt-6">
              Not sure what to expect from the discord?
            </H2>
            <H2 as="p" variant="secondary" className="mb-14">
              Here’s some features for you in a glance.{' '}
            </H2>
          </div>

          <div className="col-span-full">
            <Grid rowGap nested>
              {Array.from({length: 3}).map((_, idx) => (
                <React.Fragment key={idx}>
                  <div className="col-span-full lg:col-span-4">
                    <FeatureCard
                      title="Learning clubs"
                      description="Form study groups and learn together."
                      icon={<UsersIcon size={48} />}
                    />
                  </div>
                  <div className="col-span-full lg:col-span-4">
                    <FeatureCard
                      title="Free forever"
                      description="You will never have to pay for the discord."
                      icon={<DollarIcon size={48} />}
                    />
                  </div>
                  <div className="col-span-full lg:col-span-4">
                    <FeatureCard
                      title="Livestreams"
                      description="Be the first to know when livestreams are."
                      icon={<CodeIcon size={48} />}
                    />
                  </div>
                </React.Fragment>
              ))}
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
                  caption="What are the meetups?"
                  description="Praesent eu lacus odio. Pellentesque vitae lectus tortor. Donec elit
        nunc, dictum quis condimentum in, imper diet at arcu."
                />
                <NumberedPanel
                  number={2}
                  caption="So, how do I use them?"
                  description="Praesent eu lacus odio. Pellentesque vitae lectus tortor. Donec elit
        nunc, dictum quis condimentum in, imper diet at arcu."
                />
                <NumberedPanel
                  number={3}
                  caption="Can I organize meetups myself or are there only curated meetups?"
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
          testimonials={testimonials}
          className="mb-24 lg:mb-64"
        />

        <HeaderSection
          title="Here’s a quick look at all categories."
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
              src={images.helmet({
                resize: {type: 'crop', width: 2000, height: 2100},
              })}
              alt={images.helmet.alt}
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
