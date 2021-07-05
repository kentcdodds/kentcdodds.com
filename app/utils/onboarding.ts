import type {Team} from '../../types'
import {images} from '../images'

export const TEAM_MAP: Record<
  Team,
  {image: {src: string; alt: string}; label: string; focusClassName: string}
> = {
  BLUE: {
    image: images.alexBlue,
    label: 'Blue Team',
    focusClassName: 'ring-team-blue',
  },
  RED: {
    image: images.alexRed,
    label: 'Red Team',
    focusClassName: 'ring-team-red',
  },
  YELLOW: {
    image: images.alexYellow,
    label: 'Yellow Team',
    focusClassName: 'ring-team-yellow',
  },
}
