import {useMatches} from 'remix'
import * as React from 'react'
import {images} from '../images'
import {articles} from '../../storybook/stories/fixtures'
import {HeroSection} from './sections/hero-section'
import {BlogSection} from './sections/blog-section'

function ErrorPage({title, subtitle}: {title: string; subtitle: string}) {
  return (
    <main>
      <HeroSection
        title={title}
        subtitle={subtitle}
        imageUrl={images.bustedOnewheel()}
        imageAlt={images.bustedOnewheel.alt}
        arrowUrl="#articles"
        arrowLabel="But wait, there is more!"
      />

      {/* TODO: remove fixtures, do something smart */}
      <div id="articles" />
      <BlogSection
        articles={articles}
        title="Looking for something to read?"
        description="Have a look at these articles."
      />
    </main>
  )
}

function FourOhFour() {
  const matches = useMatches()
  const last = matches[matches.length - 1]
  const pathname = last?.pathname

  return (
    <ErrorPage
      title="404 - Oh no, you found a page that's missing stuff."
      subtitle={`"${pathname}" is not a page on kentcdodds.com. So sorry.`}
    />
  )
}

function ServerError() {
  const matches = useMatches()
  const last = matches[matches.length - 1]
  const pathname = last?.pathname

  return (
    <ErrorPage
      title="500 - Oh no, something did not go that well."
      subtitle={`"${pathname}" is currently not working. So sorry.`}
    />
  )
}

export {ErrorPage, ServerError, FourOhFour}
