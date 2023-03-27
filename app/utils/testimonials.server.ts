import * as YAML from 'yaml'
import {pick} from 'lodash'
import {downloadFile} from './github.server'
import {getErrorMessage, typedBoolean} from './misc'
import {cache, cachified} from './cache.server'
import type {Timings} from './timing.server'
import {markdownToHtml} from './markdown.server'

const allCategories = [
  'teaching',
  'react',
  'testing',
  'courses',
  'workshop',
  'community',
  'podcast',
  'youtube',
  'talk',
  'blog',
  'remix',
] as const
export type TestimonialCategory = (typeof allCategories)[number]

const allSubjects = [
  'EpicReact.dev',
  'TestingJavaScript.com',
  'Discord Community',
  'Workshop',
  'Call Kent Podcast',
  'Chats with Kent Podcast',
  'YouTube Live Streams',
  'KCD Office Hours',
  'Talk',
  'Blog',
  'Frontend Masters',
  'Egghead.io',
  'workshop: react-fundamentals',
  'workshop: react-hooks',
  'workshop: advanced-react-hooks',
  'workshop: advanced-react-patterns',
  'workshop: react-performance',
  'workshop: react-suspense',
  'workshop: testing-react-apps',
  'workshop: build-an-epic-react-app',
  'workshop: testing-fundamentals',
  'workshop: testing-node-apps',
  'workshop: web-app-fundamentals-part-1',
  'workshop: web-app-fundamentals-part-2',
  'Other',
] as const
export type TestimonialSubject = (typeof allSubjects)[number]

export type Testimonial = {
  author: string
  cloudinaryId: string
  company: string
  testimonial: string
  link: string | null
}

export type TestimonialWithMetadata = Testimonial & {
  priority: 0 | 1 | 2 | 3 | 4 | 5
  subjects: Array<TestimonialSubject>
  categories: Array<TestimonialCategory>
}

const categoriesBySubject: Record<
  TestimonialSubject,
  Array<TestimonialCategory>
> = {
  'Discord Community': ['community'],
  'EpicReact.dev': ['teaching', 'courses', 'react'],
  'TestingJavaScript.com': ['teaching', 'courses', 'testing'],
  Workshop: ['workshop'],
  'Call Kent Podcast': ['podcast'],
  'Chats with Kent Podcast': ['podcast'],
  'YouTube Live Streams': ['youtube'],
  'KCD Office Hours': ['youtube'],
  Talk: ['talk'],
  Blog: ['blog'],
  'Frontend Masters': ['courses'],
  'Egghead.io': ['courses'],
  'workshop: react-fundamentals': ['workshop', 'react'],
  'workshop: react-hooks': ['workshop', 'react'],
  'workshop: advanced-react-hooks': ['workshop', 'react'],
  'workshop: advanced-react-patterns': ['workshop', 'react'],
  'workshop: react-performance': ['workshop', 'react'],
  'workshop: react-suspense': ['workshop', 'react'],
  'workshop: testing-react-apps': ['workshop', 'react', 'testing'],
  'workshop: build-an-epic-react-app': ['workshop', 'react', 'testing'],
  'workshop: testing-fundamentals': ['workshop', 'react', 'testing'],
  'workshop: testing-node-apps': ['workshop', 'react', 'testing'],
  'workshop: web-app-fundamentals-part-1': ['workshop', 'remix'],
  'workshop: web-app-fundamentals-part-2': ['workshop', 'remix'],
  Other: [],
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
    validateType: (v: unknown) => boolean
  },
) {
  const value = obj[key]
  if (validateType(value)) {
    return value as PropertyType
    // eslint-disable-next-line no-negated-condition
  } else if (typeof fallback !== 'undefined') {
    if (warnOnFallback) console.warn(`Had to use fallback`, {obj, key, value})
    return fallback
  } else {
    throw new Error(
      `${key} is not set properly and no fallback is provided. It's ${typeof value}`,
    )
  }
}

const isString = (v: unknown) => typeof v === 'string'
const isOneOf = (validValues: ReadonlyArray<unknown>) => (v: unknown) =>
  validValues.includes(v)
const areOneOf = (validValues: ReadonlyArray<unknown>) => (v: unknown) =>
  Array.isArray(v) && v.every(isOneOf(validValues))

async function mapTestimonial(rawTestimonial: UnknownObj) {
  try {
    const link: string | null = getValueWithFallback(rawTestimonial, 'link', {
      warnOnFallback: false,
      fallback: null,
      validateType: isString,
    })
    const subjects: Array<TestimonialSubject> = getValueWithFallback(
      rawTestimonial,
      'subjects',
      {fallback: ['Other'], validateType: areOneOf(allSubjects)},
    )
    const categories: Array<TestimonialCategory> = getValueWithFallback(
      rawTestimonial,
      'categories',
      {
        warnOnFallback: false,
        fallback: Array.from(
          new Set(subjects.flatMap(s => categoriesBySubject[s])),
        ),
        validateType: areOneOf(allCategories),
      },
    )
    const rawTestimonialContent = getValueWithFallback<string>(
      rawTestimonial,
      'testimonial',
      {validateType: isString},
    )
    const testimonial: TestimonialWithMetadata = {
      author: getValueWithFallback(rawTestimonial, 'author', {
        validateType: isString,
      }),
      subjects,
      categories,
      link,
      priority: getValueWithFallback(rawTestimonial, 'priority', {
        fallback: 0,
        validateType: isOneOf([0, 1, 2, 3, 4, 5]),
      }),
      cloudinaryId: getValueWithFallback(rawTestimonial, 'cloudinaryId', {
        validateType: isString,
      }),
      company: getValueWithFallback(rawTestimonial, 'company', {
        validateType: isString,
      }),
      testimonial: await markdownToHtml(rawTestimonialContent),
    }
    return testimonial
  } catch (error: unknown) {
    console.error(getErrorMessage(error), rawTestimonial)
    return null
  }
}

async function getAllTestimonials({
  request,
  forceFresh,
  timings,
}: {
  request?: Request
  forceFresh?: boolean
  timings?: Timings
}) {
  const key = 'content:data:testimonials.yml'
  const allTestimonials = await cachified({
    cache,
    request,
    timings,
    key,
    forceFresh,
    ttl: 1000 * 60 * 60 * 24,
    staleWhileRevalidate: 1000 * 60 * 60 * 24 * 30,
    getFreshValue: async (): Promise<Array<TestimonialWithMetadata>> => {
      const talksString = await downloadFile('content/data/testimonials.yml')
      const rawTestimonials = YAML.parse(talksString)
      if (!Array.isArray(rawTestimonials)) {
        console.error('Testimonials is not an array', rawTestimonials)
        throw new Error('Testimonials is not an array.')
      }

      return (await Promise.all(rawTestimonials.map(mapTestimonial))).filter(
        typedBoolean,
      )
    },
    checkValue: (value: unknown) => Array.isArray(value),
  })
  return allTestimonials
}

function sortByWithPriorityWeight(
  a: TestimonialWithMetadata,
  b: TestimonialWithMetadata,
) {
  return a.priority * Math.random() > b.priority * Math.random() ? 1 : -1
}

function mapOutMetadata(
  testimonialWithMetadata: TestimonialWithMetadata,
): Testimonial {
  return pick(testimonialWithMetadata, [
    'author',
    'cloudinaryId',
    'company',
    'testimonial',
    'link',
  ])
}

async function getTestimonials({
  request,
  forceFresh,
  subjects = [],
  categories = [],
  limit,
  timings,
}: {
  request?: Request
  forceFresh?: boolean
  subjects?: Array<TestimonialSubject>
  categories?: Array<TestimonialCategory>
  limit?: number
  timings?: Timings
}) {
  const allTestimonials = await getAllTestimonials({
    request,
    forceFresh,
    timings,
  })

  if (!(subjects.length + categories.length)) {
    // they must just want all the testimonials
    return allTestimonials.sort(sortByWithPriorityWeight).map(mapOutMetadata)
  }

  const subjectTestimonials = allTestimonials
    .filter(testimonial => testimonial.subjects.some(s => subjects.includes(s)))
    .sort(sortByWithPriorityWeight)

  const fillerTestimonials = allTestimonials
    .filter(
      t =>
        !subjectTestimonials.includes(t) &&
        t.categories.some(c => categories.includes(c)),
    )
    .sort((a, b) => {
      // IDEA: one day, make this smarter...
      return a.priority * Math.random() > b.priority * Math.random() ? 1 : -1
    })

  const finalTestimonials = [...subjectTestimonials, ...fillerTestimonials]
  if (limit) {
    return finalTestimonials.slice(0, limit).map(mapOutMetadata)
  }
  return finalTestimonials.map(mapOutMetadata)
}

export {getTestimonials}
