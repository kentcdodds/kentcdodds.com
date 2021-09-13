import type {Team} from '../../types'
import {images} from '~/images'

export const TEAM_MAP: Record<
  Team,
  {image: typeof images.kodyBlue; label: string; focusClassName: string}
> = {
  BLUE: {
    image: images.kodyBlue,
    label: 'Blue Team',
    focusClassName: 'ring-team-blue',
  },
  RED: {
    image: images.kodyRed,
    label: 'Red Team',
    focusClassName: 'ring-team-red',
  },
  YELLOW: {
    image: images.kodyYellow,
    label: 'Yellow Team',
    focusClassName: 'ring-team-yellow',
  },
}
