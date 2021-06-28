import * as React from 'react'
import {H2} from '../typography'
import {ArrowButton} from '../arrow-button'
import {Grid} from '../grid'
import {VideoCard} from '../video-card'

function IntroductionSection() {
  return (
    <Grid>
      <div className="col-span-full lg:col-span-4">
        {/* TODO: replace imageUrl placeholder */}
        <VideoCard
          imageUrl="https://images.unsplash.com/photo-1624736712422-70e8302f6c39?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1525&q=80"
          imageAlt="person riding a one-wheel"
          videoUrl="/video.mp4"
          title="Hi, I'm Kent C. Dodds"
          description="Introduction video 1:42"
        />
      </div>
      <div className="col-span-full mt-12 space-y-12 lg:col-span-5 lg:col-start-7 lg:mt-0">
        <H2>
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
