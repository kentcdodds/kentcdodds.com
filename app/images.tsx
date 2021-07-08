import type {TransformerOption} from '@cld-apis/types'
import {setConfig, buildImageUrl} from 'cloudinary-build-url'

setConfig({
  cloudName: 'kentcdodds-com',
})

const createImages = <
  ImageType extends Record<string, {id: string; alt: string}>,
>(
  images: ImageType,
) => {
  type Builder = (transformations?: TransformerOption) => {
    src: string
    alt: string
  }
  const imageBuilders: Record<string, Builder> = {}
  for (const [name, {id, alt}] of Object.entries(images)) {
    imageBuilders[name] = transformations => {
      return {
        src: buildImageUrl(id, {transformations}),
        alt,
      }
    }
  }
  return imageBuilders as {[Name in keyof ImageType]: Builder}
}

const images = createImages({
  kentTransparentProfile: {
    id: 'kentcdodds.com/profile-transparent',
    alt: 'Kent C. Dodds',
  },
  kentProfile: {
    id: 'kentcdodds.com/profile',
    alt: 'Kent C. Dodds',
  },
  kentSnowSports: {
    id: 'kentcdodds.com/pages/home/kent-snow-sports',
    alt: 'Kent wearing snow clothes with skis and a snowboard',
  },
  kentCodingWithKody: {
    id: 'kentcdodds.com/pages/home/kent-coding-with-kody',
    alt: 'Kent sitting with his laptop on a bench next to Kody the Koala',
  },
  kentRidingOnewheelOutdoors: {
    id: 'kentcdodds.com/pages/home/kent-riding-onewheel-outdoors',
    alt: 'Kent riding a onewheel outdoors',
  },
  kentRidingOnewheelOutdoorsFast: {
    id: 'kentcdodds.com/pages/home/kent-riding-onewheel-outdoors-fast',
    alt: 'Kent riding a onewheel outdoors fast',
  },
  kentPalmingSoccerBall: {
    id: 'kentcdodds.com/pages/home/kent-palming-soccer-ball',
    alt: 'Kent holding a soccer ball',
  },

  alexProfileYellow: {
    id: 'kentcdodds.com/illustrations/yellow-head',
    alt: 'Mascot Profile in Yellow',
  },
  alexProfileBlue: {
    id: 'kentcdodds.com/illustrations/blue-head',
    alt: 'Mascot Profile in Blue',
  },
  alexProfileRed: {
    id: 'kentcdodds.com/illustrations/red-head',
    alt: 'Mascot Profile in Red',
  },
  alexProfileGray: {
    id: 'kentcdodds.com/illustrations/gray-head',
    alt: 'Mascot Profile in Gray',
  },
  teslaX: {
    id: 'kentcdodds.com/illustrations/tesla_zphbjp',
    alt: 'Illustration of a Tesla Model X',
  },
  solarPanels: {
    id: 'kentcdodds.com/illustrations/solar_panels_2_ftbwvb',
    alt: 'Illustration of Solar Panels',
  },
  snowboard: {
    id: 'kentcdodds.com/illustrations/snowboard_nqqlyr',
    alt: 'Illustration of a snowboard',
  },
  skis: {
    id: 'kentcdodds.com/illustrations/skis_z5lkc3',
    alt: 'Illustration of skis',
  },
  kayak: {
    id: 'kentcdodds.com/illustrations/rowing',
    alt: 'Illustration of a kayak',
  },
  onewheel: {
    id: 'kentcdodds.com/illustrations/one_wheel',
    alt: 'Illustration of a onewheel',
  },
  alexSnowboardingWithCable: {
    id: 'kentcdodds.com/illustrations/m15',
    alt: 'Illistration of a mascot standing on a snowboard surrounded by green leaves, a battery, two skies, a one-wheel, a solar panel, a recycle logo, and a cable.',
  },
  alexSnowboarding: {
    id: 'kentcdodds.com/illustrations/m14_s8mwg1',
    alt: 'Illistration of a mascot standing on a snowboard surrounded by green leaves, a battery, two skies, a one-wheel, a solar panel, and a recycle logo.',
  },
  alexSnowboardingWithHandOut: {
    id: 'kentcdodds.com/illustrations/image_yzvt1w',
    alt: 'Illistration of a mascot standing on a snowboard surrounded by green leaves, a battery, two skies, a one-wheel, a solar panel, and a recycle logo.',
  },
  helmet: {
    id: 'kentcdodds.com/illustrations/helmet',
    alt: 'Illustration of a helmet',
  },
  alexYellow: {
    id: 'kentcdodds.com/illustrations/character_y',
    alt: 'Illustration of snowboarder in yellow',
  },
  alexRed: {
    id: 'kentcdodds.com/illustrations/character_r',
    alt: 'Illustration of snowboarder in red',
  },
  alexBlue: {
    id: 'kentcdodds.com/illustrations/character_b',
    alt: 'Illustration of snowboarder in blue',
  },
  bustedOnewheel: {
    id: 'kentcdodds.com/illustrations/404_2_sprold',
    alt: 'Broken onewheel',
  },
})

export {images}
