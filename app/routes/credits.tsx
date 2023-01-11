import type {
  HeadersFunction,
  LoaderFunction,
  MetaFunction,
} from '@remix-run/node'
import {json} from '@remix-run/node'
import {useLoaderData} from '@remix-run/react'
import {shuffle} from 'lodash'
import * as React from 'react'
import {Grid} from '~/components/grid'
import {
  BehanceIcon,
  CodepenIcon,
  DribbbleIcon,
  GithubIcon,
  GlobeIcon,
  InstagramIcon,
  LinkedInIcon,
  TwitchIcon,
  TwitterIcon,
} from '~/components/icons'
import {HeaderSection} from '~/components/sections/header-section'
import {
  getHeroImageProps,
  HeroSection,
} from '~/components/sections/hero-section'
import {Spacer} from '~/components/spacer'
import {H2, H3, H6, Paragraph} from '~/components/typography'
import {
  getImageBuilder,
  getImgProps,
  getSocialImageWithPreTitle,
  images,
} from '~/images'
import type {Await} from '~/types'
import {getPeople} from '~/utils/credits.server'
import {getDisplayUrl, getUrl, reuseUsefulLoaderHeaders} from '~/utils/misc'
import {getSocialMetas} from '~/utils/seo'
import type {LoaderData as RootLoaderData} from '../root'

export type LoaderData = {people: Await<ReturnType<typeof getPeople>>}

export const loader: LoaderFunction = async ({request}) => {
  const people = await getPeople({request})
  const data: LoaderData = {people: shuffle(people)}

  return json(data, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      Vary: 'Cookie',
    },
  })
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export const meta: MetaFunction = ({parentsData}) => {
  const {requestInfo} = parentsData.root as RootLoaderData
  const domain = new URL(requestInfo.origin).host
  return {
    ...getSocialMetas({
      title: `Who built ${domain}`,
      description: `It took a team of people to create ${domain}. This page will tell you a little bit about them.`,
      url: getUrl(requestInfo),
      image: getSocialImageWithPreTitle({
        url: getDisplayUrl(requestInfo),
        featuredImage: images.kentCodingOnCouch.id,
        title: `The fantastic people who built ${domain}`,
        preTitle: 'Check out these people',
      }),
    }),
  }
}

type Person = LoaderData['people'][number]
type Socials = keyof Omit<
  Person,
  'name' | 'role' | 'cloudinaryId' | 'description'
>

const icons: Record<Socials, React.ReactElement> = {
  website: <GlobeIcon title="Website" />,
  github: <GithubIcon />,
  twitter: <TwitterIcon />,
  instagram: <InstagramIcon />,
  dribbble: <DribbbleIcon />,
  codepen: <CodepenIcon />,
  twitch: <TwitchIcon />,
  linkedin: <LinkedInIcon />,
  behance: <BehanceIcon />,
} as const

function ProfileCard({person}: {person: Person}) {
  return (
    <div className="relative flex w-full flex-col">
      <div className="aspect-w-3 aspect-h-4 mb-8 w-full flex-none">
        <img
          className="rounded-lg object-cover"
          {...getImgProps(getImageBuilder(person.cloudinaryId), {
            widths: [280, 560, 840, 1100, 1300, 1650],
            sizes: [
              '(max-width:639px) 80vw',
              '(min-width:640px) and (max-width:1023px) 40vw',
              '(min-width:1024px) and (max-width:1620px) 25vw',
              '410px',
            ],
          })}
        />
      </div>

      <div className="flex-auto">
        <div className="mb-4 text-xl font-medium lowercase text-slate-500">
          {person.role}
        </div>
        <H3 className="mb-6">{person.name}</H3>
        <Paragraph className="mb-8">{person.description}</Paragraph>
      </div>

      <div className="text-secondary flex flex-none space-x-4">
        {Object.entries(icons).map(([key, Icon]) => {
          const url = person[key as Socials]
          return url ? (
            <a
              key={key}
              href={url}
              className="hover:text-primary focus:text-primary"
            >
              {React.cloneElement(Icon, {size: 32})}
            </a>
          ) : null
        })}
      </div>
    </div>
  )
}

function CreditsIndex() {
  const data = useLoaderData<LoaderData>()
  return (
    <>
      <HeroSection
        title="Curious to see all the people who helped out making this website?"
        subtitle="Start scrolling to learn more about everyone involved."
        image={
          <img
            className="rounded-lg"
            {...getHeroImageProps(images.kentCodingOnCouch, {
              resize: {
                aspectRatio: '3:4',
                type: 'crop',
              },
              gravity: 'face',
            })}
          />
        }
        arrowUrl="#intro"
        arrowLabel="Get to know more here"
      />

      <Grid className="mb-24 lg:mb-64">
        <div className="col-span-full mb-12 lg:col-span-4 lg:mb-0">
          <H6 id="intro">{`Producing this site was a team effort`}</H6>
        </div>
        <div className="col-span-full mb-8 lg:col-span-8 lg:mb-20">
          <H2 className="mb-8">
            {`
              kentcdodds.com is more than just my developer portfolio. It's a
              place for me to share my thoughts, ideas, and experiences as
              well as the thoughts, ideas, and experiences of others (yourself
              included). It's a full fleged–`}
            <a
              target="_blank"
              rel="noreferrer noopener"
              href="https://github.com/kentcdodds/kentcdodds.com"
            >
              open source
            </a>
            {`–web application.`}
          </H2>
          <H2 variant="secondary" as="p">
            <a href="https://egghead.io?af=5236ad">egghead.io</a>
            {`
              and I have collaborated to make this website a
              truly high-quality and delightful learning experience for you and
              others.
            `}
          </H2>
        </div>
        <Paragraph className="lg:mb:0 col-span-full mb-4 lg:col-span-4 lg:col-start-5 lg:mr-12">
          {`
            It would be impossible to list everyone who has contributed to the
            creation of this website (I'd have to list my parents, teachers,
            etc, etc, etc).
          `}
        </Paragraph>
        <Paragraph className="col-span-full lg:col-span-4 lg:col-start-9 lg:mr-12">
          {`
            But hopefully with this page, you can get an idea of the primary
            group of folks who worked to make this site great.
          `}
        </Paragraph>
      </Grid>

      <HeaderSection
        className="mb-16"
        title="Everyone that helped out."
        subTitle="In no particular order."
      />

      <Grid className="gap-y-20 lg:gap-y-32">
        {data.people.map(person => (
          <div key={person.name} className="col-span-4">
            <ProfileCard person={person} />
          </div>
        ))}
      </Grid>

      <Spacer size="base" />

      <HeaderSection
        title="Shout-outs"
        subTitle="Some other awesome folks"
        className="mb-16"
      />
      <Grid className="prose prose-light gap-y-20 dark:prose-dark lg:gap-y-32">
        <Paragraph className="col-span-4">
          <a href="https://twitter.com/ryanflorence">Ryan Florence</a>
          {` and other friends at `}
          <a href="https://remix.run">Remix.run</a>
          {`
            were super helpful as I was figuring out the best way to rewrite my
            website in this new technology with completely new and improved
            features that far exceeded what my website had been previously.
          `}
        </Paragraph>
        <Paragraph className="col-span-4">
          The syntax highlighting theme in blog posts is inspired by{' '}
          <a href="https://twitter.com/sarah_edo">Sarah Drasner&apos;s</a>{' '}
          <a href="https://github.com/sdras/night-owl-vscode-theme">
            Night Owl
          </a>
          .
        </Paragraph>
        <Paragraph className="col-span-4">
          {`
            To prepare for the launch of this website, a number of terrific
            folks reviewed and
          `}
          <a href="https://github.com/kentcdodds/kentcdodds.com/issues?q=is%3Aissue">
            opened issues
          </a>
          {` and even made `}
          <a href="https://github.com/kentcdodds/kentcdodds.com/pulls?q=is%3Apr">
            pull requests
          </a>
          {` to get it ready for launch. Thank you!`}
        </Paragraph>
        <Paragraph className="col-span-4">
          {`The folks at `}
          <a href="https://fly.io">Fly.io</a>
          {`
            were an enormous help in getting me off the ground with hosting the
            site and databases. The backend is totally not my domain and they
            seriously helped me be successful.
          `}
        </Paragraph>
      </Grid>
    </>
  )
}

export default CreditsIndex
