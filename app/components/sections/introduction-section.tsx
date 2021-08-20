import * as React from 'react'
import {getImgProps, images} from '~/images'
import {H2} from '../typography'
import {ArrowLink} from '../arrow-button'
import {Grid} from '../grid'
import {VideoCard} from '../video-card'

function IntroductionSection() {
  return (
    <Grid>
      <div className="col-span-full lg:col-span-4">
        <VideoCard
          img={
            <img
              {...getImgProps(images.kentRidingOnewheelOutdoorsFast, {
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
          title="Hi, I'm Kent C. Dodds"
          description="Introduction video 1:42"
        />
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
