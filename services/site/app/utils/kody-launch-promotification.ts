export const KODY_LAUNCH_URL = 'https://kody.codes/'

export const KODY_LAUNCH_PROMOTIFICATION_NAME = 'kody-launch-2026-09'

export const KODY_LAUNCH_PROMOTIFICATION_END_TIME = new Date(
	'2026-10-06T06:00:00.000Z',
)

export type KodyLaunchPromotification = {
	promoName: string
	promoEndTime: Date
	message: string
	buttonText: string
}

export function getKodyLaunchPromotification(
	now = new Date(),
): KodyLaunchPromotification | null {
	if (now >= KODY_LAUNCH_PROMOTIFICATION_END_TIME) {
		return null
	}

	return {
		promoName: KODY_LAUNCH_PROMOTIFICATION_NAME,
		promoEndTime: KODY_LAUNCH_PROMOTIFICATION_END_TIME,
		message: 'Kody is live — your AI teammate that ships real work with you.',
		buttonText: 'Meet Kody',
	}
}
