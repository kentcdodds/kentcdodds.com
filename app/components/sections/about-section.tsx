import {getImgProps, images} from '~/images.tsx'
import {ArrowLink} from '../arrow-button.tsx'
import {Grid} from '../grid.tsx'
import {H2, Paragraph} from '../typography.tsx'

function AboutSection() {
  return (
    <Grid>
      <div className="col-span-full table lg:col-span-6">
        <div className="table-cell text-center align-middle">
          <div>
            <img
              className="rounded-lg object-cover"
              {...getImgProps(images.kentSnowSports, {
                widths: [300, 650, 1300, 1800, 2600],
                sizes: [
                  '(max-width: 1023px) 80vw',
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
        </div>
      </div>

      <div className="col-span-full flex flex-col justify-center lg:col-span-4 lg:col-start-8 lg:mt-0">
        <img
          className="mt-20 w-auto self-start lg:mt-0"
          {...getImgProps(images.snowboard, {
            widths: [300, 600, 850, 1600, 2550],
            sizes: [
              '(max-width: 1023px) 80vw',
              '(min-width:1024px) and (max-width:1620px) 25vw',
              '410px',
            ],
          })}
        />

        <H2 className="mt-12">{`Amoureux de la culture générale et de musique !`}</H2>
        <H2 className="mt-2" variant="secondary" as="p">
          {`et prêt à en discuter !`}
        </H2>

        <Paragraph className="mt-8">
          {`
            J'écris régulièrement sur des sujets de découverte, de musique anglaise et rap, mais aussi
            sur la télévision. L'objectif : Discuter et apprendre !
          `}
        </Paragraph>

        <ArrowLink
          to="/about"
          direction="right"
          className="mt-14"
          prefetch="intent"
        >
         Apprendre plus sur moi !
        </ArrowLink>
      </div>
    </Grid>
  )
}
export {AboutSection}
