"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.illustrationImages = exports.kodyImages = exports.kodyProfiles = exports.images = void 0;
exports.getRandomSportyKody = getRandomSportyKody;
exports.getRandomFlyingKody = getRandomFlyingKody;
exports.getImgProps = getImgProps;
exports.getImageBuilder = getImageBuilder;
exports.getGenericSocialImage = getGenericSocialImage;
exports.getSocialImageWithPreTitle = getSocialImageWithPreTitle;
var cloudinary_build_url_1 = require("cloudinary-build-url");
var clsx_1 = require("clsx");
var emoji_regex_1 = require("emoji-regex");
var misc_tsx_1 = require("./utils/misc.tsx");
(0, cloudinary_build_url_1.setConfig)({
    cloudName: 'kentcdodds-com',
});
var createImages = function (images) {
    var imageBuilders = {};
    for (var _i = 0, _a = Object.entries(images); _i < _a.length; _i++) {
        var _b = _a[_i], name_1 = _b[0], _c = _b[1], id = _c.id, alt = _c.alt, className = _c.className, style = _c.style;
        imageBuilders[name_1] = getImageBuilder(id, alt, { className: className, style: style });
    }
    return imageBuilders;
};
function getImageBuilder(id, alt, _a) {
    if (alt === void 0) { alt = ''; }
    var _b = _a === void 0 ? {} : _a, className = _b.className, style = _b.style;
    function imageBuilder(transformations) {
        return (0, cloudinary_build_url_1.buildImageUrl)(id, { transformations: transformations });
    }
    imageBuilder.alt = alt;
    imageBuilder.id = id;
    imageBuilder.className = className;
    imageBuilder.style = style;
    return imageBuilder;
}
var square = { aspectRatio: '1/1' };
var epicWebClassName = 'h-[76%] -translate-y-[9%] @2xl/grid:-translate-x-[0.2%] @2xl/grid:h-[78%]';
var epicReactClassName = 'h-[82%]';
var testingJSClassName = 'h-[94%] -translate-y-[8%] dark:-translate-x-[0.6%] dark:h-[98%] dark:-translate-y-[6%]';
var epicAIClassName = 'h-[80%] -translate-y-[8%]';
var images = createImages({
    kentSignatureDarkMode: {
        id: 'kent/signature-dark-mode',
        alt: "Kent's signature",
        style: { aspectRatio: '1.891' },
    },
    kentSignatureLightMode: {
        id: 'kent/signature-light-mode',
        alt: "Kent's signature",
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
        id: 'v1746462314/kentcdodds.com/pages/courses/v2/rocket',
        alt: 'Illustration of a Rocket',
        className: epicReactClassName,
    },
    courseEpicReactDark: {
        id: 'v1746462314/kentcdodds.com/pages/courses/v2/rocket-dark',
        alt: 'Illustration of a Rocket',
        className: epicReactClassName,
    },
    courseEpicWebLight: {
        id: 'v1746462310/kentcdodds.com/pages/courses/v2/epic-web',
        alt: 'The EpicWeb.dev logo',
        className: epicWebClassName,
    },
    courseEpicWebDark: {
        id: 'v1746462310/kentcdodds.com/pages/courses/v2/epic-web-dark',
        alt: 'The EpicWeb.dev logo',
        className: epicWebClassName,
    },
    courseEpicAILight: {
        id: 'v1746462310/kentcdodds.com/pages/courses/v2/epic-ai-light',
        alt: 'The EpicAI.pro logo',
        className: epicAIClassName,
    },
    courseEpicAIDark: {
        id: 'v1746462310/kentcdodds.com/pages/courses/v2/epic-ai-dark',
        alt: 'The EpicAI.pro logo',
        className: epicAIClassName,
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
        id: 'v1746462314/kentcdodds.com/pages/courses/v2/trophy',
        alt: 'Illustration of a trophy',
        className: testingJSClassName,
    },
    courseTestingJSDark: {
        id: 'v1746462314/kentcdodds.com/pages/courses/v2/trophy-dark',
        alt: 'Illustration of a trophy',
        className: testingJSClassName,
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
        alt: "Illustration for The Beginner's Guide to React",
        style: square,
    },
    courseUpAndRunningWithRemix: {
        id: 'kentcdodds.com/pages/courses/up-and-running-with-remix',
        alt: "Illustration for Up and Running with Remix",
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
});
exports.images = images;
var kodyProfiles = {
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
};
exports.kodyProfiles = kodyProfiles;
var kodyProfileImages = {
    RED: images.kodyProfileRed,
    YELLOW: images.kodyProfileYellow,
    BLUE: images.kodyProfileBlue,
    UNKNOWN: images.kodyProfileGray,
};
var kodySnowboardingImages = {
    RED: images.kodySnowboardingRed,
    YELLOW: images.kodySnowboardingYellow,
    BLUE: images.kodySnowboardingBlue,
    UNKNOWN: images.kodySnowboardingGray,
};
var kodySkiingImages = {
    RED: images.kodySkiingRed,
    YELLOW: images.kodySkiingYellow,
    BLUE: images.kodySkiingBlue,
    UNKNOWN: images.kodySkiingGray,
};
var kodyOnewheelingImages = {
    RED: images.kodyOnewheelingRed,
    YELLOW: images.kodyOnewheelingYellow,
    BLUE: images.kodyOnewheelingBlue,
    UNKNOWN: images.kodyOnewheelingGray,
};
var kodyPlayingSoccerImages = {
    RED: images.kodyPlayingSoccerRed,
    YELLOW: images.kodyPlayingSoccerYellow,
    BLUE: images.kodyPlayingSoccerBlue,
    UNKNOWN: images.kodyPlayingSoccerGray,
};
var kodyBackFlippingImages = {
    RED: images.kodyBackFlippingRed,
    YELLOW: images.kodyBackFlippingYellow,
    BLUE: images.kodyBackFlippingBlue,
    UNKNOWN: images.kodyBackFlippingGray,
};
var kodyFlyingSnowboardingImages = {
    RED: images.kodyFlyingSnowboardingRed,
    YELLOW: images.kodyFlyingSnowboardingYellow,
    BLUE: images.kodyFlyingSnowboardingBlue,
    UNKNOWN: images.kodyFlyingSnowboardingGray,
};
var kodyFlyingSkiingImages = {
    RED: images.kodyFlyingSkiingRed,
    YELLOW: images.kodyFlyingSkiingYellow,
    BLUE: images.kodyFlyingSkiingBlue,
    UNKNOWN: images.kodyFlyingSkiingGray,
};
var kodyFlyingOnewheelingImages = {
    RED: images.kodyFlyingOnewheelingRed,
    YELLOW: images.kodyFlyingOnewheelingYellow,
    BLUE: images.kodyFlyingOnewheelingBlue,
    UNKNOWN: images.kodyFlyingOnewheelingGray,
};
var kodyFlyingPlayingSoccerImages = {
    RED: images.kodyFlyingPlayingSoccerRed,
    YELLOW: images.kodyFlyingPlayingSoccerYellow,
    BLUE: images.kodyFlyingPlayingSoccerBlue,
    UNKNOWN: images.kodyFlyingPlayingSoccerGray,
};
var kodyFlyingBackFlippingImages = {
    RED: images.kodyFlyingBackFlippingRed,
    YELLOW: images.kodyFlyingBackFlippingYellow,
    BLUE: images.kodyFlyingBackFlippingBlue,
    UNKNOWN: images.kodyFlyingBackFlippingGray,
};
function getRandomSportyKody(team) {
    var _a, _b;
    var activities = [
        kodySnowboardingImages,
        kodySkiingImages,
        kodyOnewheelingImages,
        kodyPlayingSoccerImages,
        kodyBackFlippingImages,
    ];
    var set = (_a = activities[Math.floor(Math.random() * activities.length)]) !== null && _a !== void 0 ? _a : kodySnowboardingImages;
    if (team) {
        return set[team];
    }
    else {
        var randomTeam = (_b = misc_tsx_1.optionalTeams[Math.floor(Math.random() * misc_tsx_1.optionalTeams.length)]) !== null && _b !== void 0 ? _b : 'UNKNOWN';
        return set[randomTeam];
    }
}
function getRandomFlyingKody(team, randomImageNo) {
    var _a, _b;
    if (randomImageNo === void 0) { randomImageNo = Math.random(); }
    var activities = [
        kodyFlyingSnowboardingImages,
        kodyFlyingSkiingImages,
        kodyFlyingOnewheelingImages,
        kodyFlyingPlayingSoccerImages,
        kodyFlyingBackFlippingImages,
    ];
    var set = (_a = activities[Math.floor(randomImageNo * activities.length)]) !== null && _a !== void 0 ? _a : kodySnowboardingImages;
    if (team) {
        return set[team];
    }
    else {
        var randomTeam = (_b = misc_tsx_1.optionalTeams[Math.floor(randomImageNo * misc_tsx_1.optionalTeams.length)]) !== null && _b !== void 0 ? _b : 'UNKNOWN';
        return set[randomTeam];
    }
}
var illustrationImages = {
    teslaY: images.teslaY,
    solarPanels: images.solarPanels,
    snowboard: images.snowboard,
    skis: images.skis,
    kayak: images.kayak,
    onewheel: images.onewheel,
    microphone: images.microphone,
    helmet: images.helmet,
};
exports.illustrationImages = illustrationImages;
function getImgProps(imageBuilder, _a) {
    var _b, _c, _d;
    var widths = _a.widths, sizes = _a.sizes, transformations = _a.transformations, className = _a.className, style = _a.style;
    var averageSize = Math.ceil(widths.reduce(function (a, s) { return a + s; }) / widths.length);
    var aspectRatio = ((_b = transformations === null || transformations === void 0 ? void 0 : transformations.resize) === null || _b === void 0 ? void 0 : _b.aspectRatio)
        ? transformations.resize.aspectRatio.replace(':', '/')
        : ((_c = transformations === null || transformations === void 0 ? void 0 : transformations.resize) === null || _c === void 0 ? void 0 : _c.height) && transformations.resize.width
            ? "".concat(transformations.resize.width, "/").concat(transformations.resize.height)
            : (_d = imageBuilder.style) === null || _d === void 0 ? void 0 : _d.aspectRatio;
    return {
        style: __assign(__assign(__assign({}, imageBuilder.style), { aspectRatio: aspectRatio }), style),
        className: (0, clsx_1.default)(imageBuilder.className, className),
        alt: imageBuilder.alt,
        src: imageBuilder(__assign(__assign({ quality: 'auto', format: 'auto' }, transformations), { resize: __assign({ width: averageSize }, transformations === null || transformations === void 0 ? void 0 : transformations.resize) })),
        srcSet: widths
            .map(function (width) {
            return [
                imageBuilder(__assign(__assign({ quality: 'auto', format: 'auto' }, transformations), { resize: __assign({ width: width }, transformations === null || transformations === void 0 ? void 0 : transformations.resize) })),
                "".concat(width, "w"),
            ].join(' ');
        })
            .join(', '),
        sizes: sizes.join(', '),
        crossOrigin: 'anonymous',
    };
}
function getSocialImageWithPreTitle(_a) {
    var title = _a.title, preTitle = _a.preTitle, img = _a.featuredImage, url = _a.url;
    var vars = "$th_1256,$tw_2400,$gw_$tw_div_24,$gh_$th_div_12";
    var encodedPreTitle = doubleEncode(emojiStrip(preTitle));
    var preTitleSection = "co_rgb:a9adc1,c_fit,g_north_west,w_$gw_mul_14,h_$gh,x_$gw_mul_1.5,y_$gh_mul_1.3,l_text:kentcdodds.com:Matter-Regular.woff2_50:".concat(encodedPreTitle);
    var encodedTitle = doubleEncode(emojiStrip(title));
    var titleSection = "co_white,c_fit,g_north_west,w_$gw_mul_13.5,h_$gh_mul_7,x_$gw_mul_1.5,y_$gh_mul_2.3,l_text:kentcdodds.com:Matter-Regular.woff2_110:".concat(encodedTitle);
    var kentProfileSection = "c_fit,g_north_west,r_max,w_$gw_mul_4,h_$gh_mul_3,x_$gw,y_$gh_mul_8,l_kent:profile-transparent";
    var kentNameSection = "co_rgb:a9adc1,c_fit,g_north_west,w_$gw_mul_5.5,h_$gh_mul_4,x_$gw_mul_4.5,y_$gh_mul_9,l_text:kentcdodds.com:Matter-Regular.woff2_70:Kent%20C.%20Dodds";
    var encodedUrl = doubleEncode(emojiStrip(url));
    var urlSection = "co_rgb:a9adc1,c_fit,g_north_west,w_$gw_mul_9,x_$gw_mul_4.5,y_$gh_mul_9.8,l_text:kentcdodds.com:Matter-Regular.woff2_40:".concat(encodedUrl);
    var featuredImageIsRemote = img.startsWith('http');
    var featuredImageCloudinaryId = featuredImageIsRemote
        ? (0, misc_tsx_1.toBase64)(img)
        : img.replace(/\//g, ':');
    var featuredImageLayerType = featuredImageIsRemote ? 'l_fetch:' : 'l_';
    var featuredImageSection = "c_fill,ar_3:4,r_12,g_east,h_$gh_mul_10,x_$gw,".concat(featuredImageLayerType).concat(featuredImageCloudinaryId);
    return [
        "https://res.cloudinary.com/kentcdodds-com/image/upload",
        vars,
        preTitleSection,
        titleSection,
        kentProfileSection,
        kentNameSection,
        urlSection,
        featuredImageSection,
        "c_fill,w_$tw,h_$th/kentcdodds.com/social-background.png",
    ].join('/');
}
function getGenericSocialImage(_a) {
    var words = _a.words, img = _a.featuredImage, url = _a.url;
    var vars = "$th_1256,$tw_2400,$gw_$tw_div_24,$gh_$th_div_12";
    var encodedWords = doubleEncode(emojiStrip(words));
    var primaryWordsSection = "co_white,c_fit,g_north_west,w_$gw_mul_10,h_$gh_mul_7,x_$gw_mul_1.3,y_$gh_mul_1.5,l_text:kentcdodds.com:Matter-Regular.woff2_110:".concat(encodedWords);
    var kentProfileSection = "c_fit,g_north_west,r_max,w_$gw_mul_4,h_$gh_mul_3,x_$gw,y_$gh_mul_8,l_kent:profile-transparent";
    var kentNameSection = "co_rgb:a9adc1,c_fit,g_north_west,w_$gw_mul_5.5,h_$gh_mul_4,x_$gw_mul_4.5,y_$gh_mul_9,l_text:kentcdodds.com:Matter-Regular.woff2_70:Kent%20C.%20Dodds";
    var encodedUrl = doubleEncode(emojiStrip(url));
    var urlSection = "co_rgb:a9adc1,c_fit,g_north_west,w_$gw_mul_5.5,x_$gw_mul_4.5,y_$gh_mul_9.8,l_text:kentcdodds.com:Matter-Regular.woff2_40:".concat(encodedUrl);
    var featuredImageIsRemote = img.startsWith('http');
    var featuredImageCloudinaryId = featuredImageIsRemote
        ? (0, misc_tsx_1.toBase64)(img)
        : img.replace(/\//g, ':');
    var featuredImageLayerType = featuredImageIsRemote ? 'l_fetch:' : 'l_';
    var featureImageSection = "c_fit,g_east,w_$gw_mul_11,h_$gh_mul_11,x_$gw,".concat(featuredImageLayerType).concat(featuredImageCloudinaryId);
    var backgroundSection = "c_fill,w_$tw,h_$th/kentcdodds.com/social-background.png";
    return [
        "https://res.cloudinary.com/kentcdodds-com/image/upload",
        vars,
        primaryWordsSection,
        kentProfileSection,
        kentNameSection,
        urlSection,
        featureImageSection,
        backgroundSection,
    ].join('/');
}
function emojiStrip(string) {
    return (string
        .replace((0, emoji_regex_1.default)(), '')
        // get rid of double spaces:
        .split(' ')
        .filter(Boolean)
        .join(' ')
        .trim());
}
// cloudinary needs double-encoding
function doubleEncode(s) {
    return encodeURIComponent(encodeURIComponent(s));
}
var kodyImages = {
    profile: kodyProfileImages,
    snowboarding: kodySnowboardingImages,
    skiing: kodySkiingImages,
    onewheeling: kodyOnewheelingImages,
    playingSoccer: kodyPlayingSoccerImages,
    backFlipping: kodyBackFlippingImages,
    flyingSnowboarding: kodyFlyingSnowboardingImages,
    flyingSkiing: kodyFlyingSkiingImages,
    flyingOnewheeling: kodyFlyingOnewheelingImages,
    flyingPlayingSoccer: kodyFlyingPlayingSoccerImages,
    flyingBackFlipping: kodyFlyingBackFlippingImages,
};
exports.kodyImages = kodyImages;
