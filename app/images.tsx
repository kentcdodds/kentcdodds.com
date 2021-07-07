const createImages = <
  ImageType extends Record<string, {src: string; alt: string}>,
>(
  images: ImageType,
) => images

const images = createImages({
  kentTransparentProfile: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/v1625699254/kentcdodds.com/profile-transparent.png',
    alt: 'Kent C. Dodds',
  },
  kentProfile: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/v1625699252/kentcdodds.com/profile.jpg',
    alt: 'Kent C. Dodds',
  },
  kentSnowSports: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/v1625696827/kentcdodds.com/pages/home/kent-snow-sports.jpg',
    alt: 'Kent wearing snow clothes with skis and a snowboard',
  },
  kentCodingWithKody: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/v1625697305/kentcdodds.com/pages/home/kent-coding-with-kody.jpg',
    alt: 'Kent sitting with his laptop on a bench next to Kody the Koala',
  },
  kentRidingOnewheelOutdoors: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/v1625697530/kentcdodds.com/pages/home/kent-riding-onewheel-outdoors.jpg',
    alt: 'Kent riding a onewheel outdoors',
  },
  kentRidingOnewheelOutdoorsFast: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/v1625697660/kentcdodds.com/pages/home/kent-riding-onewheel-outdoors-fast.jpg',
    alt: 'Kent riding a onewheel outdoors fast',
  },
  kentPalmingSoccerBall: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/v1625698000/kentcdodds.com/pages/home/kent-palming-soccer-ball.jpg',
    alt: 'Kent holding a soccer ball',
  },

  alexProfileYellow: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0/v1624985244/kentcdodds.com/illustrations/yellow-head.png',
    alt: 'Mascot Profile in Yellow',
  },
  alexProfileBlue: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0/v1624985176/kentcdodds.com/illustrations/blue-head.png',
    alt: 'Mascot Profile in Blue',
  },
  alexProfileRed: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0/v1624985230/kentcdodds.com/illustrations/red-head.png',
    alt: 'Mascot Profile in Red',
  },
  alexProfileGray: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0/v1624985184/kentcdodds.com/illustrations/gray-head.png',
    alt: 'Mascot Profile in Gray',
  },
  teslaX: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/v1625515891/kentcdodds.com/illustrations/tesla_zphbjp.png',
    alt: 'Illustration of a Tesla Model X',
  },
  solarPanels: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/v1625515816/kentcdodds.com/illustrations/solar_panels_2_ftbwvb.png',
    alt: 'Illustration of Solar Panels',
  },
  snowboard: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/v1625515780/kentcdodds.com/illustrations/snowboard_nqqlyr.png',
    alt: 'Illustration of a snowboard',
  },
  skis: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/v1625515722/kentcdodds.com/illustrations/skis_z5lkc3.png',
    alt: 'Illustration of skis',
  },
  kayak: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0,c_crop,w_1200,h_900/v1624985232/kentcdodds.com/illustrations/rowing.png',
    alt: 'Illustration of a kayak',
  },
  onewheel: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0/v1624985197/kentcdodds.com/illustrations/one_wheel.png',
    alt: 'Illustration of a onewheel',
  },
  alexSnowboardingWithCable: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0/v1624985195/kentcdodds.com/illustrations/m15.png',
    alt: 'Illistration of a mascot standing on a snowboard surrounded by green leaves, a battery, two skies, a one-wheel, a solar panel, a recycle logo, and a cable.',
  },
  alexSnowboarding: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/v1625515648/kentcdodds.com/illustrations/m14_s8mwg1.png',
    alt: 'Illistration of a mascot standing on a snowboard surrounded by green leaves, a battery, two skies, a one-wheel, a solar panel, and a recycle logo.',
  },
  alexSnowboardingWithHandOut: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/v1625515593/kentcdodds.com/illustrations/image_yzvt1w.png',
    alt: 'Illistration of a mascot standing on a snowboard surrounded by green leaves, a battery, two skies, a one-wheel, a solar panel, and a recycle logo.',
  },
  helmet: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0/v1624985188/kentcdodds.com/illustrations/helmet.png',
    alt: 'Illustration of a helmet',
  },
  alexYellow: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0/v1624985181/kentcdodds.com/illustrations/character_y.png',
    alt: 'Illustration of snowboarder in yellow',
  },
  alexRed: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0/v1624985179/kentcdodds.com/illustrations/character_r.png',
    alt: 'Illustration of snowboarder in red',
  },
  alexBlue: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0/v1624985177/kentcdodds.com/illustrations/character_b.png',
    alt: 'Illustration of snowboarder in blue',
  },
  bustedOnewheel: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/v1625515170/kentcdodds.com/illustrations/404_2_sprold.png',
    alt: 'Broken onewheel',
  },
})

export {images}
