import { cachified, verboseReporter } from '@epic-web/cachified'
import slugify from '@sindresorhus/slugify'
import * as YAML from 'yaml'
import { cache, shouldForceFresh } from './cache.server.ts'
import { downloadFile } from './github.server.ts'
import { getErrorMessage, typedBoolean } from './misc.ts'

export type Person = {
	id: string
	name: string
	cloudinaryId: string
	role: string
	description: string
	github: string
	x: string
}

type UnknownObj = Record<string, unknown>
const isUnknownObj = (v: unknown): v is UnknownObj =>
	typeof v === 'object' && v !== null

function getValueWithFallback<PropertyType>(
	obj: UnknownObj,
	key: string,
	{
		fallback,
		warnOnFallback = true,
		validateType,
	}: {
		fallback?: PropertyType
		warnOnFallback?: boolean
		validateType: (v: unknown) => v is PropertyType
	},
) {
	const value = obj[key]
	if (validateType(value)) {
		return value
	} else if (typeof fallback === 'undefined') {
		throw new Error(
			`${key} is not set properly and no fallback is provided. It's ${typeof value}`,
		)
	} else {
		if (warnOnFallback) console.warn(`Had to use fallback`, { obj, key, value })
		return fallback
	}
}

const isString = (v: unknown): v is string => typeof v === 'string'
const hasStringId = (v: unknown): v is UnknownObj & { id: string } =>
	isUnknownObj(v) && isString(v.id)

function normalizePeople(people: ReadonlyArray<unknown>) {
	return people.filter(isUnknownObj).map(mapPerson).filter(typedBoolean)
}

function mapPerson(rawPerson: UnknownObj) {
	try {
		const name = getValueWithFallback(rawPerson, 'name', {
			fallback: 'Unnamed',
			validateType: isString,
		})
		const id = getValueWithFallback(rawPerson, 'id', {
			fallback: slugify(name),
			validateType: isString,
		})

		return {
			id,
			name,
			cloudinaryId: getValueWithFallback(rawPerson, 'cloudinaryId', {
				fallback: 'kentcdodds.com/illustrations/kody_profile_white',
				validateType: isString,
			}),
			role: getValueWithFallback(rawPerson, 'role', {
				fallback: 'Unknown',
				validateType: isString,
			}),
			description: getValueWithFallback(rawPerson, 'description', {
				fallback: 'Being awesome',
				validateType: isString,
			}),
			github: getValueWithFallback(rawPerson, 'github', {
				fallback: null,
				warnOnFallback: false,
				validateType: isString,
			}),
			x: getValueWithFallback(rawPerson, 'x', {
				fallback: null,
				warnOnFallback: false,
				validateType: isString,
			}),
			website: getValueWithFallback(rawPerson, 'website', {
				fallback: null,
				warnOnFallback: false,
				validateType: isString,
			}),
			dribbble: getValueWithFallback(rawPerson, 'dribbble', {
				fallback: null,
				warnOnFallback: false,
				validateType: isString,
			}),
			linkedin: getValueWithFallback(rawPerson, 'linkedin', {
				fallback: null,
				warnOnFallback: false,
				validateType: isString,
			}),
			instagram: getValueWithFallback(rawPerson, 'instagram', {
				fallback: null,
				warnOnFallback: false,
				validateType: isString,
			}),
			codepen: getValueWithFallback(rawPerson, 'codepen', {
				fallback: null,
				warnOnFallback: false,
				validateType: isString,
			}),
			twitch: getValueWithFallback(rawPerson, 'twitch', {
				fallback: null,
				warnOnFallback: false,
				validateType: isString,
			}),
			behance: getValueWithFallback(rawPerson, 'behance', {
				fallback: null,
				warnOnFallback: false,
				validateType: isString,
			}),
		}
	} catch (error: unknown) {
		console.error(getErrorMessage(error), rawPerson)
		return null
	}
}

async function getPeople({
	request,
	forceFresh,
}: {
	request?: Request
	forceFresh?: boolean
}) {
	const key = 'content:data:credits.yml'
	const allPeople = await cachified(
		{
			key,
			cache,
			forceFresh: await shouldForceFresh({ forceFresh, request, key }),
			ttl: 1000 * 60 * 60 * 24 * 30,
			staleWhileRevalidate: 1000 * 60 * 60 * 24,
			getFreshValue: async () => {
				const creditsString = await downloadFile('content/data/credits.yml')
				const rawCredits = YAML.parse(creditsString)
				if (!Array.isArray(rawCredits)) {
					console.error('Credits is not an array', rawCredits)
					throw new Error('Credits is not an array.')
				}

				return normalizePeople(rawCredits)
			},
			checkValue: (value: unknown) =>
				Array.isArray(value) && value.every(hasStringId),
		},
		verboseReporter(),
	)
	// We normalize after `cachified` too because `checkValue` can reject stale data,
	// `getFreshValue` can fail (for example if GitHub is unavailable), and
	// `cachified` may still return fallbackToCache data under forceFresh semantics.
	return normalizePeople(allPeople)
}

export { getPeople }
