import type {Team} from '../../types'
import {images, getRandomSportyKody} from '~/images'

export const TEAM_MAP: Record<
  Team,
  {
    image: () => typeof images.kodySnowboardingBlue
    label: string
    focusClassName: string
  }
> = {
  BLUE: {
    image: () => getRandomSportyKody('BLUE'),
    label: 'Blue Team',
    focusClassName: 'ring-team-blue',
  },
  RED: {
    image: () => getRandomSportyKody('RED'),
    label: 'Red Team',
    focusClassName: 'ring-team-red',
  },
  YELLOW: {
    image: () => getRandomSportyKody('YELLOW'),
    label: 'Yellow Team',
    focusClassName: 'ring-team-yellow',
  },
}

export const TEAM_SNOWBOARD_MAP: Record<
  Team,
  {
    image: typeof images.kodySnowboardingBlue
    label: string
    focusClassName: string
  }
> = {
  BLUE: {
    image: images.kodySnowboardingBlue,
    label: 'Blue Team',
    focusClassName: 'ring-team-blue',
  },
  RED: {
    image: images.kodySnowboardingRed,
    label: 'Red Team',
    focusClassName: 'ring-team-red',
  },
  YELLOW: {
    image: images.kodySnowboardingYellow,
    label: 'Yellow Team',
    focusClassName: 'ring-team-yellow',
  },
}

export const TEAM_ONEWHEELING_MAP: Record<
  Team,
  {
    image: typeof images.kodyOnewheelingBlue
    label: string
    focusClassName: string
  }
> = {
  BLUE: {
    image: images.kodyOnewheelingBlue,
    label: 'Blue Team',
    focusClassName: 'ring-team-blue',
  },
  RED: {
    image: images.kodyOnewheelingRed,
    label: 'Red Team',
    focusClassName: 'ring-team-red',
  },
  YELLOW: {
    image: images.kodyOnewheelingYellow,
    label: 'Yellow Team',
    focusClassName: 'ring-team-yellow',
  },
}

export const TEAM_SKIING_MAP: Record<
  Team,
  {
    image: typeof images.kodySkiingBlue
    label: string
    focusClassName: string
  }
> = {
  BLUE: {
    image: images.kodySkiingBlue,
    label: 'Blue Team',
    focusClassName: 'ring-team-blue',
  },
  RED: {
    image: images.kodySkiingRed,
    label: 'Red Team',
    focusClassName: 'ring-team-red',
  },
  YELLOW: {
    image: images.kodySkiingYellow,
    label: 'Yellow Team',
    focusClassName: 'ring-team-yellow',
  },
}
