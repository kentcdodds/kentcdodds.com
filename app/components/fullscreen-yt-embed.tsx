import Dialog from '@reach/dialog'
import * as React from 'react'
import {PlayIcon} from './icons/play-icon'
import {PlusIcon} from './icons/plus-icon'

function YouTubeEmbed({
  onCloseClick,
  ytLiteEmbed,
}: {
  onCloseClick: React.MouseEventHandler<HTMLButtonElement>
  ytLiteEmbed: React.ReactNode
}) {
  const embedContainer = React.useRef<HTMLDivElement>(null)
  React.useLayoutEffect(() => {
    if (!embedContainer.current) return
    const ytLite = embedContainer.current.querySelector('.yt-lite')
    if (!(ytLite instanceof HTMLElement)) return
    ytLite.click()
  }, [])

  return (
    <div className="fixed inset-0 px-5vw bg-black">
      <button
        aria-label="close video"
        onClick={onCloseClick}
        className="absolute z-50 right-4 top-8 text-white focus:outline-none transform rotate-45 hover:scale-150 focus:scale-150"
      >
        <PlusIcon />
      </button>
      <div
        className="flex flex-col justify-center w-full h-full"
        ref={embedContainer}
      >
        {ytLiteEmbed}
      </div>
    </div>
  )
}

function FullScreenYouTubeEmbed({
  img,
  autoplay = false,
  ytLiteEmbed,
}: {
  img: React.ReactElement
  autoplay?: boolean
  ytLiteEmbed: React.ReactElement
}) {
  const [showPlayer, setShowPlayer] = React.useState(autoplay)
  return (
    <>
      <Dialog
        isOpen={showPlayer}
        onDismiss={() => setShowPlayer(false)}
        aria-label={`Watch ${ytLiteEmbed.props.title ?? 'the video'}`}
      >
        <YouTubeEmbed
          onCloseClick={() => setShowPlayer(false)}
          ytLiteEmbed={ytLiteEmbed}
        />
      </Dialog>

      {showPlayer ? null : (
        <button className="group relative" onClick={() => setShowPlayer(true)}>
          {img}
          <span className="absolute left-0 top-0 w-full h-full">
            <span className="flex items-center justify-center w-full h-full">
              <span className="motion-safe:group-hover:scale-110 motion-safe:group-focus:scale-110 motion-safe:group-active:scale-125 group-hover:opacity-100 group-focus:opacity-100 opacity-70 transform transition-all">
                <PlayIcon />
              </span>
            </span>
          </span>
        </button>
      )}
    </>
  )
}

export {FullScreenYouTubeEmbed}
export {default as LiteYouTubeEmbed} from 'react-lite-youtube-embed'

export const links = () => {
  // for the youtube embed
  return [
    {rel: 'preconnect', href: 'https://www.youtube-nocookie.com'},
    {rel: 'preconnect', href: 'https://www.google.com'},
  ]
}
