import { describe, expect, test } from 'vitest'
import {
	formatColdStartTiming,
	mergeColdStartTimingHeaders,
} from './cold-start-timing.ts'

describe('cold start timing headers', () => {
	test('formats and merges timing parts', () => {
		expect(formatColdStartTiming({ manifest: 12.345, bundle: 0.5 })).toBe(
			'manifest=12.3,bundle=0.5',
		)
		expect(
			mergeColdStartTimingHeaders(
				'manifest=10.0,bundle=100.0',
				'bridges=50.0,request=200.0',
			),
		).toBe('manifest=10.0,bundle=100.0,bridges=50.0,request=200.0')
	})
})
