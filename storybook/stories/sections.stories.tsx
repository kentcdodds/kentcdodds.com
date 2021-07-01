import * as React from 'react'
import {AboutSection} from '@kcd/components/sections/about-section'
import {BlogSection as BlogSectionComponent} from '@kcd/components/sections/blog-section'
import {CourseSection} from '@kcd/components/sections/course-section'
import {DiscordSection} from '@kcd/components/sections/discord-section'
import {IntroductionSection} from '@kcd/components/sections/introduction-section'
import {ProblemSolutionSection} from '@kcd/components/sections/problem-solution-section'
import {HeroSection as HeroSectionComponent} from '@kcd/components/sections/hero-section'

import type {Meta} from '@storybook/react'
import * as fixtures from './fixtures'

export default {
  title: 'Sections',
  decorators: [
    Story => (
      // needed for discord section
      <div style={{padding: 48}}>
        <Story />
      </div>
    ),
  ],
} as Meta

function HeroSection() {
  return (
    // storybook adds a 48px padding all around
    <div style={{height: 'calc(100vh - 96px)'}}>
      <HeroSectionComponent />
    </div>
  )
}

const BlogSection = () => (
  <BlogSectionComponent
    articles={fixtures.articles}
    title="Most popular from the blog."
    description="
            Probably the most helpful as well."
  />
)

export {
  AboutSection,
  BlogSection,
  CourseSection,
  DiscordSection,
  IntroductionSection,
  ProblemSolutionSection,
  HeroSection,
}
