import type {ActionFunction} from '@remix-run/node'
import {Link} from '@remix-run/react'
import {Grid} from '~/components/grid'
import {CloudinaryVideo} from '~/components/kifs'
import {HeroSection} from '~/components/sections/hero-section'
import {Spacer} from '~/components/spacer'
import {Paragraph} from '~/components/typography'
import {handleConvertKitFormSubmission} from '../../convertkit/remix.server'

export const action: ActionFunction = async ({request}) => {
  return handleConvertKitFormSubmission(request)
}

export default function ConvertKit() {
  return (
    <>
      <HeroSection
        title="Huzzah!"
        subtitle="You've signed up"
        image={
          <CloudinaryVideo
            cloudinaryId="kentcdodds.com/misc/approve"
            className="rounded-lg"
            aspectRatio="3:4"
          />
        }
      />

      <Grid as="main" className="mb-48">
        <div className="col-span-full">
          <Paragraph>{`... Ummm... Also, please enable JavaScript 😅`}</Paragraph>
          <Spacer size="3xs" />
          <Link to="/" className="underlined">
            Go to the home page
          </Link>
        </div>
      </Grid>
    </>
  )
}
