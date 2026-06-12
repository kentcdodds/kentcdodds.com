// @vitest-environment node
import { expect, test } from 'vitest'

import {
	PRODUCT_ENGINEERING_WORKSHOP_DISCOUNT_END_TIME,
	PRODUCT_ENGINEERING_WORKSHOP_DISCOUNT_PROMOTIFICATION_NAME,
	PRODUCT_ENGINEERING_WORKSHOP_PROMOTIFICATION_NAME,
	PRODUCT_ENGINEERING_WORKSHOP_START_TIME,
	getProductEngineeringWorkshopPromotification,
} from '../product-engineering-workshop-promotification.ts'

test('returns the discount promotification before the discount expires', () => {
	const promotification = getProductEngineeringWorkshopPromotification(
		new Date('2026-06-12T12:00:00.000Z'),
	)

	expect(promotification).toEqual({
		promoName: PRODUCT_ENGINEERING_WORKSHOP_DISCOUNT_PROMOTIFICATION_NAME,
		promoEndTime: PRODUCT_ENGINEERING_WORKSHOP_DISCOUNT_END_TIME,
		message:
			'Learn the Durable Skills of a Product Engineer with Kent on July 7th at a 40% discount.',
		buttonText: 'Claim the discount',
	})
})

test('returns the workshop promotification after the discount expires', () => {
	const promotification = getProductEngineeringWorkshopPromotification(
		PRODUCT_ENGINEERING_WORKSHOP_DISCOUNT_END_TIME,
	)

	expect(promotification).toEqual({
		promoName: PRODUCT_ENGINEERING_WORKSHOP_PROMOTIFICATION_NAME,
		promoEndTime: PRODUCT_ENGINEERING_WORKSHOP_START_TIME,
		message: 'Join the July Product Engineering Workshop with Kent C. Dodds.',
		buttonText: 'Reserve your spot',
	})
})

test('returns no promotification once the workshop starts', () => {
	const promotification = getProductEngineeringWorkshopPromotification(
		PRODUCT_ENGINEERING_WORKSHOP_START_TIME,
	)

	expect(promotification).toBeNull()
})
