import * as React from 'react'
import {Link} from 'remix'
import {useSearchParams} from 'react-router-dom'
import {getImgProps, images} from '~/images'
import {H2} from '../typography'
import {ArrowLink} from '../arrow-button'
import {Grid} from '../grid'
import {FullScreenYouTubeEmbed, LiteYouTubeEmbed} from '../fullscreen-yt-embed'

function IntroductionSection() {
  const [searchParams] = useSearchParams()
  return (
    <Grid>
      <div className="col-span-full lg:col-span-4">
        <FullScreenYouTubeEmbed
          autoplay={searchParams.has('autoplay')}
          img={
            <img
              {...getImgProps(images.getToKnowKentVideoThumbnail, {
                widths: [256, 550, 700, 900, 1300, 1800],
                sizes: [
                  '(max-width: 320px) 256px',
                  '(min-width: 321px) and (max-width: 1023px) 80vw',
                  '(min-width: 1024px) 410px',
                  '850px',
                ],
              })}
              className="rounded-lg object-cover"
            />
          }
          ytLiteEmbed={
            <LiteYouTubeEmbed
              // TODO: replace this with the real ID before releasing
              id="dQw4w9WgXcQ"
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
        <p className="text-secondary text-xl">{`Introduction video (2:13)`}</p>
        <Link
          className="underlined"
          to="/about?autoplay"
        >{`or, watch the full video here (8:05)`}</Link>
      </div>
      <div className="col-span-full mt-12 lg:col-span-5 lg:col-start-7 lg:mt-0">
        <H2 id="intro">
          {`Hi, I'm Kent C. Dodds. I help people make the world better through quality software.`}
        </H2>
        <H2 variant="secondary" as="p" className="mt-12">
          {`
            I'm also a big extreme sports enthusiast. When I'm not hanging out
            with my family or at the computer you can find me cruizing around on
            my onewheel or hitting the slopes on my snowboard when it's cold.
          `}
        </H2>
        <ArrowLink to="/about" direction="right" className="mt-20">
          Learn more about me
        </ArrowLink>
      </div>
    </Grid>
  )
}

export {IntroductionSection}
