import * as React from 'react'
import {HeadersFunction, json, Link, LoaderFunction, useLoaderData} from 'remix'
import {shuffle} from 'lodash'
import {getImageBuilder, images, getImgProps} from '~/images'
import {H2, H3, H6, Paragraph} from '~/components/typography'
import {Grid} from '~/components/grid'
import {HeaderSection} from '~/components/sections/header-section'
import {
  getHeroImageProps,
  HeroSection,
} from '~/components/sections/hero-section'
import {GithubIcon} from '~/components/icons/github-icon'
import {TwitterIcon} from '~/components/icons/twitter-icon'
import {Spacer} from '~/components/spacer'
import {getPeople} from '~/utils/credits.server'
import type {Await} from '~/types'
import {reuseUsefulLoaderHeaders} from '~/utils/misc'
import {GlobeIcon} from '~/components/icons/globe-icon'
import {DribbbleIcon} from '~/components/icons/dribbble-icon'
import {InstagramIcon} from '~/components/icons/instagram-icon'
import {LinkedInIcon} from '~/components/icons/linkedin-icon'

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

function ProfileCard({person}: {person: LoaderData['people'][number]}) {
  return (
    <div className="relative flex flex-col w-full">
      <div className="aspect-w-3 aspect-h-4 flex-none mb-8 w-full">
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
        <div className="mb-4 text-blueGray-500 text-xl font-medium lowercase">
          {person.role}
        </div>
        <H3 className="mb-6">{person.name}</H3>
        <Paragraph className="mb-8">{person.description}</Paragraph>
      </div>

      <div className="text-secondary flex flex-none space-x-4">
        {person.website ? (
          <a
            href={person.website}
            className="hover:text-primary focus:text-primary"
          >
            <GlobeIcon size={32} title="Website" />
          </a>
        ) : null}

        {person.github ? (
          <a
            href={person.github}
            className="hover:text-primary focus:text-primary"
          >
            <GithubIcon size={32} />
          </a>
        ) : null}

        {person.twitter ? (
          <a
            href={person.twitter}
            className="hover:text-primary focus:text-primary"
          >
            <TwitterIcon size={32} />
          </a>
        ) : null}

        {person.instagram ? (
          <a
            href={person.instagram}
            className="hover:text-primary focus:text-primary"
          >
            <InstagramIcon size={32} />
          </a>
        ) : null}

        {person.dribbble ? (
          <a
            href={person.dribbble}
            className="hover:text-primary focus:text-primary"
          >
            <DribbbleIcon size={32} />
          </a>
        ) : null}

        {person.linkedin ? (
          <a
            href={person.linkedin}
            className="hover:text-primary focus:text-primary"
          >
            <LinkedInIcon size={32} />
          </a>
        ) : null}
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
            <Link to="https://github.com/kentcdodds/remix-kentcdodds">
              open source
            </Link>
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
      <Grid className="prose prose-light dark:prose-dark gap-y-20 lg:gap-y-32">
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
          <a href="https://github.com/kentcdodds/remix-kentcdodds/issues?q=is%3Aissue">
            opened issues
          </a>
          {` and even made `}
          <a href="https://github.com/kentcdodds/remix-kentcdodds/pulls?q=is%3Apr">
            pull requests
          </a>
          {` to get it ready for launch. Thank you!`}
        </Paragraph>
      </Grid>
    </>
  )
}

export default CreditsIndex
