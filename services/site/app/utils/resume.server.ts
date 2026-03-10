import * as YAML from 'yaml'
import { z } from 'zod'
import { cache, cachified } from '#app/utils/cache.server.ts'
import { downloadFile } from '#app/utils/github.server.ts'
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

export type ResumeData = z.infer<typeof resumeDataSchema>

async function getResumeData({
	request,
	forceFresh,
	timings,
}: {
	request?: Request
	forceFresh?: boolean
	timings?: Timings
}) {
	const key = 'content:data:resume.yml'
	const resumeData = await cachified({
		cache,
		request,
		timings,
		key,
		ttl: 1000 * 60 * 60 * 24 * 14,
		staleWhileRevalidate: 1000 * 60 * 60 * 24 * 30,
		forceFresh,
		getFreshValue: async () => {
			const resumeString = await downloadFile('content/data/resume.yml')
			const parsed = YAML.parse(resumeString)
			const result = resumeDataSchema.safeParse(parsed)
			if (!result.success) {
				console.error('Resume data is invalid', result.error.flatten())
				throw new Error('Resume data is invalid.')
			}
			return result.data
		},
		checkValue: (value: unknown) => resumeDataSchema.safeParse(value).success,
	})

	return resumeData
}

export { getResumeData }
