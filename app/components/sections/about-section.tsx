import * as React from 'react'
import {H2} from '../title'
import {ArrowButton} from '../arrow-button'
import {Grid} from '../grid'
import {Paragraph} from '../paragraph'

function AboutSection() {
  return (
    <Grid>
      <div className="col-span-full lg:col-span-6">
        <img
          className="max-h-[80vh] lg:max-h-[none] w-full h-full rounded-lg object-cover"
          src="/placeholders/about-picture.png"
        />
      </div>

      <div className="flex flex-col col-span-full justify-center space-y-12 lg:col-span-5 lg:col-start-8 lg:mt-0">
        <div>
          <img className="w-auto h-48" src="/placeholders/snowboard.png" />
        </div>

        <H2>Big extreme sports enthusiast.</H2>
        <H2 variant="secondary">With a big heart for helping people. </H2>

        <Paragraph>
          Vestibulum in cursus est, sit amet rhoncus sapien. Fusce nec quam
          euismod, aliquet nulla at, gravida nunc. Nulla vitae hendrerit velit.
          Duis nisi felis, porta eu convallis sit vulputate non mi. Mauris vel
          pellentesq.
        </Paragraph>

        <ArrowButton direction="right">Learn more about me </ArrowButton>
      </div>
    </Grid>
  )
}

export {AboutSection}
