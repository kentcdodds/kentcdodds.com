import * as React from 'react'
import {Navbar} from '../navbar'
import {HeroSection} from '../sections/hero-section'
import {IntroductionSection} from '../sections/introduction-section'
import {ProblemSolutionSection} from '../sections/problem-solution-section'

import {BlogSection} from '../sections/blog-section'
import * as fixtures from '../../../storybook/stories/fixtures'
import {CourseSection} from '../sections/course-section'
import {DiscordSection} from '../sections/discord-section'
import {AboutSection} from '../sections/about-section'
import {Footer} from '../footer'
import {Spacer} from '../spacer'

// NOTE: The `pages` folder is only temporary. I've placed this here, because
//   tailwind doesn't extract css from .storybook.tsx files. Which is fine, but I
//   needed a quick fix.

export function HomePage() {
  return (
    <div>
      <Navbar />
      <HeroSection />
      <Spacer size="large" />
      <IntroductionSection />
      <Spacer size="large" />
      <ProblemSolutionSection />
      <Spacer size="medium" />
      <BlogSection articles={fixtures.articles} />
      <Spacer size="large" />
      <CourseSection />
      <Spacer size="large" />
      <DiscordSection />
      <Spacer size="large" />
      <AboutSection />
      <Spacer size="medium" />
      <Footer />
    </div>
  )
}
