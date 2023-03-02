import type {TransformerOption} from '@cld-apis/types'
import {setConfig, buildImageUrl} from 'cloudinary-build-url'
import emojiRegex from 'emoji-regex'
import type {OptionalTeam} from './utils/misc'
import {optionalTeams, toBase64} from './utils/misc'

setConfig({
  cloudName: 'kentcdodds-com',
})

type ImageBuilder = {
  (transformations?: TransformerOption): string
  alt: string
  id: string
}
const createImages = <
  ImageType extends Record<string, {id: string; alt: string}>,
>(
  images: ImageType,
) => {
  const imageBuilders: Record<string, ImageBuilder> = {}
  for (const [name, {id, alt}] of Object.entries(images)) {
    imageBuilders[name] = getImageBuilder(id, alt)
  }
  return imageBuilders as {[Name in keyof ImageType]: ImageBuilder}
}

function getImageBuilder(id: string, alt: string = ''): ImageBuilder {
  function imageBuilder(transformations?: TransformerOption) {
    return buildImageUrl(id, {transformations})
  }
  imageBuilder.alt = alt
  imageBuilder.id = id
  return imageBuilder
}

const images = createImages({
  kentSignatureDarkMode: {
    id: 'kent/signature-dark-mode',
    alt: `Kent's signature`,
  },
  kentSignatureLightMode: {
    id: 'kent/signature-light-mode',
    alt: `Kent's signature`,
  },
  kentTransparentProfile: {
    id: 'kent/profile-transparent',
    alt: 'Kent C. Dodds',
  },
  kentProfile: {
    id: 'kent/profile',
    alt: 'Kent C. Dodds',
  },
  kentSnowSports: {
    id: 'kent/snow-sports',
    alt: 'Kent wearing snow clothes with skis and a snowboard',
  },
  kentCodingWithKody: {
    id: 'kent/coding-with-kody',
    alt: 'Kent sitting with his laptop on a bench next to Kody the Koala',
  },
  kentRidingOnewheelOutdoors: {
    id: 'kent/riding-onewheel-outdoors',
    alt: 'Kent riding a onewheel outdoors',
  },
  kentRidingOnewheelOutdoorsFast: {
    id: 'kent/riding-onewheel-outdoors-fast',
    alt: 'Kent riding a onewheel outdoors fast',
  },
  kentWorkingInNature: {
    id: 'kent/working-in-nature',
    alt: 'Kent working in nature',
  },
  kentPalmingSoccerBall: {
    id: 'kent/palming-soccer-ball',
    alt: 'Kent holding a soccer ball',
  },
  kentCodingWithSkates: {
    id: 'kent/rollerblade-coding-checking-watch',
    alt: 'Kent checking his watch while sitting in rollerblades with a laptop',
  },
  kentHoldingOutCody: {
    id: 'kent/holding-out-kody',
    alt: 'Kent holding out Kody the Koala',
  },
  kentCodingOnCouch: {
    id: 'kent/coding-on-couch',
    alt: 'Kent coding on a couch',
  },
  kentSmilingWithLaptop: {
    id: 'kent/smiling-with-laptop-on-couch',
    alt: 'Kent smiling with laptop on a couch',
  },
  kentWithOnewheel: {
    id: 'kent/walking-away-with-onewheel',
    alt: 'Kent walking away with a onewheel',
  },
  kentSkatingGear: {
    id: 'kent/skating-gear',
    alt: 'Kent with skating gear',
  },
  kentSpeakingAllThingsOpen: {
    id: 'kent/kent-speaking-all-things-open',
    alt: 'Kent speaking all things open',
  },
  mrRogersBeKind: {
    id: 'kent/video-stills/mr-rogers-be-kind',
    alt: 'Laptop with a sticker with a photo of Mr. Rogers and the words "Be kind"',
  },
  microphoneWithHands: {
    id: 'kent/video-stills/microphone-with-hands',
    alt: 'A microphone and hands',
  },
  happySnowboarder: {
    id: 'kent/video-stills/happy-snowboarder',
    alt: 'Kent smiling covered in snow',
  },
  kentListeningAtReactRally: {
    id: 'kent/kent-listening-at-react-rally',
    alt: 'Kent sitting as an audience member at React Rally',
  },
  getToKnowKentVideoThumbnail: {
    id: 'kent/video-stills/get-to-know-kent-video-thumbnail',
    alt: 'Kent in the air on a snowboard with the words "Get to know Kent C. Dodds"',
  },
  kodyProfileYellow: {
    id: 'kentcdodds.com/illustrations/kody/kody_profile_yellow',
    alt: 'Kody Profile in Yellow',
  },
  kodyProfileBlue: {
    id: 'kentcdodds.com/illustrations/kody/kody_profile_blue',
    alt: 'Kody Profile in Blue',
  },
  kodyProfileRed: {
    id: 'kentcdodds.com/illustrations/kody/kody_profile_red',
    alt: 'Kody Profile in Red',
  },
  kodyProfileGray: {
    id: 'kentcdodds.com/illustrations/kody/kody_profile_gray',
    alt: 'Kody Profile in Gray',
  },
  teslaY: {
    id: 'kentcdodds.com/illustrations/tesla_y2_j8kti2',
    alt: 'Illustration of a Tesla Model Y',
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
  microphone: {
    id: 'kentcdodds.com/illustrations/mic',
    alt: 'Illustration of a microphone',
  },
  kodySkiingBlue: {
    id: 'kentcdodds.com/illustrations/kody/kody_skiing_blue',
    alt: 'Illustration of Kody the Koala on skis in blue',
  },
  kodySkiingGray: {
    id: 'kentcdodds.com/illustrations/kody/kody_skiing_gray',
    alt: 'Illustration of Kody the Koala on skis in gray',
  },
  kodySkiingYellow: {
    id: 'kentcdodds.com/illustrations/kody/kody_skiing_yellow',
    alt: 'Illustration of Kody the Koala on skis in yellow',
  },
  kodySkiingRed: {
    id: 'kentcdodds.com/illustrations/kody/kody_skiing_red',
    alt: 'Illustration of Kody the Koala on skis in red',
  },
  kodyFlyingSkiingBlue: {
    id: 'kentcdodds.com/illustrations/kody/kody_skiing_flying_blue',
    alt: 'Illustration of Kody the Koala skiing surrounded by green leaves, a battery, two skies, a one-wheel, a solar panel, and a recycle logo.',
  },
  kodyFlyingSkiingGray: {
    id: 'kentcdodds.com/illustrations/kody/kody_skiing_flying_gray',
    alt: 'Illustration of Kody the Koala skiing surrounded by green leaves, a battery, two skies, a one-wheel, a solar panel, and a recycle logo.',
  },
  kodyFlyingSkiingYellow: {
    id: 'kentcdodds.com/illustrations/kody/kody_skiing_flying_yellow',
    alt: 'Illustration of Kody the Koala skiing surrounded by green leaves, a battery, two skies, a one-wheel, a solar panel, and a recycle logo.',
  },
  kodyFlyingSkiingRed: {
    id: 'kentcdodds.com/illustrations/kody/kody_skiing_flying_red',
    alt: 'Illustration of Kody the Koala skiing surrounded by green leaves, a battery, two skies, a one-wheel, a solar panel, and a recycle logo.',
  },
  kodyFlyingSnowboardingGray: {
    id: 'kentcdodds.com/illustrations/kody/kody_snowboarding_flying_gray',
    alt: 'Illustration of Kody the Koala standing on a snowboard surrounded by green leaves, a battery, two skies, a one-wheel, a solar panel, and a recycle logo.',
  },
  kodyFlyingSnowboardingYellow: {
    id: 'kentcdodds.com/illustrations/kody/kody_snowboarding_flying_yellow',
    alt: 'Illustration of Kody the Koala standing on a snowboard surrounded by green leaves, a battery, two skies, a one-wheel, a solar panel, and a recycle logo.',
  },
  kodyFlyingSnowboardingRed: {
    id: 'kentcdodds.com/illustrations/kody/kody_snowboarding_flying_red',
    alt: 'Illustration of Kody the Koala standing on a snowboard surrounded by green leaves, a battery, two skies, a one-wheel, a solar panel, and a recycle logo.',
  },
  kodyFlyingSnowboardingBlue: {
    id: 'kentcdodds.com/illustrations/kody/kody_snowboarding_flying_blue',
    alt: 'Illustration of Kody the Koala standing on a snowboard surrounded by green leaves, a battery, two skies, a one-wheel, a solar panel, and a recycle logo.',
  },
  kodyFlyingOnewheelingGray: {
    id: 'kentcdodds.com/illustrations/kody/kody_onewheeling_flying_gray',
    alt: 'Illustration of Kody the Koala standing on a onewheel surrounded by green leaves, a battery, two skies, a snowboard, a solar panel, and a recycle logo.',
  },
  kodyFlyingOnewheelingYellow: {
    id: 'kentcdodds.com/illustrations/kody/kody_onewheeling_flying_yellow',
    alt: 'Illustration of Kody the Koala standing on a onewheel surrounded by green leaves, a battery, two skies, a snowboard, a solar panel, and a recycle logo.',
  },
  kodyFlyingOnewheelingRed: {
    id: 'kentcdodds.com/illustrations/kody/kody_onewheeling_flying_red',
    alt: 'Illustration of Kody the Koala standing on a onewheel surrounded by green leaves, a battery, two skies, a snowboard, a solar panel, and a recycle logo.',
  },
  kodyFlyingOnewheelingBlue: {
    id: 'kentcdodds.com/illustrations/kody/kody_onewheeling_flying_blue',
    alt: 'Illustration of Kody the Koala standing on a onewheel surrounded by green leaves, a battery, two skies, a snowboard, a solar panel, and a recycle logo.',
  },
  kodySnowboardingYellow: {
    id: 'kentcdodds.com/illustrations/kody/kody_snowboarding_yellow',
    alt: 'Illustration of Kody the Koala on a snowboard in yellow',
  },
  kodySnowboardingRed: {
    id: 'kentcdodds.com/illustrations/kody/kody_snowboarding_red',
    alt: 'Illustration of Kody the Koala on a snowboard in red',
  },
  kodySnowboardingBlue: {
    id: 'kentcdodds.com/illustrations/kody/kody_snowboarding_blue',
    alt: 'Illustration of Kody the Koala on a snowboard in blue',
  },
  kodySnowboardingGray: {
    id: 'kentcdodds.com/illustrations/kody/kody_snowboarding_gray',
    alt: 'Illustration of Kody the Koala on a snowboard in gray',
  },
  kodyOnewheelingYellow: {
    id: 'kentcdodds.com/illustrations/kody/kody_onewheeling_yellow',
    alt: 'Illustration of Kody the Koala on a snowboard in yellow',
  },
  kodyOnewheelingRed: {
    id: 'kentcdodds.com/illustrations/kody/kody_onewheeling_red',
    alt: 'Illustration of Kody the Koala on a snowboard in red',
  },
  kodyOnewheelingBlue: {
    id: 'kentcdodds.com/illustrations/kody/kody_onewheeling_blue',
    alt: 'Illustration of Kody the Koala on a snowboard in blue',
  },
  kodyOnewheelingGray: {
    id: 'kentcdodds.com/illustrations/kody/kody_onewheeling_gray',
    alt: 'Illustration of Kody the Koala on a snowboard in gray',
  },
  helmet: {
    id: 'kentcdodds.com/illustrations/helmet',
    alt: 'Illustration of a helmet',
  },
  bustedOnewheel: {
    id: 'kentcdodds.com/illustrations/404_2_sprold',
    alt: 'Broken onewheel',
  },
  courseAdvancedReactComponentPatterns: {
    id: 'kentcdodds.com/pages/courses/advanced-react-component-patterns',
    alt: 'Illustration for React Class Component Patterns',
  },
  courseAsts: {
    id: 'kentcdodds.com/pages/courses/asts',
    alt: 'Illustration for Code Transformation and Linting with ASTs',
  },
  courseEpicReact: {
    id: 'kentcdodds.com/pages/courses/rocket',
    alt: 'Illustration of a Rocket',
  },
  courseHowToContributeToAnOpenSourceProjectOnGitHub: {
    id: 'kentcdodds.com/pages/courses/how-to-contribute-to-an-open-source-project-on-github',
    alt: 'Illustration for How to Contribute to an Open Source Project on GitHub',
  },
  courseHowToWriteAnOpenSourceJavaScriptLibrary: {
    id: 'kentcdodds.com/pages/courses/how-to-write-an-open-source-javascript-library',
    alt: 'Illustration for How to Write an Open Source JavaScript Library',
  },
  courseSimplifyReactAppsWithReactHooks: {
    id: 'kentcdodds.com/pages/courses/simplify-react-apps-with-react-hooks',
    alt: 'Illustration for Simplify React Apps with React Hooks',
  },
  courseTestingJS: {
    id: 'kentcdodds.com/pages/courses/testing-trophy',
    alt: 'Illustration of a trophy',
  },
  courseTestingPrinciples: {
    id: 'kentcdodds.com/pages/courses/testing-principles',
    alt: 'Illustration for JavaScript Testing Practices and Principles',
  },
  courseTestingReact: {
    id: 'kentcdodds.com/pages/courses/testing-react',
    alt: 'Illustration for Testing React Applications, v2',
  },
  courseTheBeginnersGuideToReact: {
    id: 'kentcdodds.com/pages/courses/the-beginners-guide-to-react',
    alt: `Illustration for The Beginner's Guide to React`,
  },
  courseUpAndRunningWithRemix: {
    id: 'kentcdodds.com/pages/courses/up-and-running-with-remix',
    alt: `Illustration for Up and Running with Remix`,
  },
  courseUseSuspenseToSimplifyYourAsyncUI: {
    id: 'kentcdodds.com/pages/courses/use-suspense-to-simplify-your-async-ui',
    alt: 'Illustration for Use Suspense to Simplify Your Async UI',
  },
  courseFEMAdvancedRemix: {
    id: 'kentcdodds.com/pages/courses/fem-advanced-remix',
    alt: 'Illustration of the Remix logo R with the word "Advanced"',
  },
  courseFEMRemixFundamentals: {
    id: 'kentcdodds.com/pages/courses/fem-remix-fundamentals',
    alt: 'Illustration of the Remix logo R with the word "Fundamentals"',
  },
})

const kodyProfiles: Record<OptionalTeam, {src: string; alt: string}> = {
  RED: {src: images.kodyProfileRed(), alt: images.kodyProfileRed.alt},
  BLUE: {src: images.kodyProfileBlue(), alt: images.kodyProfileBlue.alt},
  YELLOW: {src: images.kodyProfileYellow(), alt: images.kodyProfileYellow.alt},
  UNKNOWN: {src: images.kodyProfileGray(), alt: images.kodyProfileGray.alt},
}

const kodySnowboardingImages: Record<OptionalTeam, ImageBuilder> = {
  RED: images.kodySnowboardingRed,
  YELLOW: images.kodySnowboardingYellow,
  BLUE: images.kodySnowboardingBlue,
  UNKNOWN: images.kodySnowboardingGray,
}
const kodySkiingImages: Record<OptionalTeam, ImageBuilder> = {
  RED: images.kodySkiingRed,
  YELLOW: images.kodySkiingYellow,
  BLUE: images.kodySkiingBlue,
  UNKNOWN: images.kodySkiingGray,
}
const kodyOnewheelingImages: Record<OptionalTeam, ImageBuilder> = {
  RED: images.kodyOnewheelingRed,
  YELLOW: images.kodyOnewheelingYellow,
  BLUE: images.kodyOnewheelingBlue,
  UNKNOWN: images.kodyOnewheelingGray,
}

const kodyFlyingSnowboardingImages: Record<OptionalTeam, ImageBuilder> = {
  RED: images.kodyFlyingSnowboardingRed,
  YELLOW: images.kodyFlyingSnowboardingYellow,
  BLUE: images.kodyFlyingSnowboardingBlue,
  UNKNOWN: images.kodyFlyingSnowboardingGray,
}
const kodyFlyingSkiingImages: Record<OptionalTeam, ImageBuilder> = {
  RED: images.kodyFlyingSkiingRed,
  YELLOW: images.kodyFlyingSkiingYellow,
  BLUE: images.kodyFlyingSkiingBlue,
  UNKNOWN: images.kodyFlyingSkiingGray,
}
const kodyFlyingOnewheelingImages: Record<OptionalTeam, ImageBuilder> = {
  RED: images.kodyFlyingOnewheelingRed,
  YELLOW: images.kodyFlyingOnewheelingYellow,
  BLUE: images.kodyFlyingOnewheelingBlue,
  UNKNOWN: images.kodyFlyingOnewheelingGray,
}

export function getRandomSportyKody(team?: OptionalTeam | undefined) {
  const activities = [
    kodySnowboardingImages,
    kodySkiingImages,
    kodyOnewheelingImages,
  ]
  const set =
    activities[Math.floor(Math.random() * activities.length)] ??
    kodySnowboardingImages
  if (team) {
    return set[team]
  } else {
    const randomTeam =
      optionalTeams[Math.floor(Math.random() * optionalTeams.length)] ??
      'UNKNOWN'
    return set[randomTeam]
  }
}

export function getRandomFlyingKody(team?: OptionalTeam | undefined) {
  const activities = [
    kodyFlyingSnowboardingImages,
    kodyFlyingSkiingImages,
    kodyFlyingOnewheelingImages,
  ]
  const set =
    activities[Math.floor(Math.random() * activities.length)] ??
    kodySnowboardingImages
  if (team) {
    return set[team]
  } else {
    const randomTeam =
      optionalTeams[Math.floor(Math.random() * optionalTeams.length)] ??
      'UNKNOWN'
    return set[randomTeam]
  }
}

const illustrationImages = {
  teslaY: images.teslaY,
  solarPanels: images.solarPanels,
  snowboard: images.snowboard,
  skis: images.skis,
  kayak: images.kayak,
  onewheel: images.onewheel,
  microphone: images.microphone,
  helmet: images.helmet,
}

function getImgProps(
  imageBuilder: ImageBuilder,
  {
    widths,
    sizes,
    transformations,
  }: {
    widths: Array<number>
    sizes: Array<string>
    transformations?: TransformerOption
  },
) {
  const averageSize = Math.ceil(widths.reduce((a, s) => a + s) / widths.length)

  return {
    alt: imageBuilder.alt,
    src: imageBuilder({
      quality: 'auto',
      format: 'auto',
      ...transformations,
      resize: {width: averageSize, ...transformations?.resize},
    }),
    srcSet: widths
      .map(width =>
        [
          imageBuilder({
            quality: 'auto',
            format: 'auto',
            ...transformations,
            resize: {width, ...transformations?.resize},
          }),
          `${width}w`,
        ].join(' '),
      )
      .join(', '),
    sizes: sizes.join(', '),
    crossOrigin: 'anonymous',
  } as const
}

function getSocialImageWithPreTitle({
  title,
  preTitle,
  featuredImage: img,
  url,
}: {
  title: string
  preTitle: string
  featuredImage: string
  url: string
}) {
  const vars = `$th_1256,$tw_2400,$gw_$tw_div_24,$gh_$th_div_12`

  const encodedPreTitle = doubleEncode(emojiStrip(preTitle))
  const preTitleSection = `co_rgb:a9adc1,c_fit,g_north_west,w_$gw_mul_14,h_$gh,x_$gw_mul_1.5,y_$gh_mul_1.3,l_text:kentcdodds.com:Matter-Regular.woff2_50:${encodedPreTitle}`

  const encodedTitle = doubleEncode(emojiStrip(title))
  const titleSection = `co_white,c_fit,g_north_west,w_$gw_mul_13.5,h_$gh_mul_7,x_$gw_mul_1.5,y_$gh_mul_2.3,l_text:kentcdodds.com:Matter-Regular.woff2_110:${encodedTitle}`

  const kentProfileSection = `c_fit,g_north_west,r_max,w_$gw_mul_4,h_$gh_mul_3,x_$gw,y_$gh_mul_8,l_kent:profile-transparent`
  const kentNameSection = `co_rgb:a9adc1,c_fit,g_north_west,w_$gw_mul_5.5,h_$gh_mul_4,x_$gw_mul_4.5,y_$gh_mul_9,l_text:kentcdodds.com:Matter-Regular.woff2_70:Kent%20C.%20Dodds`

  const encodedUrl = doubleEncode(emojiStrip(url))
  const urlSection = `co_rgb:a9adc1,c_fit,g_north_west,w_$gw_mul_9,x_$gw_mul_4.5,y_$gh_mul_9.8,l_text:kentcdodds.com:Matter-Regular.woff2_40:${encodedUrl}`

  const featuredImageIsRemote = img.startsWith('http')
  const featuredImageCloudinaryId = featuredImageIsRemote
    ? toBase64(img)
    : img.replace(/\//g, ':')
  const featuredImageLayerType = featuredImageIsRemote ? 'l_fetch:' : 'l_'
  const featuredImageSection = `c_fill,ar_3:4,r_12,g_east,h_$gh_mul_10,x_$gw,${featuredImageLayerType}${featuredImageCloudinaryId}`

  return [
    `https://res.cloudinary.com/kentcdodds-com/image/upload`,
    vars,
    preTitleSection,
    titleSection,
    kentProfileSection,
    kentNameSection,
    urlSection,
    featuredImageSection,
    `c_fill,w_$tw,h_$th/kentcdodds.com/social-background.png`,
  ].join('/')
}

function getGenericSocialImage({
  words,
  featuredImage: img,
  url,
}: {
  words: string
  featuredImage: string
  url: string
}) {
  const vars = `$th_1256,$tw_2400,$gw_$tw_div_24,$gh_$th_div_12`

  const encodedWords = doubleEncode(emojiStrip(words))
  const primaryWordsSection = `co_white,c_fit,g_north_west,w_$gw_mul_10,h_$gh_mul_7,x_$gw_mul_1.3,y_$gh_mul_1.5,l_text:kentcdodds.com:Matter-Regular.woff2_110:${encodedWords}`

  const kentProfileSection = `c_fit,g_north_west,r_max,w_$gw_mul_4,h_$gh_mul_3,x_$gw,y_$gh_mul_8,l_kent:profile-transparent`
  const kentNameSection = `co_rgb:a9adc1,c_fit,g_north_west,w_$gw_mul_5.5,h_$gh_mul_4,x_$gw_mul_4.5,y_$gh_mul_9,l_text:kentcdodds.com:Matter-Regular.woff2_70:Kent%20C.%20Dodds`

  const encodedUrl = doubleEncode(emojiStrip(url))
  const urlSection = `co_rgb:a9adc1,c_fit,g_north_west,w_$gw_mul_5.5,x_$gw_mul_4.5,y_$gh_mul_9.8,l_text:kentcdodds.com:Matter-Regular.woff2_40:${encodedUrl}`

  const featuredImageIsRemote = img.startsWith('http')
  const featuredImageCloudinaryId = featuredImageIsRemote
    ? toBase64(img)
    : img.replace(/\//g, ':')
  const featuredImageLayerType = featuredImageIsRemote ? 'l_fetch:' : 'l_'

  const featureImageSection = `c_fit,g_east,w_$gw_mul_11,h_$gh_mul_11,x_$gw,${featuredImageLayerType}${featuredImageCloudinaryId}`

  const backgroundSection = `c_fill,w_$tw,h_$th/kentcdodds.com/social-background.png`
  return [
    `https://res.cloudinary.com/kentcdodds-com/image/upload`,
    vars,
    primaryWordsSection,
    kentProfileSection,
    kentNameSection,
    urlSection,
    featureImageSection,
    backgroundSection,
  ].join('/')
}

function emojiStrip(string: string) {
  return (
    string
      .replace(emojiRegex(), '')
      // get rid of double spaces:
      .split(' ')
      .filter(Boolean)
      .join(' ')
      .trim()
  )
}

// cloudinary needs double-encoding
function doubleEncode(s: string) {
  return encodeURIComponent(encodeURIComponent(s))
}

export {
  images,
  kodyProfiles,
  getImgProps,
  getImageBuilder,
  getGenericSocialImage,
  getSocialImageWithPreTitle,
  illustrationImages,
}
export type {ImageBuilder}
