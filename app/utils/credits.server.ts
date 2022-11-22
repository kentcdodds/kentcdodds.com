import * as YAML from 'yaml'
import {downloadFile} from './github.server'
import {getErrorMessage, typedBoolean} from './misc'
import {cachified, verboseReporter} from 'cachified'
import {cache, shouldForceFresh} from './cache.server'

export type Person = {
  name: string
  cloudinaryId: string
  role: string
  description: string
  github: string
  twitter: string
}

type UnknownObj = Record<string, unknown>
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
    if (warnOnFallback) console.warn(`Had to use fallback`, {obj, key, value})
    return fallback
  }
}

const isString = (v: unknown): v is string => typeof v === 'string'

function mapPerson(rawPerson: UnknownObj) {
  try {
    return {
      name: getValueWithFallback(rawPerson, 'name', {
        fallback: 'Unnamed',
        validateType: isString,
      }),
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
      twitter: getValueWithFallback(rawPerson, 'twitter', {
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
  const allPeople = await cachified({
    key,
    cache,
    reporter: verboseReporter(),
    forceFresh: await shouldForceFresh({forceFresh, request, key}),
    ttl: 1000 * 60 * 60 * 24 * 30,
    staleWhileRevalidate: 1000 * 60 * 60 * 24,
    getFreshValue: async () => {
      const creditsString = await downloadFile('content/data/credits.yml')
      const rawCredits = YAML.parse(creditsString)
      if (!Array.isArray(rawCredits)) {
        console.error('Credits is not an array', rawCredits)
        throw new Error('Credits is not an array.')
      }

      return rawCredits.map(mapPerson).filter(typedBoolean)
    },
    checkValue: (value: unknown) => Array.isArray(value),
  })
  return allPeople
}

export {getPeople}
