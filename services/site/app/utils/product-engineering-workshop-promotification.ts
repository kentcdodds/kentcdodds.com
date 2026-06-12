export const PRODUCT_ENGINEERING_WORKSHOP_URL =
	'https://www.epicproduct.engineer/events/product-engineering-workshop-2026-07'

export const PRODUCT_ENGINEERING_WORKSHOP_DISCOUNT_PROMOTIFICATION_NAME =
	'product-engineering-workshop-2026-07-discount'
export const PRODUCT_ENGINEERING_WORKSHOP_PROMOTIFICATION_NAME =
	'product-engineering-workshop-2026-07'

export const PRODUCT_ENGINEERING_WORKSHOP_DISCOUNT_END_TIME = new Date(
	'2026-06-16T06:59:59.999Z',
)
export const PRODUCT_ENGINEERING_WORKSHOP_START_TIME = new Date(
	'2026-07-07T15:00:00.000Z',
)

export type ProductEngineeringWorkshopPromotification = {
	promoName: string
	promoEndTime: Date
	message: string
	buttonText: string
}

export function getProductEngineeringWorkshopPromotification(
	now = new Date(),
): ProductEngineeringWorkshopPromotification | null {
	if (now < PRODUCT_ENGINEERING_WORKSHOP_DISCOUNT_END_TIME) {
		return {
			promoName: PRODUCT_ENGINEERING_WORKSHOP_DISCOUNT_PROMOTIFICATION_NAME,
			promoEndTime: PRODUCT_ENGINEERING_WORKSHOP_DISCOUNT_END_TIME,
			message:
				'Save 40% on the July Product Engineering Workshop with Kent C. Dodds.',
			buttonText: 'Claim the discount',
		}
	}

	if (now < PRODUCT_ENGINEERING_WORKSHOP_START_TIME) {
		return {
			promoName: PRODUCT_ENGINEERING_WORKSHOP_PROMOTIFICATION_NAME,
			promoEndTime: PRODUCT_ENGINEERING_WORKSHOP_START_TIME,
			message: 'Join the July Product Engineering Workshop with Kent C. Dodds.',
			buttonText: 'Reserve your spot',
		}
	}

	return null
}
