import * as React from 'react'
import {
	data as json,
	type LinksFunction,
	type MetaFunction,
	Link,
	useNavigate,
} from 'react-router'
import { ButtonLink } from '#app/components/button.tsx'
import { Grid } from '#app/components/grid.tsx'
import { H4, Paragraph } from '#app/components/typography.tsx'
import resumeStyles from '#app/styles/resume.css?url'
import { externalLinks } from '#app/external-links.tsx'
import { buildMediaUrl } from '#app/utils/media.ts'
import {
	getResumePath,
	getResumeView,
	THEATER_RESUME_UNLOCK_CLICKS,
} from '#app/utils/resume.ts'
import {
	getResumeData,
	getTheaterResumeData,
	type ResumeData,
	type TheaterResumeCredit,
	type TheaterResumeData,
} from '#app/utils/resume.server.ts'
import { type Route } from './+types/resume'

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	if (data?.view === 'theater') {
		return [
			{ title: `Kent C. Dodds' Performing Arts Resume` },
			{
				name: 'description',
				content: `Kent C. Dodds' theater, choir, and performing arts credits.`,
			},
		]
	}

	return [
		{ title: `Kent C. Dodds' Resume` },
		{
			name: 'description',
			content: `A quick look at Kent C. Dodds' work history.`,
		},
	]
}

export const links: LinksFunction = () => [
	{ rel: 'stylesheet', href: resumeStyles },
]

export async function loader({ request }: Route.LoaderArgs) {
	const view = getResumeView(new URL(request.url).searchParams.get('view'))
	switch (view) {
		case 'theater': {
			const theaterResumeData = await getTheaterResumeData({ request })
			return json({ resumeData: null, theaterResumeData, view })
		}
		case 'short':
		case 'full': {
			const resumeData = await getResumeData({ request })
			return json({ resumeData, theaterResumeData: null, view })
		}
		default: {
			const exhaustive: never = view
			throw new Error(`Unknown resume view: ${String(exhaustive)}`)
		}
	}
}

function getViewKey(isShort: boolean) {
	return isShort ? 'short' : 'long'
}

function getRecognitionView(resumeData: ResumeData) {
	return (
		resumeData.recognition ??
		resumeData.recognitionByLength ?? { short: [], long: [] }
	)
}

function formatMarkdown(resumeData: ResumeData, isShort: boolean) {
	const viewKey = getViewKey(isShort)
	const {
		header,
		summary,
		publicWork,
		experienceLong,
		experienceShort,
		projects,
		skills,
		education,
	} = resumeData
	const experience = isShort ? experienceShort : experienceLong
	const recognitionView = getRecognitionView(resumeData)

	const lines = [
		`# ${header.name}`,
		`${header.title} · ${header.location}`,
		'',
		header.links.map((link) => `[${link.label}](${link.href})`).join(' | '),
		'',
		'## Summary',
		...summary[viewKey].map((item) => `- ${item}`),
		'',
		'## Public Work',
		...publicWork[viewKey].map((item) => `- ${item}`),
		'',
		'## Experience',
		...experience.flatMap((role) => [
			`**${role.company} — ${role.role} (${role.dates})**`,
			`${role.context}`,
			...role.bullets[viewKey].map((item) => `- ${item}`),
			'',
		]),
		'## Skills',
		...skills.map((skill) => `- ${skill}`),
		'',
		'## Recognition',
		...recognitionView[viewKey].map((item) => `- ${item}`),
		'',
		'## Education',
		...education.map(
			(item) => `- ${item.degree}, ${item.school} (${item.year})`,
		),
	]

	if (projects.length) {
		lines.push(
			'## Selected Projects',
			...projects.map(
				(project) => `- ${project.name} — ${project.description}`,
			),
			'',
		)
	}

	return lines.join('\n').trim()
}

function formatTheaterCreditMarkdown(credit: TheaterResumeCredit) {
	const show = credit.href ? `[${credit.show}](${credit.href})` : credit.show
	const details = [credit.role, credit.company, credit.dates].filter(Boolean)
	return `- ${show} — ${details.join(' · ')}`
}

function formatTheaterMarkdown(theaterResumeData: TheaterResumeData) {
	const { header, sections, skills } = theaterResumeData
	const stats = header.stats
	const lines = [
		`# ${header.name}`,
		`Voice: ${stats.voice} · Height: ${stats.height} · Hair: ${stats.hair} · Eyes: ${stats.eyes}`,
		header.location,
		'',
		header.links.map((link) => `[${link.label}](${link.href})`).join(' | '),
		'',
		...sections.flatMap((section) => [
			`## ${section.heading}`,
			...section.credits.map(formatTheaterCreditMarkdown),
			'',
		]),
		'## Other Relevant Skills',
		...skills.map((skill) => `- ${skill}`),
	]

	return lines.join('\n').trim()
}

function ResumeUnavailable() {
	return (
		<div className="resume-page">
			<Grid className="mx-10vw my-24">
				<div className="col-span-full rounded-lg border border-gray-200 p-8 dark:border-gray-600">
					<H4 as="h2" className="mb-3">
						Resume is not available right now.
					</H4>
					<Paragraph className="mb-4">
						We are likely having trouble with our GitHub integration. Please try
						again soon, or browse the content directly on{' '}
						<a
							href={externalLinks.githubRepo}
							target="_blank"
							rel="noreferrer noopener"
							className="text-primary underline"
						>
							GitHub
						</a>
						.
					</Paragraph>
					<ButtonLink variant="primary" to={externalLinks.githubRepo}>
						Open GitHub repo
					</ButtonLink>
				</div>
			</Grid>
		</div>
	)
}

function ResumePhoto({ onSecretClick }: { onSecretClick?: () => void }) {
	return (
		<img
			className={
				onSecretClick ? 'resume-photo resume-photo--secret' : 'resume-photo'
			}
			src={buildMediaUrl('kent/profile', {
				height: 200,
				aspectRatio: '1:1',
				fit: 'cover',
			})}
			alt="Photo of Kent C. Dodds"
			onClick={onSecretClick}
		/>
	)
}

function ResumeLinks({ links }: { links: ResumeData['header']['links'] }) {
	const printLinks = links.filter((link) => link.includeInPrint)

	return (
		<>
			<div className="resume-links resume-links--screen">
				{links.map((link, index) => (
					<span key={link.href}>
						<a href={link.href} target="_blank" rel="noreferrer noopener">
							{link.label}
						</a>
						{index < links.length - 1 ? ' | ' : null}
					</span>
				))}
			</div>
			<div className="resume-links resume-links--print">
				{printLinks.map((link, index) => (
					<span key={link.href}>
						<a href={link.href}>{link.label}</a>
						{index < printLinks.length - 1 ? ' | ' : null}
					</span>
				))}
			</div>
		</>
	)
}

function ResumeActions({ onCopyMarkdown }: { onCopyMarkdown: () => void }) {
	return (
		<div className="resume-toggle__actions">
			<button
				type="button"
				className="resume-toggle__button"
				onClick={onCopyMarkdown}
			>
				Copy as Markdown
			</button>
			<button
				type="button"
				className="resume-toggle__button"
				onClick={() => window.print()}
			>
				Print
			</button>
		</div>
	)
}

function SoftwareResumePage({
	resumeData,
	isShort,
}: {
	resumeData: ResumeData
	isShort: boolean
}) {
	const navigate = useNavigate()
	const photoClicksRef = React.useRef(0)
	const viewKey = getViewKey(isShort)
	const recognitionView = getRecognitionView(resumeData)

	function handleCopyMarkdown() {
		void navigator.clipboard.writeText(formatMarkdown(resumeData, isShort))
	}

	function handlePhotoClick() {
		photoClicksRef.current += 1
		if (photoClicksRef.current < THEATER_RESUME_UNLOCK_CLICKS) return
		photoClicksRef.current = 0
		void navigate(getResumePath('theater'))
	}

	return (
		<div className="resume-page">
			<div className="resume-toggle">
				<div className="resume-toggle__links">
					<Link
						to={getResumePath('full')}
						prefetch="intent"
						className={
							isShort ? 'resume-toggle__link' : 'resume-toggle__link is-active'
						}
					>
						Full
					</Link>
					<Link
						to={getResumePath('short')}
						prefetch="intent"
						className={
							isShort ? 'resume-toggle__link is-active' : 'resume-toggle__link'
						}
					>
						Short (1 page)
					</Link>
				</div>
				<ResumeActions onCopyMarkdown={handleCopyMarkdown} />
			</div>

			<main className="resume-main">
				<header className="resume-header">
					<div className="resume-header__identity">
						<ResumePhoto onSecretClick={handlePhotoClick} />
						<div>
							<h1 className="resume-name">{resumeData.header.name}</h1>
							<p className="resume-title">{resumeData.header.title}</p>
							<p className="resume-location">{resumeData.header.location}</p>
						</div>
					</div>
					<ResumeLinks links={resumeData.header.links} />
				</header>

				<section className="resume-section">
					<h2 className="resume-heading">Summary</h2>
					<ul className="resume-bullets">
						{resumeData.summary[viewKey].map((item) => (
							<li key={item}>{item}</li>
						))}
					</ul>
				</section>

				<section className="resume-section">
					<h2 className="resume-heading">Public Work</h2>
					<ul className="resume-bullets">
						{resumeData.publicWork[viewKey].map((item) => (
							<li key={item}>{item}</li>
						))}
					</ul>
				</section>

				<section className="resume-section">
					<h2 className="resume-heading">Experience</h2>
					<div className="resume-experience">
						{(isShort
							? resumeData.experienceShort
							: resumeData.experienceLong
						).map((job) => (
							<article
								key={`${job.company}-${job.role}`}
								className="resume-job"
							>
								<div className="resume-job__row">
									<div className="resume-job__title">
										<strong>{job.company}</strong> — {job.role}
									</div>
									<div className="resume-job__dates">{job.dates}</div>
								</div>
								<div className="resume-job__context">{job.context}</div>
								<ul className="resume-bullets">
									{job.bullets[viewKey].map((bullet) => (
										<li key={bullet}>{bullet}</li>
									))}
								</ul>
							</article>
						))}
					</div>
				</section>

				{resumeData.projects.length ? (
					<section className="resume-section">
						<h2 className="resume-heading">Selected Projects</h2>
						<ul className="resume-bullets">
							{resumeData.projects.map((project) => (
								<li key={project.name}>
									<strong>{project.name}</strong> — {project.description}
								</li>
							))}
						</ul>
					</section>
				) : null}

				<section className="resume-section">
					<h2 className="resume-heading">Skills</h2>
					{isShort ? (
						<p className="resume-inline">{resumeData.skills.join(' · ')}</p>
					) : (
						<ul className="resume-bullets">
							{resumeData.skills.map((skill) => (
								<li key={skill}>{skill}</li>
							))}
						</ul>
					)}
				</section>

				<section className="resume-section">
					<h2 className="resume-heading">Recognition</h2>
					{isShort ? (
						<p className="resume-inline">{recognitionView.short.join(' · ')}</p>
					) : (
						<ul className="resume-bullets">
							{recognitionView.long.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
					)}
				</section>

				<section className="resume-section">
					<h2 className="resume-heading">Education</h2>
					<p className="resume-inline">
						{resumeData.education
							.map((item) => `${item.degree}, ${item.school} (${item.year})`)
							.join(' · ')}
					</p>
				</section>
			</main>
		</div>
	)
}

function TheaterCredit({ credit }: { credit: TheaterResumeCredit }) {
	const show = credit.href ? (
		<a href={credit.href} target="_blank" rel="noreferrer noopener">
			{credit.show}
		</a>
	) : (
		credit.show
	)

	return (
		<article className="resume-credit">
			<div className="resume-credit__show">
				<strong>{show}</strong>
			</div>
			<div className="resume-credit__role">{credit.role ?? ''}</div>
			<div className="resume-credit__company">{credit.company ?? ''}</div>
			<div className="resume-credit__dates">{credit.dates}</div>
		</article>
	)
}

function TheaterResumePage({
	theaterResumeData,
}: {
	theaterResumeData: TheaterResumeData
}) {
	const { header, sections, skills } = theaterResumeData
	const stats = header.stats

	function handleCopyMarkdown() {
		void navigator.clipboard.writeText(formatTheaterMarkdown(theaterResumeData))
	}

	return (
		<div className="resume-page">
			<div className="resume-toggle">
				<div className="resume-toggle__links">
					<Link
						to={getResumePath('full')}
						prefetch="intent"
						className="resume-toggle__link"
					>
						Software
					</Link>
					<Link
						to={getResumePath('theater')}
						prefetch="intent"
						className="resume-toggle__link is-active"
					>
						Theater
					</Link>
				</div>
				<ResumeActions onCopyMarkdown={handleCopyMarkdown} />
			</div>

			<main className="resume-main">
				<header className="resume-header">
					<div className="resume-header__identity">
						<ResumePhoto />
						<div>
							<h1 className="resume-name">{header.name}</h1>
							<p className="resume-title">
								Voice: {stats.voice} · Height: {stats.height} · Hair:{' '}
								{stats.hair} · Eyes: {stats.eyes}
							</p>
							<p className="resume-location">{header.location}</p>
						</div>
					</div>
					<ResumeLinks links={header.links} />
				</header>

				{sections.map((section) => (
					<section key={section.heading} className="resume-section">
						<h2 className="resume-heading">{section.heading}</h2>
						<div className="resume-credits">
							{section.credits.map((credit) => (
								<TheaterCredit
									key={`${credit.show}-${credit.role ?? ''}-${credit.dates}`}
									credit={credit}
								/>
							))}
						</div>
					</section>
				))}

				<section className="resume-section">
					<h2 className="resume-heading">Other Relevant Skills</h2>
					<p className="resume-inline">{skills.join(' · ')}</p>
				</section>
			</main>
		</div>
	)
}

export default function ResumePage({
	loaderData: { resumeData, theaterResumeData, view },
}: Route.ComponentProps) {
	switch (view) {
		case 'theater':
			if (!theaterResumeData) return <ResumeUnavailable />
			return <TheaterResumePage theaterResumeData={theaterResumeData} />
		case 'short':
		case 'full':
			if (!resumeData) return <ResumeUnavailable />
			return (
				<SoftwareResumePage
					resumeData={resumeData}
					isShort={view === 'short'}
				/>
			)
		default: {
			const exhaustive: never = view
			throw new Error(`Unknown resume view: ${String(exhaustive)}`)
		}
	}
}
