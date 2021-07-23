import * as React from 'react'
import {images} from '../images'
import {H2, H3, H6, Paragraph} from '../components/typography'
import {Grid} from '../components/grid'
import {HeaderSection} from '../components/sections/header-section'
import {HeroSection} from '../components/sections/hero-section'
import {GithubIcon} from '../components/icons/github-icon'
import {TwitterIcon} from '../components/icons/twitter-icon'
import {Spacer} from '../components/spacer'

interface ProfileCardProps {
  name: string
  imageUrl: string
  imageAlt: string
  role: string
  description: string
  github?: string
  twitter?: string
}

function ProfileCard({
  name,
  imageUrl,
  imageAlt,
  role,
  description,
  github,
  twitter,
}: ProfileCardProps) {
  return (
    <div className="relative flex flex-col w-full">
      <div className="aspect-w-3 aspect-h-4 flex-none mb-8 w-full">
        <img
          alt={imageAlt}
          className="rounded-lg object-cover"
          src={imageUrl}
        />
      </div>

      <div className="flex-auto">
        <div className="mb-4 text-blueGray-500 text-xl font-medium">{role}</div>
        <H3 className="mb-6">{name}</H3>
        <Paragraph className="mb-8">{description}</Paragraph>
      </div>

      <div className="text-secondary flex flex-none space-x-4">
        {github ? (
          <a href={github}>
            <GithubIcon />
          </a>
        ) : null}

        {twitter ? (
          <a href={twitter}>
            <TwitterIcon />
          </a>
        ) : null}
      </div>
    </div>
  )
}

const people = Array.from({length: 12}).map((_, idx) => ({
  name: 'Kent C. Dodds',
  imageUrl: `${images.kentProfile()}?k=${idx}`,
  imageAlt: 'Kent C. Dodds',
  role: 'a bit of everything',
  description:
    'Mauris auctor nulla at felis placerat, ut elementum urna commodo. Aenean et rutrum quam. Etiam odio massa, congue in orci nec, ornare suscipit sem aenean turpis.',
  github: 'https://github.com',
  twitter: 'https://twitter.com',
}))

function CreditsIndex() {
  return (
    <>
      <HeroSection
        title="Curious to see all the people who helped out making this website?"
        subtitle="Start scrolling to learn more about everyone involved."
        arrowUrl="#intro"
        arrowLabel="Get to know more here"
      />

      <Grid className="mb-24 lg:mb-64">
        <div className="col-span-full mb-12 lg:col-span-4 lg:mb-0">
          <H6 id="intro">Small intro for this page</H6>
        </div>
        <div className="col-span-full mb-8 lg:col-span-8 lg:mb-20">
          <H2 className="mb-8">
            Kentcdodds.com is the best place for web developers of all
            experience levels to learn development from the basics through to
            advanced concepts and building a real-world application.
          </H2>
          <H2 variant="secondary" as="p">
            Kent C. Dodds and egghead have collaborated to make this website a
            truly high-quality and delightful learning experience for you and
            others.
          </H2>
        </div>
        <Paragraph className="lg:mb:0 col-span-full mb-4 lg:col-span-4 lg:col-start-5 lg:mr-12">
          Mauris auctor nulla at felis placerat, ut elementum urna commodo.
          Aenean et rutrum quam. Etiam odio massa, congue in orci nec, ornare
          suscipit sem aenean turpis.
        </Paragraph>
        <Paragraph className="col-span-full lg:col-span-4 lg:col-start-9 lg:mr-12">
          With this workshop, you&apos;ll not only learn great patterns you can
          use but also the strengths and weaknesses of each, so you know which
          to reach for to provide your custom hooks and components the
          flexibility and power you need.
        </Paragraph>
      </Grid>

      <HeaderSection
        className="mb-16"
        title="Everyone that helped out."
        subTitle="With some extra information."
      />

      <Grid className="gap-y-20 lg:gap-y-32">
        {people.map(person => (
          <div key={person.imageUrl} className="col-span-4">
            <ProfileCard {...person} />
          </div>
        ))}
      </Grid>

      <Spacer size="medium" />

      <HeaderSection
        title="Shout-outs"
        subTitle="Some other awesome folks"
        className="mb-16"
      />
      <Grid className="prose prose-light dark:prose-dark gap-y-20 lg:gap-y-32">
        <Paragraph className="col-span-4">
          The syntax highlighting theme in blog posts is inspired by{' '}
          <a href="https://twitter.com/sarah_edo">Sarah Drasner&apos;s</a>{' '}
          <a href="https://github.com/sdras/night-owl-vscode-theme">
            Night Owl
          </a>
          .
        </Paragraph>
      </Grid>
    </>
  )
}

export default CreditsIndex
