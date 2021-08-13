import * as React from 'react'
import {getImgProps, images} from '../../images'
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
          Hi, I&apos;m Kent C. Dodds, I'm a full time educator teaching people
          development.
        </H2>
        <H2 variant="secondary" as="p" className="mt-12">
          I&apos;m a big extreme sports enthousiast. I'm an avid snowboarder and
          rollerskater. When i'm not at the computer you can find me cruizing
          around on my one wheel.
        </H2>
        <ArrowLink to="/about" direction="right" className="mt-20">
          Learn more about me
        </ArrowLink>
      </div>
    </Grid>
  )
}

export {IntroductionSection}
