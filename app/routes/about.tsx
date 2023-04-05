import type {
  HeadersFunction,
  LinksFunction,
  LoaderFunction,
  MetaFunction,
} from '@remix-run/node'
import {json} from '@remix-run/node'
import {useLoaderData, useSearchParams} from '@remix-run/react'
import {shuffle} from 'lodash'
import type {Await, MdxListItem} from '~/types'
import {useRootData} from '~/utils/use-root-data'
import {getImgProps, getSocialImageWithPreTitle, images} from '~/images'
import {H2, H3, H6, Paragraph} from '~/components/typography'
import {ArrowLink} from '~/components/arrow-button'
import {Grid} from '~/components/grid'
import {HeaderSection} from '~/components/sections/header-section'
import {FeatureCard} from '~/components/feature-card'
import {
  UsersIcon,
  AwardIcon,
  MugIcon,
  BadgeIcon,
  BookIcon,
  FastForwardIcon,
} from '~/components/icons'
import {BlogSection} from '~/components/sections/blog-section'
import {getBlogRecommendations} from '~/utils/blog.server'
import {HeroSection} from '~/components/sections/hero-section'
import {getDisplayUrl, getUrl, reuseUsefulLoaderHeaders} from '~/utils/misc'
import {
  FullScreenYouTubeEmbed,
  LiteYouTubeEmbed,
  links as youTubeEmbedLinks,
} from '~/components/fullscreen-yt-embed'
import {getTalksAndTags} from '~/utils/talks.server'
import {getSocialMetas} from '~/utils/seo'
import type {LoaderData as RootLoaderData} from '../root'
import {getServerTimeHeader} from '~/utils/timing.server'

type LoaderData = {
  blogRecommendations: Array<MdxListItem>
  talkRecommendations: Await<ReturnType<typeof getTalksAndTags>>['talks']
}

export const loader: LoaderFunction = async ({request}) => {
  const timings = {}
  const {talks} = await getTalksAndTags({request, timings})

  const data: LoaderData = {
    blogRecommendations: await getBlogRecommendations({request, timings}),
    // they're ordered by date, so we'll grab two random of the first 10.
    talkRecommendations: shuffle(talks.slice(0, 14)).slice(0, 4),
  }
  return json(data, {
    headers: {
      'Cache-Control': 'private, max-age=3600',
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
      title: 'About Kent C. Dodds',
      description: 'Get to know Kent C. Dodds',
      keywords: 'about, kent, kent c. dodds, kent dodds',
      url: getUrl(requestInfo),
      image: getSocialImageWithPreTitle({
        url: getDisplayUrl(requestInfo),
        featuredImage: 'kent/video-stills/snowboard-butter',
        preTitle: 'Get to know',
        title: `Kent C. Dodds`,
      }),
    }),
  }
}

export const links: LinksFunction = () => {
  return youTubeEmbedLinks()
}

function AboutIndex() {
  const {blogRecommendations, talkRecommendations} = useLoaderData<LoaderData>()
  const [searchParams] = useSearchParams()
  const {requestInfo} = useRootData()
  const permalinkAutoplay = `${requestInfo.origin}/about?autoplay`

  return (
    <>
      <HeroSection
        title="Hi, I'm Kent C. Dodds, I'm a full time educator."
        subtitle="I make the world a better place by teaching people like you how to make quality software."
        imageBuilder={images.snowboard}
        arrowUrl="#about-me"
        arrowLabel="Get to know more about me"
      />

      <Grid as="main" className="mb-24 mt-16 lg:mb-48">
        <div className="col-span-full">
          <FullScreenYouTubeEmbed
            autoplay={searchParams.has('autoplay')}
            img={
              <img
                id="about-me"
                className="rounded-lg object-cover"
                {...getImgProps(images.getToKnowKentVideoThumbnail, {
                  widths: [280, 560, 840, 1100, 1300, 2600, 3900],
                  sizes: ['(min-width:1620px) 1280px', '80vw'],
                })}
              />
            }
            ytLiteEmbed={
              <LiteYouTubeEmbed
                id="sxcRxZpUJWo"
                announce="Watch"
                title="Get to know Kent C. Dodds"
                // We don't show the poster, so we use the lowest-res version
                poster="default"
                params={new URLSearchParams({
                  color: 'white',
                  playsinline: '0',
                  rel: '0',
                }).toString()}
              />
            }
          />
          <p className="text-xl text-slate-500">{`Get to know me in this full introduction video (8:05)`}</p>
          <a
            className="underlined"
            target="_blank"
            rel="noreferrer noopener"
            href={`https://twitter.com/intent/tweet?${new URLSearchParams({
              url: permalinkAutoplay,
              text: `I just watched @kentcdodds' life flash before my eyes.`,
            })}`}
          >
            {`Share this video.`}
          </a>
        </div>
      </Grid>

      <Grid className="mb-24 mt-16 lg:mb-48">
        <div className="col-span-full mb-12 lg:col-span-4 lg:mb-0">
          <H6 as="h2">{`How I got where we are now.`}</H6>
        </div>
        <div className="col-span-full mb-8 lg:col-span-8 lg:mb-20">
          <H2 as="p" className="mb-8">
            {`I was born in 1988 in Twin Falls, Idaho.`}
          </H2>
          <H2 className="mb-12" variant="secondary" as="p">
            {`
              After graduating High School and serving a 2 year mission in the
              Missouri Independence Mission for The Church of Jesus Christ of
              Latter-day Saints, I went to BYU where I graduated with a Master
              of Science in Information Systems degree in 2014.
            `}
          </H2>

          <ArrowLink className="mb-16" to="/blog/2010s-decade-in-review">
            {`Read my full story`}
          </ArrowLink>

          <div className="w-full lg:pr-12">
            <img
              className="w-full rounded-lg object-cover"
              {...getImgProps(images.kentWorkingInNature, {
                widths: [512, 840, 1024, 1680, 2520],
                sizes: [
                  '(max-width: 1023px) 80vw',
                  '(min-width: 1024px) and (max-width: 1620px) 50vw',
                  '800px',
                ],
              })}
            />
          </div>
        </div>

        <Paragraph className="lg:mb:0 col-span-full mb-4 lg:col-span-4 lg:col-start-5 lg:mr-12">
          {`
            Early on in my career I decided I wanted to be an expert in
            JavaScript. So I set my mind on mastering the world's most popular
            programming language. I spent countless hours writing JavaScript
            for the companies I worked for as well as in the evenings for open
            source and other side projects. Eventually I even represented PayPal
            on the TC-39 (the committee responsible for standardizing the
            JavaScript language). I feel like I achieved my goal of becoming an
            expert in JavaScript, but I do need to keep up just like everyone
            else, which is an enjoyable challenge.
          `}
        </Paragraph>
        <Paragraph className="col-span-full lg:col-span-4 lg:col-start-9 lg:mr-12">
          {`
            I've also always been excited about sharing what I know with others.
            When I was in school, I signed up to be a tutor for my classmates
            and once I even got Firebase to sponsor pizza for me to give an
            informal workshop about Angular.js to my fellow students. I was a
            speaker at the first meetup I ever attended, and I've now delivered
            over a hundred talks on topics including JavaScript, React, Testing,
            Careers, and more. One of my talks got noticed by egghead and I was
            invited to turn that talk into an egghead course. The rest is
            history!
          `}
        </Paragraph>
      </Grid>

      <Grid className="mb-24 lg:mb-64">
        <div className="col-span-full lg:col-span-6 lg:col-start-7">
          <div className="mb-12 lg:mb-0">
            <img
              className="rounded-lg object-cover"
              {...getImgProps(images.happySnowboarder, {
                widths: [512, 650, 840, 1024, 1300, 1680, 2000, 2520],
                sizes: [
                  '(max-width: 1023px) 80vw',
                  '(min-width: 1024px) and (max-width: 1620px) 40vw',
                  '650px',
                ],
                transformations: {
                  gravity: 'faces',
                  resize: {
                    type: 'fill',
                    aspectRatio: '3:4',
                  },
                },
              })}
            />
          </div>
        </div>

        <div className="col-span-full lg:col-span-5 lg:col-start-1 lg:row-start-1">
          <H2 className="mb-10">Here are some of the values I live by.</H2>

          <H6 as="h3" className="mb-4">
            {`Kindness`}
          </H6>
          <Paragraph className="mb-12">
            {`
              You can be the smartest and most skilled software engineer in the
              world, but if you're not kind to those with whom you interact,
              you'll never reach your full potential and you'll always be
              chasing the next thing to bring you happiness in life. Be kind.
            `}
          </Paragraph>
          <H6 as="h3" className="mb-4">
            {`Share knowledge`}
          </H6>
          <Paragraph className="mb-12">
            {`
              One of the biggest things that has helped me learn is by
              committing myself to sharing what I know with others. Between
              podcasts, blog posts, talks, and workshops, I force myself into
              situations where I have to be accountable to those I'm teaching
              to really know my stuff. And as a result, a lot of people have
              learned from me as well.
            `}
          </Paragraph>
          <H6 as="h3" className="mb-4">
            {`Collaborate with others`}
          </H6>
          <Paragraph className="mb-12">
            {`
              I've worked with a ton of developers in my role as a team member
              at companies I've worked at as well as in the open source
              community. I've found it to be invaluable to collaborate well with
              others. I value giving credit where it is due and celebrating
              the successes of others with them. We can accomplish much more
              together than separately.
            `}
          </Paragraph>
        </div>
      </Grid>

      <HeaderSection
        className="mb-16"
        ctaUrl="/talks"
        cta="See all talks"
        title="I do talks all over the world."
        subTitle="Here are a couple recent ones."
      />

      <Grid className="mb-24 gap-5 lg:mb-64">
        <div className="col-span-full mb-12 lg:mb-20">
          <img
            id="about-me"
            className="rounded-lg object-cover"
            {...getImgProps(images.kentSpeakingAllThingsOpen, {
              widths: [280, 560, 840, 1100, 1300, 2600, 3900],
              sizes: ['(min-width:1620px) 1280px', '80vw'],
            })}
          />
        </div>
        {talkRecommendations.map(talk => (
          <div key={talk.slug} className="col-span-full lg:col-span-6">
            <TalkCard
              tags={talk.tags}
              dateDisplay={talk.deliveries[0]?.dateDisplay}
              title={talk.title}
              talkUrl={`/talks/${talk.slug}`}
            />
          </div>
        ))}
      </Grid>

      <Grid className="mb-24 lg:mb-64">
        <div className="col-span-full lg:col-span-6 lg:col-start-1">
          <div className="mb-12 lg:mb-0">
            <img
              className="rounded-lg object-cover"
              {...getImgProps(images.microphoneWithHands, {
                widths: [512, 650, 840, 1024, 1300, 1680, 2000, 2520],
                sizes: [
                  '(max-width: 1023px) 80vw',
                  '(min-width: 1024px) and (max-width: 1620px) 40vw',
                  '650px',
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

        <div className="col-span-full lg:col-span-4 lg:col-start-8 lg:row-start-1">
          <H2 className="mb-10 lg:mt-24">
            {`I have had the privilege to do a lot of cool interviews and chats.`}
          </H2>
          <H2 variant="secondary" as="p" className="mb-14">
            {`Check out my appearances on podcasts, blog and other cool stuff.`}
          </H2>
          <ArrowLink to="/appearances">See all appearances</ArrowLink>
        </div>
      </Grid>

      <HeaderSection
        title="Here are some random fun facts."
        subTitle="Some unique things about me."
        className="mb-16"
      />

      <Grid className="mb-24 lg:mb-64" rowGap>
        <div className="col-span-full lg:col-span-6">
          <FeatureCard
            title="I have 11 brothers and sisters"
            description="Yup! There are 6 boys and 6 girls in my family. I'm second to last. No twins. We all have the same mom and dad. Yes my parents are super heros 🦸‍♀️ 🦸"
            icon={<UsersIcon size={48} />}
          />
        </div>
        <div className="col-span-full lg:col-span-6">
          <FeatureCard
            title="I can still do a backflip"
            description="When I was a kid, I competed in various gymnastics events. As of 2021, I can still do a backflip 🤸‍♂️"
            icon={<AwardIcon size={48} />}
          />
        </div>
        <div className="col-span-full lg:col-span-6">
          <FeatureCard
            title="I've never had a sip of alcohol or coffee"
            description="It's a religious thing. That said, I do appreciate offers to go out for drinks! I'll just have a Hawaiian Punch thank you 🧃"
            icon={<MugIcon size={48} />}
          />
        </div>
        <div className="col-span-full lg:col-span-6">
          <FeatureCard
            title="I'm an Eagle Scout"
            description="When I was 14, I got my friends and scout leaders to plant 15 trees in a new park in town for my eagle scout project 🦅"
            icon={<BadgeIcon size={48} />}
          />
        </div>
        <div className="col-span-full lg:col-span-6">
          <FeatureCard
            title="I've written a novel"
            description="In 2018, I wanted to get good at telling stories, so I participated in National Novel Writing Month and wrote a 50k word novel in one month 📘"
            icon={<BookIcon size={48} />}
          />
        </div>
        <div className="col-span-full lg:col-span-6">
          <FeatureCard
            title="I listen to books and podcasts at 3x"
            description="I've worked my way up to 3x listening so I could listen to more. So far I've saved ~100 days of listening by doing this 🎧"
            icon={<FastForwardIcon size={48} />}
          />
        </div>
      </Grid>

      <Grid className="mb-24 lg:mb-64">
        <div className="col-span-full mb-10 lg:col-span-6 lg:col-start-1 lg:mb-0">
          <img
            className="rounded-lg object-contain"
            {...getImgProps(images.teslaY, {
              widths: [420, 512, 840, 1260, 1024, 1680, 2520],
              sizes: [
                '(max-width: 1023px) 80vw',
                '(min-width: 1024px) and (max-width: 1620px) 40vw',
                '630px',
              ],
            })}
          />
        </div>

        <div className="col-span-full lg:col-span-4 lg:col-start-8 lg:row-start-1">
          <H2 className="mb-10">{`Curious to know the stuff I use?`}</H2>
          <H2 variant="secondary" as="p" className="mb-14">
            {`I keep a "uses" page updated with the stuff I use.`}
          </H2>
          <ArrowLink to="/uses">{`Check out the uses page`}</ArrowLink>
        </div>
      </Grid>

      <BlogSection
        articles={blogRecommendations}
        title="Have a look at my writing."
        description="These are the most popular."
      />
    </>
  )
}

function TalkCard({
  tags,
  dateDisplay,
  title,
  talkUrl,
}: {
  tags: string[]
  dateDisplay?: string
  title: string
  talkUrl: string
}) {
  return (
    <div className="bg-secondary text-primary flex h-full w-full flex-col justify-between rounded-lg p-16 pt-20">
      <div>
        <div className="-mr-4 mb-12 flex flex-wrap">
          {tags.map(tag => (
            <div
              className="text-primary mb-4 mr-4 rounded-full bg-gray-300 px-6 py-1 dark:bg-gray-700"
              key={tag}
            >
              {tag}
            </div>
          ))}
        </div>

        <Paragraph as="span" className="mb-5">
          {dateDisplay ?? 'TBA'}
        </Paragraph>

        <H3 className="mb-5">{title}</H3>
      </div>
      <ArrowLink to={talkUrl}>
        <span className="hidden md:inline">Have a look at this talk</span>
        <span className="md:hidden">Read more</span>
      </ArrowLink>
    </div>
  )
}
export default AboutIndex
