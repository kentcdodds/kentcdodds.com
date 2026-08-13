import * as YAML from 'yaml'
import { z } from 'zod'
import { cache, cachified } from '#app/utils/cache.server.ts'
import {
	getContentDataCacheKey,
	getContentDataFile,
} from '#app/utils/content-data.server.ts'
import { type Timings } from '#app/utils/timing.server.ts'

const resumeLinkSchema = z.object({
	label: z.string(),
	href: z.string(),
	includeInPrint: z.boolean().optional(),
})

const resumeSectionSchema = z.object({
	short: z.array(z.string()),
	long: z.array(z.string()),
})

const resumeExperienceSchema = z.object({
	company: z.string(),
	role: z.string(),
	dates: z.string(),
	context: z.string(),
	bullets: resumeSectionSchema,
})

const resumeProjectSchema = z.object({
	name: z.string(),
	description: z.string(),
})

const resumeEducationSchema = z.object({
	school: z.string(),
	degree: z.string(),
	year: z.string(),
})

const resumeDataSchema = z.object({
	header: z.object({
		name: z.string(),
		title: z.string(),
		location: z.string(),
		links: z.array(resumeLinkSchema),
	}),
	summary: resumeSectionSchema,
	publicWork: resumeSectionSchema,
	experienceLong: z.array(resumeExperienceSchema),
	experienceShort: z.array(resumeExperienceSchema),
	projects: z.array(resumeProjectSchema),
	skills: z.array(z.string()),
	education: z.array(resumeEducationSchema),
	recognition: resumeSectionSchema.optional(),
	recognitionByLength: resumeSectionSchema.optional(),
})

const theaterCreditSchema = z.object({
	show: z.string(),
	role: z.string().optional(),
	company: z.string().optional(),
	dates: z.string(),
	href: z.string().optional(),
})

const theaterResumeDataSchema = z.object({
	header: z.object({
		name: z.string(),
		location: z.string(),
		stats: z.object({
			voice: z.string(),
			height: z.string(),
			hair: z.string(),
			eyes: z.string(),
		}),
		links: z.array(resumeLinkSchema),
	}),
	sections: z.array(
		z.object({
			heading: z.string(),
			credits: z.array(theaterCreditSchema),
		}),
	),
	skills: z.array(z.string()),
})

export type ResumeData = z.infer<typeof resumeDataSchema>
export type TheaterResumeData = z.infer<typeof theaterResumeDataSchema>
export type TheaterResumeCredit = z.infer<typeof theaterCreditSchema>

function parseYamlData<T>(raw: string, schema: z.ZodType<T>, label: string) {
	const parsed = YAML.parse(raw)
	const result = schema.safeParse(parsed)
	if (!result.success) {
		console.error(`${label} data is invalid`, result.error.flatten())
		throw new Error(`${label} data is invalid.`)
	}
	return result.data
}

export function parseTheaterResumeData(raw: string) {
	return parseYamlData(raw, theaterResumeDataSchema, 'Theater resume')
}

async function getCachedYamlData<T>({
	filename,
	schema,
	label,
	request,
	forceFresh,
	timings,
}: {
	filename: string
	schema: z.ZodType<T>
	label: string
	request?: Request
	forceFresh?: boolean
	timings?: Timings
}) {
	const key = getContentDataCacheKey(filename)
	try {
		return await cachified({
			cache,
			request,
			timings,
			key,
			ttl: 1000 * 60 * 60 * 24 * 14,
			staleWhileRevalidate: 1000 * 60 * 60 * 24 * 30,
			forceFresh,
			getFreshValue: async () => {
				const raw = await getContentDataFile(`data/${filename}`)
				if (!raw) {
					throw new Error(`${filename} is unavailable`)
				}
				return parseYamlData(raw, schema, label)
			},
			checkValue: (value: unknown) => schema.safeParse(value).success,
		})
	} catch (error: unknown) {
		console.error(`${label}: failed to load data, returning null`, error)
		return null
	}
}

async function getResumeData({
	request,
	forceFresh,
	timings,
}: {
	request?: Request
	forceFresh?: boolean
	timings?: Timings
}) {
	return getCachedYamlData({
		filename: 'resume.yml',
		schema: resumeDataSchema,
		label: 'Resume',
		request,
		forceFresh,
		timings,
	})
}

async function getTheaterResumeData({
	request,
	forceFresh,
	timings,
}: {
	request?: Request
	forceFresh?: boolean
	timings?: Timings
}) {
	return getCachedYamlData({
		filename: 'theater-resume.yml',
		schema: theaterResumeDataSchema,
		label: 'Theater resume',
		request,
		forceFresh,
		timings,
	})
}

export { getResumeData, getTheaterResumeData }
