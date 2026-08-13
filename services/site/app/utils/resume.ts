export const THEATER_RESUME_VIEW = 'theater'
export const THEATER_RESUME_UNLOCK_CLICKS = 5

export type ResumeView = 'full' | 'short' | 'theater'

export function getResumeView(viewParam: string | null): ResumeView {
	switch (viewParam) {
		case 'short':
			return 'short'
		case THEATER_RESUME_VIEW:
			return 'theater'
		default:
			return 'full'
	}
}

export function getResumePath(view: ResumeView) {
	switch (view) {
		case 'short':
			return '/resume?view=short'
		case 'theater':
			return `/resume?view=${THEATER_RESUME_VIEW}`
		case 'full':
			return '/resume'
		default: {
			const exhaustive: never = view
			return exhaustive
		}
	}
}
