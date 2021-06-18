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

// NOTE: The `pages` folder is only temporary. I've placed this here, because
//   tailwind doesn't extract css from .storybook.tsx files. Which is fine, but I
//   needed a quick fix.

// TODO: I'm not sure if we should add the "spacer elements", or add the spacing
//  inside the sections. There is a slight variation between element paddings,
//  which might make it tricky to get it right when embedding inside sections,
//  when sections turn out to be reused. Let's decide later what to do with this.

export function HomePage() {
  return (
    <div>
      <div className="flex flex-col lg:h-screen">
        <div className="flex-none">
          <Navbar />
        </div>

        <div className="flex-auto pb-12">
          <HeroSection />
        </div>
      </div>

      <div className="h-64" />
      <IntroductionSection />
      <div className="h-64" />
      <ProblemSolutionSection />
      <div className="h-48" />
      <BlogSection articles={fixtures.articles} />
      <div className="h-64" />
      <CourseSection />
      <div className="h-64" />
      <DiscordSection />
      <div className="h-64" />
      <AboutSection />
      <div className="h-48" />
      <Footer />
    </div>
  )
}
