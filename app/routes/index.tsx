import * as React from 'react'
import {Outlet} from 'react-router'
import {AboutSection} from '../components/sections/about-section'
import {BlogSection} from '../components/sections/blog-section'
import {CourseSection} from '../components/sections/course-section'
import {DiscordSection} from '../components/sections/discord-section'
import {HeroSection} from '../components/sections/hero-section'
import {IntroductionSection} from '../components/sections/introduction-section'
import {ProblemSolutionSection} from '../components/sections/problem-solution-section'
import {Spacer} from '../components/spacer'
import {articles} from '../../storybook/stories/fixtures'
import type {ArticleCardProps} from '../components/article-card'

function IndexRoute() {
  return (
    <div>
      <HeroSection />
      <Spacer size="large" />
      <IntroductionSection />
      <Spacer size="large" />
      <ProblemSolutionSection />
      <Spacer size="medium" />
      {/*  TODO: replace fixtures */}
      <BlogSection articles={articles as unknown as ArticleCardProps[]} />
      <Spacer size="large" />
      <CourseSection />
      <Spacer size="large" />
      <DiscordSection />
      <Spacer size="large" />
      <AboutSection />
      <Outlet />
    </div>
  )
}

export default IndexRoute
