import * as React from 'react'
import {images} from '../../images'
import {H2, Paragraph} from '../typography'
import {ArrowLink} from '../arrow-button'
import {Grid} from '../grid'

function AboutSection() {
  return (
    <Grid>
      <div className="table col-span-full lg:col-span-6">
        <div className="table-cell align-middle text-center">
          <div className="aspect-h-4 aspect-w-3">
            <img
              className="rounded-lg object-cover"
              src={images.kentSnowSports()}
              alt={images.kentSnowSports.alt}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col col-span-full justify-center lg:col-span-4 lg:col-start-8 lg:mt-0">
        <img
          className="self-start mt-20 w-48 w-auto lg:mt-0"
          src={images.snowboard()}
          alt={images.snowboard.alt}
        />

        <H2 className="mt-12">Big extreme sports enthusiast.</H2>
        <H2 className="mt-2" variant="secondary" as="p">
          With a big heart for helping people.{' '}
        </H2>

        <Paragraph className="mt-8">
          Vestibulum in cursus est, sit amet rhoncus sapien. Fusce nec quam
          euismod, aliquet nulla at, gravida nunc. Nulla vitae hendrerit velit.
          Duis nisi felis, porta eu convallis sit vulputate non mi. Mauris vel
          pellentesq.
        </Paragraph>

        <ArrowLink to="/about" direction="right" className="mt-14">
          Learn more about me
        </ArrowLink>
      </div>
    </Grid>
  )
}

export {AboutSection}
