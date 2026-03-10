import {
	data as json,
	type LinksFunction,
	type MetaFunction,
	Link,
	useSearchParams,
} from 'react-router'
import { ButtonLink } from '#app/components/button.tsx'
import { Grid } from '#app/components/grid.tsx'
import { H4, Paragraph } from '#app/components/typography.tsx'
import resumeStyles from '#app/styles/resume.css?url'
import { externalLinks } from '#app/external-links.tsx'
import { getResumeData, type ResumeData } from '#app/utils/resume.server.ts'
import { type Route } from './+types/resume'

export const meta: MetaFunction = () => [
	{ title: `Kent C. Dodds' Resume` },
	{
		name: 'description',
		content: `A quick look at Kent C. Dodds' work history.`,
	},
]

export const links: LinksFunction = () => [
	{ rel: 'stylesheet', href: resumeStyles },
]

export async function loader({ request }: Route.LoaderArgs) {
	const resumeData = await getResumeData({ request })
	return json({ resumeData })
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

export default function ResumePage({
	loaderData: { resumeData },
}: Route.ComponentProps) {
	const [searchParams] = useSearchParams()
	const view = searchParams.get('view')
	const isShort = view === 'short'
	const viewKey = getViewKey(isShort)

	if (!resumeData) {
		return (
			<div className="resume-page">
				<Grid className="mx-10vw my-24">
					<div className="col-span-full rounded-lg border border-gray-200 p-8 dark:border-gray-600">
						<H4 as="h2" className="mb-3">
							Resume is not available right now.
						</H4>
						<Paragraph className="mb-4">
							We are likely having trouble with our GitHub integration.
							Please try again soon, or browse the content directly on{' '}
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

	const data = resumeData
	const printLinks = data.header.links.filter(
		(link) => link.includeInPrint,
	)
	const recognitionView = getRecognitionView(data)

	function handleCopyMarkdown() {
		const markdown = formatMarkdown(data, isShort)
		void navigator.clipboard.writeText(markdown)
	}

	function handlePrint() {
		window.print()
	}

	return (
		<div className="resume-page">
			<div className="resume-toggle">
				<div className="resume-toggle__links">
					<Link
						to="/resume"
						prefetch="intent"
						className={
							isShort ? 'resume-toggle__link' : 'resume-toggle__link is-active'
						}
					>
						Full
					</Link>
					<Link
						to="/resume?view=short"
						prefetch="intent"
						className={
							isShort ? 'resume-toggle__link is-active' : 'resume-toggle__link'
						}
					>
						Short (1 page)
					</Link>
				</div>
				<div className="resume-toggle__actions">
					<button
						type="button"
						className="resume-toggle__button"
						onClick={handleCopyMarkdown}
					>
						Copy as Markdown
					</button>
					<button
						type="button"
						className="resume-toggle__button"
						onClick={handlePrint}
					>
						Print
					</button>
				</div>
			</div>

			<main className="resume-main">
				<header className="resume-header">
					<div className="resume-header__identity">
						<img
							className="resume-photo"
							src="https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0,h_200,ar_1:1,c_fill/kent/profile"
							alt="Photo of Kent C. Dodds"
						/>
						<div>
							<h1 className="resume-name">{data.header.name}</h1>
							<p className="resume-title">{data.header.title}</p>
							<p className="resume-location">{data.header.location}</p>
						</div>
					</div>
					<div className="resume-links resume-links--screen">
						{data.header.links.map((link, index) => (
							<span key={link.href}>
								<a href={link.href} target="_blank" rel="noreferrer noopener">
									{link.label}
								</a>
								{index < data.header.links.length - 1 ? ' | ' : null}
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
				</header>

				<section className="resume-section">
					<h2 className="resume-heading">Summary</h2>
					<ul className="resume-bullets">
						{data.summary[viewKey].map((item) => (
							<li key={item}>{item}</li>
						))}
					</ul>
				</section>

				<section className="resume-section">
					<h2 className="resume-heading">Public Work</h2>
					<ul className="resume-bullets">
						{data.publicWork[viewKey].map((item) => (
							<li key={item}>{item}</li>
						))}
					</ul>
				</section>

				<section className="resume-section">
					<h2 className="resume-heading">Experience</h2>
					<div className="resume-experience">
						{(isShort
							? data.experienceShort
							: data.experienceLong
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

				{data.projects.length ? (
					<section className="resume-section">
						<h2 className="resume-heading">Selected Projects</h2>
						<ul className="resume-bullets">
							{data.projects.map((project) => (
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
						<p className="resume-inline">{data.skills.join(' · ')}</p>
					) : (
						<ul className="resume-bullets">
							{data.skills.map((skill) => (
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
						{data.education
							.map((item) => `${item.degree}, ${item.school} (${item.year})`)
							.join(' · ')}
					</p>
				</section>
			</main>
		</div>
	)
}
