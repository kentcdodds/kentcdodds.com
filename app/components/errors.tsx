import {useMatches} from 'remix'
import * as React from 'react'
import errorStack from 'error-stack-parser'
import clsx from 'clsx'
import type {MdxListItem} from 'types'
import {images} from '../images'
import {HeroSection} from './sections/hero-section'
import {BlogSection} from './sections/blog-section'
import {H2, H6} from './typography'

function RedBox({error}: {error: Error}) {
  const [isVisible, setIsVisible] = React.useState(true)
  const frames = errorStack.parse(error)

  return (
    <div
      className={clsx(
        'fixed z-10 inset-0 flex items-center justify-center transition',
        {
          'opacity-0 pointer-events-none': !isVisible,
        },
      )}
    >
      <button
        className="absolute inset-0 block w-full h-full bg-black opacity-75"
        onClick={() => setIsVisible(false)}
      />
      <div className="border-lg text-primary relative mx-5vw my-16 p-12 max-h-75vh bg-red-500 rounded-lg overflow-y-auto">
        <H2>{error.message}</H2>
        <div>
          {frames.map(frame => (
            <div
              key={[frame.fileName, frame.lineNumber, frame.columnNumber].join(
                '-',
              )}
              className="pt-4"
            >
              <H6 as="div" className="pt-2">
                {frame.functionName}
              </H6>
              <div className="font-mono opacity-75">
                {frame.fileName}:{frame.lineNumber}:{frame.columnNumber}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ErrorPage({
  title,
  subtitle,
  error,
  articles,
}: {
  title: string
  subtitle: string
  error?: Error
  articles?: Array<MdxListItem>
}) {
  const props = {
    title,
    subtitle,
    imageUrl: images.bustedOnewheel(),
    imageAlt: images.bustedOnewheel.alt,
  }
  if (articles?.length) {
    Object.assign(props, {
      arrowUrl: '#articles',
      arrowLabel: 'But wait, there is more!',
    })
  }
  return (
    <main className="relative">
      {error && process.env.NODE_ENV === 'development' ? (
        <RedBox error={error} />
      ) : null}
      <HeroSection {...props} />

      {articles?.length ? (
        <>
          <div id="articles" />
          <BlogSection
            articles={articles}
            title="Looking for something to read?"
            description="Have a look at these articles."
          />
        </>
      ) : null}
    </main>
  )
}

function FourOhFour({articles}: {articles?: Array<MdxListItem>}) {
  const matches = useMatches()
  const last = matches[matches.length - 1]
  const pathname = last?.pathname

  return (
    <ErrorPage
      title="404 - Oh no, you found a page that's missing stuff."
      subtitle={`"${pathname}" is not a page on kentcdodds.com. So sorry.`}
      articles={articles}
    />
  )
}

function ServerError({
  error,
  articles,
}: {
  error?: Error
  articles?: Array<MdxListItem>
}) {
  const matches = useMatches()
  const last = matches[matches.length - 1]
  const pathname = last?.pathname

  return (
    <ErrorPage
      title="500 - Oh no, something did not go that well."
      subtitle={`"${pathname}" is currently not working. So sorry.`}
      error={error}
      articles={articles}
    />
  )
}

export {ErrorPage, ServerError, FourOhFour}
