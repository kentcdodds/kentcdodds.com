// @vitest-environment node
import { expect, test } from 'vitest'

import {
	KODY_LAUNCH_PROMOTIFICATION_END_TIME,
	KODY_LAUNCH_PROMOTIFICATION_NAME,
	getKodyLaunchPromotification,
} from '../kody-launch-promotification.ts'

test('returns the Kody launch promotification before it expires', () => {
	const promotification = getKodyLaunchPromotification(
		new Date('2026-09-08T12:00:00.000Z'),
	)

	expect(promotification).toEqual({
		promoName: KODY_LAUNCH_PROMOTIFICATION_NAME,
		promoEndTime: KODY_LAUNCH_PROMOTIFICATION_END_TIME,
		message: 'Kody is live — your AI teammate that ships real work with you.',
		buttonText: 'Meet Kody',
	})
})

test('returns no promotification once the launch window ends', () => {
	const promotification = getKodyLaunchPromotification(
		KODY_LAUNCH_PROMOTIFICATION_END_TIME,
	)

	expect(promotification).toBeNull()
})
