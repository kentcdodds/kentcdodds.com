import { expect, test } from 'vitest'
import { getSocialMetas } from '../seo.ts'

test('getSocialMetas emits Open Graph tags with property, not name', () => {
	const metas = getSocialMetas({
		url: 'https://kentcdodds.com/login',
		title: 'Login to kentcdodds.com',
		description: 'Sign in to your account',
		image: 'https://kentcdodds.com/img/social.png',
		keywords: 'login, auth',
		ogType: 'website',
	})

	const ogMetas = metas.filter(
		(meta): meta is { property: string; content: string } =>
			'property' in meta && typeof meta.property === 'string',
	)
	const ogByProperty = Object.fromEntries(
		ogMetas.map((meta) => [meta.property, meta.content]),
	)

	expect(ogByProperty).toEqual({
		'og:url': 'https://kentcdodds.com/login',
		'og:title': 'Login to kentcdodds.com',
		'og:description': 'Sign in to your account',
		'og:image': 'https://kentcdodds.com/img/social.png',
		'og:type': 'website',
	})

	expect(
		metas.some(
			(meta) =>
				'name' in meta &&
				typeof meta.name === 'string' &&
				meta.name.startsWith('og:'),
		),
	).toBe(false)
})

test('getSocialMetas keeps twitter and plain meta tags on name', () => {
	const metas = getSocialMetas({
		url: 'https://kentcdodds.com/',
		title: 'Kent C. Dodds',
		description: 'Quality software',
		image: 'https://kentcdodds.com/img/social.png',
		keywords: 'react, javascript',
	})

	const namedMetas = metas.filter(
		(meta): meta is { name: string; content: string | undefined } =>
			'name' in meta && typeof meta.name === 'string',
	)
	const byName = Object.fromEntries(
		namedMetas.map((meta) => [meta.name, meta.content]),
	)

	expect(byName).toMatchObject({
		description: 'Quality software',
		keywords: 'react, javascript',
		image: 'https://kentcdodds.com/img/social.png',
		'twitter:card': 'summary_large_image',
		'twitter:creator': '@kentcdodds',
		'twitter:site': '@kentcdodds',
		'twitter:title': 'Kent C. Dodds',
		'twitter:description': 'Quality software',
		'twitter:image': 'https://kentcdodds.com/img/social.png',
		'twitter:image:alt': 'Kent C. Dodds',
	})
})
