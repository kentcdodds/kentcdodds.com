import { type TransformerOption } from '@cld-apis/types'
import { buildImageUrl, setConfig } from 'cloudinary-build-url'
import clsx from 'clsx'
import emojiRegex from 'emoji-regex'
import { type CSSProperties } from 'react'
import { optionalTeams, toBase64, type OptionalTeam } from './utils/misc.tsx'

setConfig({
	cloudName: 'kentcdodds-com',
})

type ImageBuilder = {
	(transformations?: TransformerOption): string
	alt: string
	id: string
	className?: string
	style?: CSSProperties
}
const createImages = <
	ImageType extends Record<
		string,
		Pick<ImageBuilder, 'id' | 'alt' | 'className' | 'style'>
	>,
>(
	images: ImageType,
) => {
	const imageBuilders: Record<string, ImageBuilder> = {}
	for (const [name, { id, alt, className, style }] of Object.entries(images)) {
		imageBuilders[name] = getImageBuilder(id, alt, { className, style })
	}
	return imageBuilders as { [Name in keyof ImageType]: ImageBuilder }
}

function getImageBuilder(
	id: string,
	alt: string = '',
	{ className, style }: { className?: string; style?: CSSProperties } = {},
): ImageBuilder {
	function imageBuilder(transformations?: TransformerOption) {
		return buildImageUrl(id, { transformations })
	}
	imageBuilder.alt = alt
	imageBuilder.id = id
	imageBuilder.className = className
	imageBuilder.style = style
	return imageBuilder
}

const square = { aspectRatio: '1/1' } satisfies CSSProperties

const images = createImages({
	kentSignatureDarkMode: {
		id: 'kent/signature-dark-mode',
		alt: `Kent's signature`,
		style: { aspectRatio: '1.891' },
	},
	kentSignatureLightMode: {
		id: 'kent/signature-light-mode',
		alt: `Kent's signature`,
		style: { aspectRatio: '1.891' },
	},
	kentTransparentProfile: {
		id: 'kent/profile-transparent',
		alt: 'Kent C. Dodds',
		style: square,
	},
	kentProfile: {
		id: 'kent/profile',
		alt: 'Kent C. Dodds',
		style: square,
	},
	kentSnowSports: {
		id: 'kent/snow-sports',
		alt: 'Kent wearing snow clothes with skis and a snowboard',
		style: { aspectRatio: '0.8194' },
	},
	kentCodingWithKody: {
		id: 'kent/coding-with-kody',
		alt: 'Kent sitting with his laptop on a bench next to Kody the Koala',
		style: { aspectRatio: '1.405' },
	},
	kentRidingOnewheelOutdoors: {
		id: 'kent/riding-onewheel-outdoors',
		alt: 'Kent riding a onewheel outdoors',
		style: { aspectRatio: '1.5014' },
	},
	kentRidingOnewheelOutdoorsFast: {
		id: 'kent/riding-onewheel-outdoors-fast',
		alt: 'Kent riding a onewheel outdoors fast',
		style: { aspectRatio: '1.5014' },
	},
	kentWorkingInNature: {
		id: 'kent/working-in-nature',
		alt: 'Kent working in nature',
		style: { aspectRatio: '1.5014' },
	},
	kentPalmingSoccerBall: {
		id: 'kent/palming-soccer-ball',
		alt: 'Kent holding a soccer ball',
		style: { aspectRatio: '0.7112' },
	},
	kentCodingWithSkates: {
		id: 'kent/rollerblade-coding-checking-watch',
		alt: 'Kent checking his watch while sitting in rollerblades with a laptop',
		style: { aspectRatio: '0.7112' },
	},
	kentHoldingOutCody: {
		id: 'kent/holding-out-kody',
		alt: 'Kent holding out Kody the Koala',
		style: { aspectRatio: '0.7112' },
	},
	kentCodingOnCouch: {
		id: 'kent/coding-on-couch',
		alt: 'Kent coding on a couch',
		style: { aspectRatio: '1.4052' },
	},
	kentSmilingWithLaptop: {
		id: 'kent/smiling-with-laptop-on-couch',
		alt: 'Kent smiling with laptop on a couch',
		style: { aspectRatio: '1.4052' },
	},
	kentWithOnewheel: {
		id: 'kent/walking-away-with-onewheel',
		alt: 'Kent walking away with a onewheel',
		style: { aspectRatio: '0.7112' },
	},
	kentSkatingGear: {
		id: 'kent/skating-gear',
		alt: 'Kent with skating gear',
		style: { aspectRatio: '0.7112' },
	},
	kentSpeakingAllThingsOpen: {
		id: 'kent/kent-speaking-all-things-open',
		alt: 'Kent speaking all things open',
		style: { aspectRatio: '1.4993' },
	},
	mrRogersBeKind: {
		id: 'kent/video-stills/mr-rogers-be-kind',
		alt: 'Laptop with a sticker with a photo of Mr. Rogers and the words "Be kind"',
		style: { aspectRatio: '1.7798' },
	},
	microphoneWithHands: {
		id: 'kent/video-stills/microphone-with-hands',
		alt: 'A microphone and hands',
		style: { aspectRatio: '1.7798' },
	},
	happySnowboarder: {
		id: 'kent/video-stills/happy-snowboarder',
		alt: 'Kent smiling covered in snow',
		style: { aspectRatio: '1.7798' },
	},
	kentListeningAtReactRally: {
		id: 'kent/kent-listening-at-react-rally',
		alt: 'Kent sitting as an audience member at React Rally',
		style: { aspectRatio: '1.5035' },
	},
	getToKnowKentVideoThumbnail: {
		id: 'kent/video-stills/get-to-know-kent-video-thumbnail',
		alt: 'Kent in the air on a snowboard with the words "Get to know Kent C. Dodds"',
		style: { aspectRatio: '16/9' },
	},
	kodyProfileYellow: {
		id: 'kentcdodds.com/illustrations/kody/kody_profile_yellow',
		alt: 'Kody Profile in Yellow',
		style: { aspectRatio: '1.2632' },
	},
	kodyProfileBlue: {
		id: 'kentcdodds.com/illustrations/kody/kody_profile_blue',
		alt: 'Kody Profile in Blue',
		style: { aspectRatio: '1.2632' },
	},
	kodyProfileRed: {
		id: 'kentcdodds.com/illustrations/kody/kody_profile_red',
		alt: 'Kody Profile in Red',
		style: { aspectRatio: '1.2632' },
	},
	kodyProfileGray: {
		id: 'kentcdodds.com/illustrations/kody/kody_profile_gray',
		alt: 'Kody Profile in Gray',
		style: { aspectRatio: '1.2632' },
	},
	teslaY: {
		id: 'kentcdodds.com/illustrations/tesla_y2_j8kti2',
		alt: 'Illustration of a Tesla Model Y',
		style: { aspectRatio: '1.61' },
	},
	solarPanels: {
		id: 'kentcdodds.com/illustrations/solar_panels_2_ftbwvb',
		alt: 'Illustration of Solar Panels',
		style: { aspectRatio: '1.5468' },
	},
	snowboard: {
		id: 'kentcdodds.com/illustrations/snowboard_nqqlyr',
		alt: 'Illustration of a snowboard',
		style: { aspectRatio: '1.764' },
	},
	skis: {
		id: 'kentcdodds.com/illustrations/skis_z5lkc3',
		alt: 'Illustration of skis',
		style: { aspectRatio: '0.71' },
	},
	kayak: {
		id: 'kentcdodds.com/illustrations/rowing',
		alt: 'Illustration of a kayak',
		style: square,
	},
	onewheel: {
		id: 'kentcdodds.com/illustrations/one_wheel',
		alt: 'Illustration of a onewheel',
		style: square,
	},
	microphone: {
		id: 'kentcdodds.com/illustrations/mic',
		alt: 'Illustration of a microphone',
		style: { aspectRatio: '0.553' },
	},
	kodySkiingBlue: {
		id: 'kentcdodds.com/illustrations/kody/kody_skiing_blue',
		alt: 'Illustration of Kody the Koala on skis in blue',
		style: square,
	},
	kodySkiingGray: {
		id: 'kentcdodds.com/illustrations/kody/kody_skiing_gray',
		alt: 'Illustration of Kody the Koala on skis in gray',
		style: square,
	},
	kodySkiingYellow: {
		id: 'kentcdodds.com/illustrations/kody/kody_skiing_yellow',
		alt: 'Illustration of Kody the Koala on skis in yellow',
		style: square,
	},
	kodySkiingRed: {
		id: 'kentcdodds.com/illustrations/kody/kody_skiing_red',
		alt: 'Illustration of Kody the Koala on skis in red',
		style: square,
	},
	kodyFlyingSkiingBlue: {
		id: 'kentcdodds.com/illustrations/kody/kody_skiing_flying_blue',
		alt: 'Illustration of Kody the Koala skiing surrounded by green leaves, a battery, two skies, a one-wheel, a solar panel, and a recycle logo.',
		style: square,
	},
	kodyFlyingSkiingGray: {
		id: 'kentcdodds.com/illustrations/kody/kody_skiing_flying_gray',
		alt: 'Illustration of Kody the Koala skiing surrounded by green leaves, a battery, two skies, a one-wheel, a solar panel, and a recycle logo.',
		style: square,
	},
	kodyFlyingSkiingYellow: {
		id: 'kentcdodds.com/illustrations/kody/kody_skiing_flying_yellow',
		alt: 'Illustration of Kody the Koala skiing surrounded by green leaves, a battery, two skies, a one-wheel, a solar panel, and a recycle logo.',
		style: square,
	},
	kodyFlyingSkiingRed: {
		id: 'kentcdodds.com/illustrations/kody/kody_skiing_flying_red',
		alt: 'Illustration of Kody the Koala skiing surrounded by green leaves, a battery, two skies, a one-wheel, a solar panel, and a recycle logo.',
		style: square,
	},
	kodyFlyingSnowboardingGray: {
		id: 'kentcdodds.com/illustrations/kody/kody_snowboarding_flying_gray',
		alt: 'Illustration of Kody the Koala standing on a snowboard surrounded by green leaves, a battery, two skies, a one-wheel, a solar panel, and a recycle logo.',
		style: square,
	},
	kodyFlyingSnowboardingYellow: {
		id: 'kentcdodds.com/illustrations/kody/kody_snowboarding_flying_yellow',
		alt: 'Illustration of Kody the Koala standing on a snowboard surrounded by green leaves, a battery, two skies, a one-wheel, a solar panel, and a recycle logo.',
		style: square,
	},
	kodyFlyingSnowboardingRed: {
		id: 'kentcdodds.com/illustrations/kody/kody_snowboarding_flying_red',
		alt: 'Illustration of Kody the Koala standing on a snowboard surrounded by green leaves, a battery, two skies, a one-wheel, a solar panel, and a recycle logo.',
		style: square,
	},
	kodyFlyingSnowboardingBlue: {
		id: 'kentcdodds.com/illustrations/kody/kody_snowboarding_flying_blue',
		alt: 'Illustration of Kody the Koala standing on a snowboard surrounded by green leaves, a battery, two skies, a one-wheel, a solar panel, and a recycle logo.',
		style: square,
	},
	kodyFlyingOnewheelingGray: {
		id: 'kentcdodds.com/illustrations/kody/kody_onewheeling_flying_gray',
		alt: 'Illustration of Kody the Koala standing on a onewheel surrounded by green leaves, a battery, two skies, a snowboard, a solar panel, and a recycle logo.',
		style: square,
	},
	kodyFlyingOnewheelingYellow: {
		id: 'kentcdodds.com/illustrations/kody/kody_onewheeling_flying_yellow',
		alt: 'Illustration of Kody the Koala standing on a onewheel surrounded by green leaves, a battery, two skies, a snowboard, a solar panel, and a recycle logo.',
		style: square,
	},
	kodyFlyingOnewheelingRed: {
		id: 'kentcdodds.com/illustrations/kody/kody_onewheeling_flying_red',
		alt: 'Illustration of Kody the Koala standing on a onewheel surrounded by green leaves, a battery, two skies, a snowboard, a solar panel, and a recycle logo.',
		style: square,
	},
	kodyFlyingOnewheelingBlue: {
		id: 'kentcdodds.com/illustrations/kody/kody_onewheeling_flying_blue',
		alt: 'Illustration of Kody the Koala standing on a onewheel surrounded by green leaves, a battery, two skies, a snowboard, a solar panel, and a recycle logo.',
		style: square,
	},
	kodyFlyingPlayingSoccerGray: {
		id: 'kentcdodds.com/illustrations/kody/kody_playing_soccer_flying_gray',
		alt: 'Illustration of Kody the Koala kicking a soccer ball surrounded by green leaves, a battery, a onewheel, a snowboard, a solar panel, and a recycle logo.',
		style: square,
	},
	kodyFlyingPlayingSoccerYellow: {
		id: 'kentcdodds.com/illustrations/kody/kody_playing_soccer_flying_yellow',
		alt: 'Illustration of Kody the Koala kicking a soccer ball surrounded by green leaves, a battery, a onewheel, a snowboard, a solar panel, and a recycle logo.',
		style: square,
	},
	kodyFlyingPlayingSoccerRed: {
		id: 'kentcdodds.com/illustrations/kody/kody_playing_soccer_flying_red',
		alt: 'Illustration of Kody the Koala kicking a soccer ball surrounded by green leaves, a battery, a onewheel, a snowboard, a solar panel, and a recycle logo.',
		style: square,
	},
	kodyFlyingPlayingSoccerBlue: {
		id: 'kentcdodds.com/illustrations/kody/kody_playing_soccer_flying_blue',
		alt: 'Illustration of Kody the Koala kicking a soccer ball surrounded by green leaves, a battery, a onewheel, a snowboard, a solar panel, and a recycle logo.',
		style: square,
	},
	kodyFlyingBackFlippingGray: {
		id: 'kentcdodds.com/illustrations/kody/kody_flipping_flying_gray',
		alt: 'Illustration of Kody the Koala back flipping surrounded by green leaves, a battery, a onewheel, a snowboard, a solar panel, and a recycle logo.',
		style: square,
	},
	kodyFlyingBackFlippingYellow: {
		id: 'kentcdodds.com/illustrations/kody/kody_flipping_flying_yellow',
		alt: 'Illustration of Kody the Koala back flipping surrounded by green leaves, a battery, a onewheel, a snowboard, a solar panel, and a recycle logo.',
		style: square,
	},
	kodyFlyingBackFlippingRed: {
		id: 'kentcdodds.com/illustrations/kody/kody_flipping_flying_red',
		alt: 'Illustration of Kody the Koala back flipping surrounded by green leaves, a battery, a onewheel, a snowboard, a solar panel, and a recycle logo.',
		style: square,
	},
	kodyFlyingBackFlippingBlue: {
		id: 'kentcdodds.com/illustrations/kody/kody_flipping_flying_blue',
		alt: 'Illustration of Kody the Koala back flipping surrounded by green leaves, a battery, a onewheel, a snowboard, a solar panel, and a recycle logo.',
		style: square,
	},
	kodySnowboardingYellow: {
		id: 'kentcdodds.com/illustrations/kody/kody_snowboarding_yellow',
		alt: 'Illustration of Kody the Koala on a snowboard in yellow',
		style: square,
	},
	kodySnowboardingRed: {
		id: 'kentcdodds.com/illustrations/kody/kody_snowboarding_red',
		alt: 'Illustration of Kody the Koala on a snowboard in red',
		style: square,
	},
	kodySnowboardingBlue: {
		id: 'kentcdodds.com/illustrations/kody/kody_snowboarding_blue',
		alt: 'Illustration of Kody the Koala on a snowboard in blue',
		style: square,
	},
	kodySnowboardingGray: {
		id: 'kentcdodds.com/illustrations/kody/kody_snowboarding_gray',
		alt: 'Illustration of Kody the Koala on a snowboard in gray',
		style: square,
	},
	kodyOnewheelingYellow: {
		id: 'kentcdodds.com/illustrations/kody/kody_onewheeling_yellow',
		alt: 'Illustration of Kody the Koala on a snowboard in yellow',
		style: square,
	},
	kodyOnewheelingRed: {
		id: 'kentcdodds.com/illustrations/kody/kody_onewheeling_red',
		alt: 'Illustration of Kody the Koala on a snowboard in red',
		style: square,
	},
	kodyOnewheelingBlue: {
		id: 'kentcdodds.com/illustrations/kody/kody_onewheeling_blue',
		alt: 'Illustration of Kody the Koala on a snowboard in blue',
		style: square,
	},
	kodyOnewheelingGray: {
		id: 'kentcdodds.com/illustrations/kody/kody_onewheeling_gray',
		alt: 'Illustration of Kody the Koala on a snowboard in gray',
		style: square,
	},
	kodyPlayingSoccerYellow: {
		id: 'kentcdodds.com/illustrations/kody/kody_playing_soccer_yellow',
		alt: 'Illustration of Kody the Koala kicking a soccer ball in yellow',
		style: { aspectRatio: '0.892' },
	},
	kodyPlayingSoccerRed: {
		id: 'kentcdodds.com/illustrations/kody/kody_playing_soccer_red',
		alt: 'Illustration of Kody the Koala kicking a soccer ball in red',
		style: { aspectRatio: '0.892' },
	},
	kodyPlayingSoccerBlue: {
		id: 'kentcdodds.com/illustrations/kody/kody_playing_soccer_blue',
		alt: 'Illustration of Kody the Koala kicking a soccer ball in blue',
		style: { aspectRatio: '0.892' },
	},
	kodyPlayingSoccerGray: {
		id: 'kentcdodds.com/illustrations/kody/kody_playing_soccer_gray',
		alt: 'Illustration of Kody the Koala kicking a soccer ball in gray',
		style: { aspectRatio: '0.892' },
	},
	kodyBackFlippingYellow: {
		id: 'kentcdodds.com/illustrations/kody/kody_flipping_yellow',
		alt: 'Illustration of Kody the Koala back flipping in yellow',
		style: { aspectRatio: '0.563' },
	},
	kodyBackFlippingRed: {
		id: 'kentcdodds.com/illustrations/kody/kody_flipping_red',
		alt: 'Illustration of Kody the Koala back flipping in red',
		style: { aspectRatio: '0.563' },
	},
	kodyBackFlippingBlue: {
		id: 'kentcdodds.com/illustrations/kody/kody_flipping_blue',
		alt: 'Illustration of Kody the Koala back flipping in blue',
		style: { aspectRatio: '0.563' },
	},
	kodyBackFlippingGray: {
		id: 'kentcdodds.com/illustrations/kody/kody_flipping_gray',
		alt: 'Illustration of Kody the Koala back flipping in gray',
		style: { aspectRatio: '0.563' },
	},
	helmet: {
		id: 'kentcdodds.com/illustrations/helmet',
		alt: 'Illustration of a helmet',
		style: square,
	},
	bustedOnewheel: {
		id: 'kentcdodds.com/illustrations/404_2_sprold',
		alt: 'Broken onewheel',
	},
	courseAdvancedReactComponentPatterns: {
		id: 'kentcdodds.com/pages/courses/advanced-react-component-patterns',
		alt: 'Illustration for React Class Component Patterns',
		style: square,
	},
	courseAsts: {
		id: 'kentcdodds.com/pages/courses/asts',
		alt: 'Illustration for Code Transformation and Linting with ASTs',
		style: square,
	},
	courseEpicReact: {
		id: 'kentcdodds.com/pages/courses/rocket',
		alt: 'Illustration of a Rocket',
		style: square,
	},
	courseEpicWebLight: {
		id: 'kentcdodds.com/pages/courses/epic-web-light',
		alt: 'The EpicWeb.dev logo',
		style: square,
	},
	courseEpicWebDark: {
		id: 'kentcdodds.com/pages/courses/epic-web-dark',
		alt: 'The EpicWeb.dev logo',
		style: square,
	},
	courseHowToContributeToAnOpenSourceProjectOnGitHub: {
		id: 'kentcdodds.com/pages/courses/how-to-contribute-to-an-open-source-project-on-github',
		alt: 'Illustration for How to Contribute to an Open Source Project on GitHub',
		style: square,
	},
	courseHowToWriteAnOpenSourceJavaScriptLibrary: {
		id: 'kentcdodds.com/pages/courses/how-to-write-an-open-source-javascript-library',
		alt: 'Illustration for How to Write an Open Source JavaScript Library',
		style: square,
	},
	courseSimplifyReactAppsWithReactHooks: {
		id: 'kentcdodds.com/pages/courses/simplify-react-apps-with-react-hooks',
		alt: 'Illustration for Simplify React Apps with React Hooks',
		style: square,
	},
	courseTestingJS: {
		id: 'kentcdodds.com/pages/courses/testing-trophy',
		alt: 'Illustration of a trophy',
		style: square,
	},
	courseTestingPrinciples: {
		id: 'kentcdodds.com/pages/courses/testing-principles',
		alt: 'Illustration for JavaScript Testing Practices and Principles',
		style: square,
	},
	courseTestingReact: {
		id: 'kentcdodds.com/pages/courses/testing-react',
		alt: 'Illustration for Testing React Applications, v2',
		style: square,
	},
	courseTheBeginnersGuideToReact: {
		id: 'kentcdodds.com/pages/courses/the-beginners-guide-to-react',
		alt: `Illustration for The Beginner's Guide to React`,
		style: square,
	},
	courseUpAndRunningWithRemix: {
		id: 'kentcdodds.com/pages/courses/up-and-running-with-remix',
		alt: `Illustration for Up and Running with Remix`,
		style: square,
	},
	courseUseSuspenseToSimplifyYourAsyncUI: {
		id: 'kentcdodds.com/pages/courses/use-suspense-to-simplify-your-async-ui',
		alt: 'Illustration for Use Suspense to Simplify Your Async UI',
		style: square,
	},
	courseFEMAdvancedRemix: {
		id: 'kentcdodds.com/pages/courses/fem-advanced-remix',
		alt: 'Illustration of the Remix logo R with the word "Advanced"',
		style: square,
	},
	courseFEMRemixFundamentals: {
		id: 'kentcdodds.com/pages/courses/fem-remix-fundamentals',
		alt: 'Illustration of the Remix logo R with the word "Fundamentals"',
		style: square,
	},
})

const kodyProfiles: Record<OptionalTeam, { src: string; alt: string }> = {
	RED: {
		src: images.kodyProfileRed({
			resize: { width: 80, type: 'pad', aspectRatio: '1/1' },
		}),
		alt: images.kodyProfileRed.alt,
	},
	BLUE: {
		src: images.kodyProfileBlue({
			resize: { width: 80, height: 80, type: 'pad' },
		}),
		alt: images.kodyProfileBlue.alt,
	},
	YELLOW: {
		src: images.kodyProfileYellow({
			resize: { width: 80, height: 80, type: 'pad' },
		}),
		alt: images.kodyProfileYellow.alt,
	},
	UNKNOWN: {
		src: images.kodyProfileGray({
			resize: { width: 80, height: 80, type: 'pad' },
		}),
		alt: images.kodyProfileGray.alt,
	},
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
const kodyPlayingSoccerImages: Record<OptionalTeam, ImageBuilder> = {
	RED: images.kodyPlayingSoccerRed,
	YELLOW: images.kodyPlayingSoccerYellow,
	BLUE: images.kodyPlayingSoccerBlue,
	UNKNOWN: images.kodyPlayingSoccerGray,
}
const kodyBackFlippingImages: Record<OptionalTeam, ImageBuilder> = {
	RED: images.kodyBackFlippingRed,
	YELLOW: images.kodyBackFlippingYellow,
	BLUE: images.kodyBackFlippingBlue,
	UNKNOWN: images.kodyBackFlippingGray,
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
const kodyFlyingPlayingSoccerImages: Record<OptionalTeam, ImageBuilder> = {
	RED: images.kodyFlyingPlayingSoccerRed,
	YELLOW: images.kodyFlyingPlayingSoccerYellow,
	BLUE: images.kodyFlyingPlayingSoccerBlue,
	UNKNOWN: images.kodyFlyingPlayingSoccerGray,
}
const kodyFlyingBackFlippingImages: Record<OptionalTeam, ImageBuilder> = {
	RED: images.kodyFlyingBackFlippingRed,
	YELLOW: images.kodyFlyingBackFlippingYellow,
	BLUE: images.kodyFlyingBackFlippingBlue,
	UNKNOWN: images.kodyFlyingBackFlippingGray,
}

export function getRandomSportyKody(team?: OptionalTeam | undefined) {
	const activities = [
		kodySnowboardingImages,
		kodySkiingImages,
		kodyOnewheelingImages,
		kodyPlayingSoccerImages,
		kodyBackFlippingImages,
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

export function getRandomFlyingKody(
	team?: OptionalTeam | undefined,
	randomImageNo: number = Math.random(),
) {
	const activities = [
		kodyFlyingSnowboardingImages,
		kodyFlyingSkiingImages,
		kodyFlyingOnewheelingImages,
		kodyFlyingPlayingSoccerImages,
		kodyFlyingBackFlippingImages,
	]
	const set =
		activities[Math.floor(randomImageNo * activities.length)] ??
		kodySnowboardingImages
	if (team) {
		return set[team]
	} else {
		const randomTeam =
			optionalTeams[Math.floor(randomImageNo * optionalTeams.length)] ??
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
		className,
		style,
	}: {
		widths: Array<number>
		sizes: Array<string>
		transformations?: TransformerOption
		className?: string
		style?: CSSProperties
	},
) {
	const averageSize = Math.ceil(widths.reduce((a, s) => a + s) / widths.length)
	const aspectRatio = transformations?.resize?.aspectRatio
		? transformations.resize.aspectRatio.replace(':', '/')
		: transformations?.resize?.height && transformations.resize.width
			? `${transformations.resize.width}/${transformations.resize.height}`
			: imageBuilder.style?.aspectRatio

	return {
		style: {
			...imageBuilder.style,
			aspectRatio,
			...style,
		},
		className: clsx(imageBuilder.className, className),
		alt: imageBuilder.alt,
		src: imageBuilder({
			quality: 'auto',
			format: 'auto',
			...transformations,
			resize: { width: averageSize, ...transformations?.resize },
		}),
		srcSet: widths
			.map((width) =>
				[
					imageBuilder({
						quality: 'auto',
						format: 'auto',
						...transformations,
						resize: { width, ...transformations?.resize },
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
export type { ImageBuilder }
