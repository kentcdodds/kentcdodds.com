import { expect, test } from 'vitest'
import {
	appendAgentDiscoveryHeaders,
	appendApiCatalogHeaders,
	getAgentApiCatalog,
	shouldAppendAgentDiscoveryHeaders,
} from '../agent-discovery.ts'

test('appends homepage discovery links for useful agent resources', () => {
	const headers = new Headers()

	appendAgentDiscoveryHeaders(headers)

	const linkHeader = headers.get('Link')

	expect(linkHeader).toContain('</.well-known/api-catalog>; rel="api-catalog"')
	expect(linkHeader).toContain('</about-mcp>; rel="service-doc"')
})

test('only the homepage gets agent discovery headers', () => {
	expect(
		shouldAppendAgentDiscoveryHeaders(new Request('https://kentcdodds.com/')),
	).toBe(true)
	expect(
		shouldAppendAgentDiscoveryHeaders(
			new Request('https://kentcdodds.com/about'),
		),
	).toBe(false)
})

test('api catalog includes machine-readable agent resources', () => {
	const catalog = getAgentApiCatalog(
		new Request('https://kentcdodds.com/', {
			headers: { host: 'kentcdodds.com' },
		}),
	)

	expect(catalog.linkset[0]?.anchor).toBe(
		'https://kentcdodds.com/.well-known/api-catalog',
	)
	expect(catalog.linkset[0]?.item).toEqual([
		expect.objectContaining({ href: 'https://kentcdodds.com/mcp' }),
	])
	expect(catalog.linkset[1]).toEqual(
		expect.objectContaining({
			anchor: 'https://kentcdodds.com/mcp',
			describedby: expect.arrayContaining([
				expect.objectContaining({
					href: 'https://kentcdodds.com/.well-known/oauth-protected-resource',
				}),
				expect.objectContaining({
					href: 'https://kentcdodds.com/.well-known/oauth-authorization-server',
				}),
			]),
			'service-doc': expect.arrayContaining([
				expect.objectContaining({ href: 'https://kentcdodds.com/about-mcp' }),
			]),
		}),
	)
})

test('api catalog responses advertise themselves with api-catalog relation', () => {
	const headers = new Headers()

	appendApiCatalogHeaders(headers)

	expect(headers.get('Link')).toContain(
		'</.well-known/api-catalog>; rel="api-catalog"',
	)
})
