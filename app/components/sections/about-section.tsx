import * as React from 'react'
import * as images from '../../images'
import {H2, Paragraph} from '../typography'
import {ArrowButton} from '../arrow-button'
import {Grid} from '../grid'

function AboutSection() {
  return (
    <Grid>
      <div className="table col-span-full lg:col-span-6">
        <div className="table-cell align-middle text-center">
          <div className="aspect-h-4 aspect-w-3">
            {/* TODO: replace placeholder image */}
            <img
              className="rounded-lg object-cover"
              src="https://images.unsplash.com/photo-1565857725478-54d38420aaa6?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&h=800&ixid=MnwxfDB8MXxyYW5kb218fHx8fHx8fHwxNjI0ODg2NjMx&ixlib=rb-1.2.1&q=80&utm_campaign=api-credit&utm_medium=referral&utm_source=unsplash_source&w=600"
              alt="TODO: give a real alt"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col col-span-full justify-center space-y-12 lg:col-span-5 lg:col-start-8 lg:mt-0">
        <img
          className="self-start w-auto h-48"
          src={images.snowboard.src}
          alt={images.snowboard.alt}
        />

        <H2>Big extreme sports enthusiast.</H2>
        <H2 variant="secondary" as="p">
          With a big heart for helping people.{' '}
        </H2>

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
