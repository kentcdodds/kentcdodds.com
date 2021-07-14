import * as React from 'react'
import {images} from '../../images'
import {H2} from '../typography'
import {ArrowButton} from '../arrow-button'
import {Grid} from '../grid'
import {VideoCard} from '../video-card'

function IntroductionSection() {
  return (
    <Grid>
      <div className="col-span-full lg:col-span-4">
        <VideoCard
          imageUrl={images.kentRidingOnewheelOutdoorsFast()}
          imageAlt={images.kentRidingOnewheelOutdoorsFast.alt}
          videoUrl="/video.mp4"
          title="Hi, I'm Kent C. Dodds"
          description="Introduction video 1:42"
        />
      </div>
      <div className="col-span-full mt-12 space-y-12 lg:col-span-5 lg:col-start-7 lg:mt-0">
        <H2 id="intro">
          {`Hi, I'm Kent C. Dodds, I’m a full time educator teaching people development.`}
        </H2>
        <H2 variant="secondary" as="p">
          {`I'm a big extreme sports enthousiast. I’m an avid snowboarder and rollerskater. When i’m not at the computer you can find me cruizing around on my one wheel.`}
        </H2>
        <ArrowButton direction="right">Learn more about me</ArrowButton>
      </div>
    </Grid>
  )
}

export {IntroductionSection}
