import {useMatches} from '@remix-run/react'
import * as React from 'react'
import errorStack from 'error-stack-parser'
import clsx from 'clsx'
import type {MdxListItem} from '~/types'
import {HeroSection} from './sections/hero-section'
import type {HeroSectionProps} from './sections/hero-section'
import {BlogSection} from './sections/blog-section'
import {H2, H6} from './typography'
import {Grimmacing, MissingSomething} from './kifs'

function RedBox({error}: {error: Error}) {
  const [isVisible, setIsVisible] = React.useState(true)
  const frames = errorStack.parse(error)

  return (
    <div
      className={clsx(
        'fixed inset-0 z-10 flex items-center justify-center transition',
        {
          'pointer-events-none opacity-0': !isVisible,
        },
      )}
    >
      <button
        className="absolute inset-0 block h-full w-full bg-black opacity-75"
        onClick={() => setIsVisible(false)}
      />
      <div className="border-lg text-primary relative mx-5vw my-16 max-h-75vh overflow-y-auto rounded-lg bg-red-500 p-12">
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
  error,
  articles,
  heroProps,
}: {
  error?: Error
  articles?: Array<MdxListItem>
  heroProps: HeroSectionProps
}) {
  if (articles?.length) {
    Object.assign(heroProps, {
      arrowUrl: '#articles',
      arrowLabel: 'But wait, there is more!',
    })
  }
  return (
    <>
      <noscript>
        <div
          style={{
            backgroundColor: 'black',
            color: 'white',
            padding: 30,
          }}
        >
          <h1 style={{fontSize: '2em'}}>{heroProps.title}</h1>
          <p style={{fontSize: '1.5em'}}>{heroProps.subtitle}</p>
          <small>
            Also, this site works much better with JavaScript enabled...
          </small>
        </div>
      </noscript>
      <main className="relative">
        {error && process.env.NODE_ENV === 'development' ? (
          <RedBox error={error} />
        ) : null}
        <HeroSection {...heroProps} />

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
    </>
  )
}

function FourOhFour({articles}: {articles?: Array<MdxListItem>}) {
  const matches = useMatches()
  const last = matches[matches.length - 1]
  const pathname = last?.pathname

  return (
    <ErrorPage
      articles={articles}
      heroProps={{
        title: "404 - Oh no, you found a page that's missing stuff.",
        subtitle: `"${pathname}" is not a page on kentcdodds.com. So sorry.`,
        image: <MissingSomething className="rounded-lg" aspectRatio="3:4" />,
      }}
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
      error={error}
      articles={articles}
      heroProps={{
        title: '500 - Oh no, something did not go well.',
        subtitle: `"${pathname}" is currently not working. So sorry.`,
        image: <Grimmacing className="rounded-lg" aspectRatio="3:4" />,
      }}
    />
  )
}

export {ErrorPage, ServerError, FourOhFour}
