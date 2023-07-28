import {Link, useSearchParams} from '@remix-run/react'
import {getImgProps, images} from '~/images.tsx'
import {ArrowLink} from '../arrow-button.tsx'
import {
  FullScreenYouTubeEmbed,
  LiteYouTubeEmbed,
} from '../fullscreen-yt-embed.tsx'
import {Grid} from '../grid.tsx'
import {H2, H3} from '../typography.tsx'

function IntroductionSection() {
  const [searchParams] = useSearchParams()
  return (
    <Grid>
      <div className="col-span-full lg:col-span-4">
        <FullScreenYouTubeEmbed
          autoplay={searchParams.has('autoplay')}
          img={
            <img
              {...getImgProps(images.getToKnowKentVideoThumbnail, {
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
          ytLiteEmbed={
            <LiteYouTubeEmbed
              id="a7VxBwLGcDE"
              announce="Watch"
              title="Get to know Kent C. Dodds"
              // We don't show the poster, so we use the lowest-res version
              poster="default"
              params={new URLSearchParams({
                color: 'white',
                playsinline: '0',
                rel: '0',
              }).toString()}
            />
          }
        />
        <p className="text-secondary text-xl">{`Petite introduction`}</p>
        <Link
          prefetch="intent"
          className="underlined"
          to="/about?autoplay"
        >{`ou regarder ma vidéo de présentation ici `}</Link>
      </div>
      <div className="col-span-full mt-12 lg:col-span-6 lg:col-start-6 lg:mt-0">
        <H2 id="intro">
          {`Bienvenue, Je suis Faust et je développe des stratégies UX et web ! `}
        </H2>
        <H3 variant="secondary" as="p" className="mt-12">
          {`
            Mais pas que ! Je suis aussi un adolescent passioné de musique UK, d'innovation et de créativité. Je donne 
            mes avis sur mes passions et je vous aide à saisir les meilleurs opportunités ;)
          `}
        </H3>
        <ArrowLink
          to="/about"
          direction="right"
          className="mt-20"
          prefetch="intent"
        >
          Savoir plus sur moi !
        </ArrowLink>
      </div>
    </Grid>
  )
}

export {IntroductionSection}
