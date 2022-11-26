import {getImgProps, images} from '~/images'
import {H2} from '../typography'
import {ArrowLink} from '../arrow-button'
import {Grid} from '../grid'
import {DiscordLogo} from '../icons'

function DiscordSection() {
  return (
    <Grid>
      <div className="col-span-full mt-12 flex flex-col justify-center lg:col-span-5 lg:mt-0">
        <div className="text-black dark:text-white">
          <DiscordLogo />
        </div>

        <H2 className="mt-12">
          Meet like minded people who face similar challenges.
        </H2>
        <H2 variant="secondary" className="mt-8" as="p">
          Join the discord and get better at building software together.
        </H2>

        <ArrowLink
          to="/discord"
          direction="right"
          className="mt-20"
          prefetch="intent"
        >
          Learn more about the KCD Community on Discord
        </ArrowLink>
      </div>

      <div className="relative hidden lg:col-span-6 lg:col-start-7 lg:block">
        <div className="h-full w-full">
          <img
            className="h-full w-full rounded-lg object-cover"
            {...getImgProps(images.kentCodingWithKody, {
              // this image is hidden at max-width of 1023px
              // so we set that to 0px and have a width for 1px
              // to save data on the request
              widths: [1, 650, 1300, 2600],
              sizes: [
                '(max-width: 1023px) 0px',
                '(min-width:1024px) and (max-width:1620px) 40vw',
                '630px',
              ],
              transformations: {
                resize: {
                  type: 'fill',
                  aspectRatio: '3:4',
                },
              },
            })}
          />
        </div>
        <div
          className="absolute -left-12 -top-6 flex flex-col space-y-1"
          // this shade of blue is much more accessible with the bg-blue-100
          style={{color: '#006ece'}}
        >
          <div className="self-start rounded-full bg-blue-100 px-12 py-6 text-lg">
            {`Want to learn react together?`}
          </div>
          <div className="self-start rounded-full bg-blue-100 px-12 py-6 text-lg">
            {`Let me know `}
            <span role="img" aria-label="victory hand emoji">
              ✌️
            </span>
          </div>
        </div>

        <div
          className="absolute -bottom-6 -right-12 flex flex-col space-y-1 text-right"
          // this shade of green is much more accessible with the bg-green-100
          style={{color: '#008300'}}
        >
          <div className="self-end rounded-full bg-green-100 px-12 py-6 text-lg">
            {`For sure! Let's do it!`}
          </div>
          <div className="self-end rounded-full bg-green-100 px-12 py-6 text-lg">
            {`Let me show you what I'm working on...`}
            <span role="img" aria-label="technologist emoji">
              🧑‍💻
            </span>
          </div>
        </div>
      </div>
    </Grid>
  )
}

export {DiscordSection}
