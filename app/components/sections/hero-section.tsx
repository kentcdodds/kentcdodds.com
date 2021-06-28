import * as React from 'react'
import {ArrowButton} from '../arrow-button'
import {Grid} from '../grid'
import {H1} from '../typography'
import {Button} from '../button'

// Note that the image overlaps the right edge of the grid by `8vw`. This `8vw`
// needs to stay in sync with the `10vw` margins of the grid component.
function HeroSection() {
  return (
    <Grid className="h-full">
      <div className="relative col-span-full px-4 lg:col-span-6 lg:col-start-7 lg:px-0 lg:h-full">
        <div className="bottom-0 left-0 right-0 top-0 flex items-center justify-center lg:absolute lg:-right-8vw">
          <img
            alt="A mascot standing on a snowboard surrounded by green leaves, a battery, two skies, a one-wheel, a solar panel and a recycle logo."
            className="w-full h-auto max-h-screen object-contain"
            src="/placeholders/m14.png"
          />
        </div>
      </div>

      <div className="col-span-full lg:flex lg:flex-col lg:col-span-6 lg:col-start-1 lg:row-start-1 lg:justify-center lg:h-full">
        <div className="flex flex-auto flex-col justify-center">
          <H1>
            Helping people make the world a better place through quality
            software.
          </H1>
          <div className="flex flex-col mt-14 space-y-4 lg:flex-row lg:space-x-4 lg:space-y-0">
            <Button variant="primary">Read the blog</Button>
            <Button variant="secondary">Take a course</Button>
          </div>
        </div>
        <div className="hidden pt-12 lg:block">
          <ArrowButton direction="down" textSize="small">
            Learn more about Kent
          </ArrowButton>
        </div>
      </div>
    </Grid>
  )
}

export {HeroSection}
