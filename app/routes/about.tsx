import formatDate from 'date-fns/format'
import * as React from 'react'
import {images} from '../images'
import {H2, H3, H6, Paragraph} from '../components/typography'
import {ArrowLink} from '../components/arrow-button'
import {Grid} from '../components/grid'
import {HeaderSection} from '../components/sections/header-section'
import {FeatureCard} from '../components/feature-card'
import {UsersIcon} from '../components/icons/users-icon'
import {BlogSection} from '../components/sections/blog-section'
import {articles} from '../../storybook/stories/fixtures'
import {HeroSection} from '../components/sections/hero-section'

function AboutIndex() {
  return (
    <>
      <HeroSection
        title="Hi, I'm Kent C. Dodds, I’m a full time educator."
        subtitle="I’m an extreme sports fan. I’m an avid snowboarder and roller skater."
        imageUrl={images.snowboard()}
        imageAlt={images.snowboard.alt}
        arrowUrl="#about-me"
        arrowLabel="Get to know more about me"
      />

      <Grid className="mb-24 mt-16 lg:mb-48">
        <div className="col-span-full">
          <img
            id="about-me"
            className="rounded-lg object-cover"
            src={images.kentRidingOnewheelOutdoorsFast()}
            alt={images.kentRidingOnewheelOutdoorsFast.alt}
          />
        </div>
      </Grid>

      <Grid className="mb-24 mt-16 lg:mb-48">
        <div className="col-span-full mb-12 lg:col-span-4 lg:mb-0">
          <H6 as="h2">How I got where we are now.</H6>
        </div>
        <div className="col-span-full mb-8 lg:col-span-8 lg:mb-20">
          <H2 as="p" className="mb-8">
            I'm a software engineer and teacher. I was born in 1988 (you can do
            the math) and grew up in Idaho.
          </H2>
          <H2 className="mb-12" variant="secondary" as="p">
            After graduating High School and serving a 2 year mission in the
            Missouri Independence Mission for The Church of Jesus Christ of
            Latter-day Saints, I went to BYU where I graduated with both a
            Bachelor and Master's degree.
          </H2>

          {/* TODO: add link */}
          <ArrowLink className="mb-16" to="">
            Read my full story
          </ArrowLink>

          <div className="w-full lg:pr-12">
            {/* TODO: replace with family picture? */}
            <img
              className="w-full rounded-lg object-cover"
              src={images.kentRidingOnewheelOutdoors()}
              alt={images.kentRidingOnewheelOutdoors.alt}
            />
          </div>
        </div>

        <Paragraph className="lg:mb:0 col-span-full mb-4 lg:col-span-4 lg:col-start-5 lg:mr-12">
          Mauris auctor nulla at felis placerat, ut elementum urna commodo.
          Aenean et rutrum quam. Etiam odio massa, congue in orci nec, ornare
          suscipit sem aenean turpis.
        </Paragraph>
        <Paragraph className="col-span-full lg:col-span-4 lg:col-start-9 lg:mr-12">
          With this workshop, you'll not only learn great patterns you can use
          but also the strengths and weaknesses of each, so you know which to
          reach for to provide your custom hooks and components the flexibility
          and power you need.
        </Paragraph>
      </Grid>

      <Grid className="mb-24 lg:mb-64">
        <div className="col-span-full lg:col-span-6 lg:col-start-7">
          <div className="aspect-h-6 aspect-w-4 mb-12 lg:mb-0">
            <img
              className="rounded-lg object-cover"
              src={images.kentSnowSports()}
              alt={images.kentSnowSports.alt}
            />
          </div>
        </div>

        <div className="col-span-full lg:col-span-5 lg:col-start-1 lg:row-start-1">
          <H2 className="mb-10">Here are some of the values I live by.</H2>

          <H6 as="h3" className="mb-4">
            Here will go the first value
          </H6>
          <Paragraph className="mb-12">
            Praesent eu lacus odio. Pellentesque vitae lectus tortor. Donec elit
            nunc, dictum quis condimentum in, impe rdiet at arcu.
          </Paragraph>
          <H6 as="h3" className="mb-4">
            Here will go the second value.
          </H6>
          <Paragraph className="mb-12">
            Mauris auctor nulla at felis placerat, ut elementum urna commodo.
            Aenean et rutrum quam. Etiam odio massa, congue in orci nec, ornare
            suscipit sem aenean turpis.
          </Paragraph>
          <H6 as="h3" className="mb-4">
            Here will go the third value
          </H6>
          <Paragraph className="mb-12">
            Mauris auctor nulla at felis placerat, ut elementum urna commodo.
            Aenean et rutrum quam. Etiam odio massa, congue in orci nec, ornare
            suscipit sem aenean turpis.
          </Paragraph>
        </div>
      </Grid>

      <HeaderSection
        className="mb-16"
        ctaUrl="/talks"
        cta="See all talks"
        title="I do talks all over the world."
        subTitle="Here are some I did in the past."
      />

      <Grid className="mb-24 lg:mb-64">
        <div className="col-span-full lg:col-span-6">
          <TalkCard
            tags={['react', 'virtual', 'video']}
            date={new Date()}
            title="Managing State Management"
            description="Mauris auctor nulla at felis placerat, ut elem entum urna commodo. Aenean et rutrum quam. Etiam odio massa, congue in orci nec, ornare suscipit sem aenean turpis."
            talkUrl="/"
          />
        </div>
        <div className="col-span-full lg:col-span-6">
          <TalkCard
            tags={['react', 'virtual', 'video']}
            date={new Date()}
            title="Managing State Management"
            description="Mauris auctor nulla at felis placerat, ut elem entum urna commodo. Aenean et rutrum quam. Etiam odio massa, congue in orci nec, ornare suscipit sem aenean turpis."
            talkUrl="/"
          />
        </div>
      </Grid>

      <Grid className="mb-24 lg:mb-64">
        <div className="col-span-full lg:col-span-6 lg:col-start-1">
          <div className="aspect-h-6 aspect-w-4 mb-12 lg:mb-0">
            <img
              className="rounded-lg object-cover"
              src={images.kentSnowSports()}
              alt={images.kentSnowSports.alt}
            />
          </div>
        </div>

        <div className="col-span-full lg:col-span-4 lg:col-start-8 lg:row-start-1">
          <H2 className="mb-10 lg:mt-24">
            I have had the privilege to do a lot of cool interviews and chats.
          </H2>
          <H2 variant="secondary" as="p" className="mb-14">
            Check out my appearances on podcasts, blog and other cool stuff.
          </H2>
          <ArrowLink to="/">See all appearances</ArrowLink>
        </div>
      </Grid>

      <HeaderSection
        title="Here are some random fun facts."
        subTitle="Here will go a subtitle for the facts."
        className="mb-16"
      />

      <Grid className="mb-24 lg:mb-64" rowGap>
        {Array.from({length: 4}).map((_, idx) => (
          <div key={idx} className="col-span-full lg:col-span-6">
            <FeatureCard
              title={`Fun fact number ${idx + 1} will go here`}
              description="Suspendisse potenti. In consectetur, lorem eu tempus pretium, nisl tortor lobortis erat, in finibus orci elit a quam."
              icon={<UsersIcon size={48} />}
            />
          </div>
        ))}
      </Grid>

      <Grid className="mb-24 lg:mb-64">
        <div className="col-span-full mb-10 lg:col-span-6 lg:col-start-1 lg:mb-0">
          <img
            className="rounded-lg object-contain"
            src={images.teslaX()}
            alt={images.teslaX.alt}
          />
        </div>

        <div className="col-span-full lg:col-span-4 lg:col-start-8 lg:row-start-1">
          <H2 className="mb-10">
            Curious to more about me? Check out some other stuff i’m working on.
          </H2>
          <H2 variant="secondary" as="p" className="mb-14">
            Follow the link below to see my links page where I link to a lot
            more.
          </H2>
          <ArrowLink to="/">Let’s see those other links</ArrowLink>
        </div>
      </Grid>

      {/* TODO: replace fixtures */}
      <BlogSection
        articles={articles}
        title="Have a look at my writing."
        description="These are the most popular."
      />
    </>
  )
}

interface TalkCardProps {
  tags: string[]
  date: Date
  title: string
  description: string
  talkUrl: string
}

function TalkCard({tags, date, title, description, talkUrl}: TalkCardProps) {
  return (
    <div className="bg-secondary text-primary p-16 pt-20 w-full rounded-lg">
      <div className="flex flex-wrap -mr-4 mb-28">
        {tags.map(tag => (
          <div
            className="text-primary mb-4 mr-4 px-6 py-1 bg-gray-300 dark:bg-gray-700 rounded-full"
            key={tag}
          >
            {tag}
          </div>
        ))}
      </div>

      <Paragraph as="span" className="mb-5">
        {formatDate(date, 'PPP')}
      </Paragraph>

      <H3 className="mb-5">{title}</H3>
      <Paragraph className="mb-10">{description}</Paragraph>
      <ArrowLink to={talkUrl}>
        <span className="hidden md:inline">Have a look at this talk</span>
        <span className="md:hidden">Read more</span>
      </ArrowLink>
    </div>
  )
}
export default AboutIndex
