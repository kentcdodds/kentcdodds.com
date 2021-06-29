const createOperations = <
  ImageType extends Record<string, {src: string; alt: string}>,
>(
  images: ImageType,
) => images

const images = createOperations({
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
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0/v1624985242/kentcdodds.com/illustrations/tesla.png',
    alt: 'Illustration of a Tesla Model X',
  },
  solarPanels: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0/v1624985238/kentcdodds.com/illustrations/solar_panels_2.png',
    alt: 'Illustration of Solar Panels',
  },
  snowboard: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0/v1624985237/kentcdodds.com/illustrations/snowboard.png',
    alt: 'Illustration of a snowboard',
  },
  skis: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0/v1624985234/kentcdodds.com/illustrations/skis.png',
    alt: 'Illustration of skis',
  },
  kayak: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0/v1624985232/kentcdodds.com/illustrations/rowing.png',
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
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0/v1624985193/kentcdodds.com/illustrations/m14.png',
    alt: 'Illistration of a mascot standing on a snowboard surrounded by green leaves, a battery, two skies, a one-wheel, a solar panel, and a recycle logo.',
  },
  alexSnowboardingWithHandOut: {
    src: 'https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0/v1624985190/kentcdodds.com/illustrations/image.png',
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
})

export {images}
