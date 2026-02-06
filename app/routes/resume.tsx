import { type LinksFunction, type MetaFunction } from '@remix-run/node'
import { Link, useSearchParams } from '@remix-run/react'
import resumeStyles from './resume.css?url'

export const meta: MetaFunction = () => [
	{ title: `Kent C. Dodds's Resume` },
	{
		name: 'description',
		content: `A quick look at Kent C. Dodds's work history.`,
	},
]

export const links: LinksFunction = () => [
	{ rel: 'stylesheet', href: resumeStyles },
]

const resumeData = {
	header: {
		name: 'Kent C. Dodds',
		title: 'Principal Software Engineer & Developer Educator',
		location: 'Utah, USA',
		links: [
			{ label: 'kentcdodds.com', href: 'https://kentcdodds.com' },
			{ label: 'me@kentcdodds.com', href: 'mailto:me@kentcdodds.com' },
			{ label: 'GitHub', href: 'https://github.com/kentcdodds' },
			{ label: 'LinkedIn', href: 'https://www.linkedin.com/in/kentcdodds/' },
			{ label: '@kentcdodds', href: 'https://x.com/kentcdodds' },
			{ label: 'YouTube', href: 'https://kcd.im/youtube' },
			{ label: 'Talks', href: 'https://kcd.im/talks' },
			{ label: 'Courses', href: 'https://kcd.im/courses' },
		],
	},
	summary: {
		short: [
			'Principal engineer and educator focused on web platforms, DX, and teaching.',
			'Creator of Testing Library and EpicReact.dev; former Remix DX lead and PayPal web infra.',
		],
		long: [
			'Principal‑level engineer and educator focused on web platforms, developer tooling, and instructional design.',
			'Creator of Testing Library, EpicReact.dev, TestingJavaScript.com, EpicWeb.dev, and EpicAI.pro.',
			'Former Director of Developer Experience at Remix; led web infrastructure at PayPal.',
			'Known for ecosystem impact through open source, teaching, and community building.',
		],
	},
	publicWork: {
		short: [
			'EpicReact.dev, TestingJavaScript.com, EpicWeb.dev, and EpicAI.pro: web, testing, and AI courses.',
			'Testing Library ecosystem: now industry-wide adopted as standard tools and patterns.',
		],
		long: [
			'EpicReact.dev: 11‑workshop masterclass with 19+ hours of instruction and expert interviews.',
			'TestingJavaScript.com: testing education platform for beginners through experts.',
			'EpicWeb.dev + Epic Stack: production‑ready curriculum and open‑source stack.',
			'EpicAI.pro: MCP workshops and self‑paced training for AI‑native product development.',
			'Testing Library ecosystem: React Testing Library + DOM Testing Library; patterns now built into standard tools like Playwright and Vitest.',
			'Large developer audience on X and YouTube.',
		],
	},
	experienceLong: [
		{
			company: 'Kent C. Dodds Tech LLC',
			role: 'Founder, Independent Educator',
			dates: '2019–Present',
			context: 'Productized education, open source, and community programs.',
			bullets: {
				short: [
					'Built EpicReact.dev, TestingJavaScript.com, EpicWeb.dev, and EpicAI.pro.',
					'Created Testing Library ecosystem with broad industry adoption.',
					'Delivered 100+ talks/workshops; recognized for developer education impact.',
				],
				long: [
					'Built EpicReact.dev, TestingJavaScript.com, EpicWeb.dev, and EpicAI.pro.',
					'Created Testing Library ecosystem with broad industry adoption.',
					'Delivered 100+ talks/workshops and organized community programs (Learning Clubs, Office Hours).',
					'Shifted focus to MCP in 2025, launching production‑focused AI tooling training.',
				],
			},
		},
		{
			company: 'Remix',
			role: 'Director of Developer Experience',
			dates: '2021–2022',
			context: 'DX strategy, docs, community, and events.',
			bullets: {
				short: [
					'Led DX strategy, documentation, and community engagement.',
					'Organized Remix Conf and strengthened ecosystem adoption.',
				],
				long: [
					'Led DX strategy, documentation, and community engagement.',
					'Organized Remix Conf and coordinated workshops/speakers.',
					'Improved developer onboarding and adoption through content and education.',
				],
			},
		},
		{
			company: 'PayPal',
			role: 'Senior/Staff Engineer, Web Infrastructure',
			dates: '2015–2019',
			context: 'Web tooling, platform standards, and product delivery.',
			bullets: {
				short: [
					'Built `paypal-scripts`, the standard web tooling platform at PayPal.',
					'Led paypal.me rewrite and contributed to `pp-react` design system.',
					'Represented PayPal on TC‑39.',
				],
				long: [
					'Built `paypal-scripts`, standardizing builds and reducing tool maintenance across teams.',
					'Led paypal.me rewrite on React/GraphQL; modernized a high‑traffic product.',
					'Started `pp-react`, a foundational component library for the design system.',
					'Represented PayPal on TC‑39 and supported multiple teams via web infra leadership.',
				],
			},
		},
		{
			company: 'AtTask (now Workfront)',
			role: 'Frontend Engineer',
			dates: '2014',
			context: 'Frontend modernization planning and delivery ownership.',
			bullets: {
				short: ['Defined a modernization plan for the frontend stack.'],
				long: [
					'Defined a modernization plan for the frontend stack.',
					'Provided senior-level guidance during a key transition window.',
				],
			},
		},
		{
			company: 'Alianza',
			role: 'Frontend Engineer',
			dates: '2014–2015',
			context: 'Sole frontend engineer ownership for product delivery.',
			bullets: {
				short: ['Owned frontend architecture and delivery in a small team.'],
				long: [
					'Owned frontend architecture and delivery as the sole frontend engineer.',
					'Hired and onboarded a new frontend engineer.',
					'Upgraded build tooling and CI/CD processes early in career.',
				],
			},
		},
		{
			company: 'Domo',
			role: 'Frontend Engineer',
			dates: '2012–2014',
			context: 'Frontend engineering and early tooling leadership.',
			bullets: {
				short: ['Transitioned from test automation to frontend engineering.'],
				long: [
					'Transitioned from test automation to frontend engineering.',
					'Contributed to AngularJS and internal tooling improvements.',
				],
			},
		},
	],
	experienceShort: [
		{
			company: 'Kent C. Dodds Tech LLC',
			role: 'Founder, Independent Educator',
			dates: '2019–Present',
			context: 'Productized education, open source, and community programs.',
			bullets: {
				short: [
					'Built EpicReact.dev, TestingJavaScript.com, EpicWeb.dev, and EpicAI.pro.',
					'Created the Testing Library ecosystem with broad industry adoption.',
				],
				long: [
					'Built EpicReact.dev, TestingJavaScript.com, EpicWeb.dev, and EpicAI.pro.',
					'Created Testing Library ecosystem with broad industry adoption.',
					'Delivered 100+ talks/workshops; recognized for developer education impact.',
				],
			},
		},
		{
			company: 'Remix',
			role: 'Director of Developer Experience',
			dates: '2021–2022',
			context: 'DX strategy, docs, community, and events.',
			bullets: {
				short: ['Led DX strategy, documentation, and community engagement.'],
				long: [
					'Led DX strategy, documentation, and community engagement.',
					'Organized Remix Conf and strengthened ecosystem adoption.',
				],
			},
		},
		{
			company: 'PayPal',
			role: 'Senior/Staff Engineer, Web Infrastructure',
			dates: '2015–2019',
			context: 'Web tooling, platform standards, and product delivery.',
			bullets: {
				short: [
					'Built `paypal-scripts`, the standard web tooling platform at PayPal.',
					'PayPal delegate on TC‑39.',
				],
				long: [
					'Built `paypal-scripts`, the standard web tooling platform at PayPal.',
					'Led paypal.me rewrite and contributed to `pp-react` design system.',
					'PayPal delegate on TC‑39.',
				],
			},
		},
	],
	projects: [
		{
			name: 'Epic Workshop (epicshop)',
			description:
				'Local-first workshop platform with CLI, React Router app, and MCP integration.',
		},
		{
			name: 'Testing Library',
			description:
				'Open‑source testing ecosystem used across the JS community.',
		},
		{
			name: 'Epic Stack',
			description: 'Production‑ready full‑stack starter with ongoing releases.',
		},
	],
	skills: [
		'TypeScript, Node.js, Bun, Cloudflare, React, Remix',
		'Web architecture, DX tooling, build systems',
		'Testing strategy, performance, observability',
		'AI-assisted development (Cursor) with leading LLMs',
		'Developer education, curriculum design',
	],
	education: [
		{
			school: 'Brigham Young University (BYU)',
			degree: 'M.S. Information Systems',
			year: '2014',
		},
	],
	recognition: [
		'Google Developer Expert (GDE)',
		'Microsoft MVP',
		'GitHub Star',
		'TC‑39 delegate (PayPal)',
		'GitNation OS Awards',
	],
}

function getViewKey(isShort: boolean) {
	return isShort ? 'short' : 'long'
}

function formatMarkdown(isShort: boolean) {
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
		'## Selected Projects',
		...projects.map((project) => `- ${project.name} — ${project.description}`),
		'',
		'## Skills',
		...skills.map((skill) => `- ${skill}`),
		'',
		'## Education',
		...education.map(
			(item) => `- ${item.degree}, ${item.school} (${item.year})`,
		),
	]

	return lines.join('\n').trim()
}

export default function ResumePage() {
	const [searchParams] = useSearchParams()
	const view = searchParams.get('view')
	const isShort = view === 'short'
	const viewKey = getViewKey(isShort)

	function handleCopyMarkdown() {
		const markdown = formatMarkdown(isShort)
		void navigator.clipboard.writeText(markdown)
	}

	function handlePrint() {
		window.print()
	}

	return (
		<div className="resume-page">
			<div className="resume-toggle">
				<div className="resume-toggle__label">Resume view</div>
				<div className="resume-toggle__links">
					<Link
						to="/resume"
						className={
							isShort ? 'resume-toggle__link' : 'resume-toggle__link is-active'
						}
					>
						Long (default)
					</Link>
					<Link
						to="/resume?view=short"
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
					<div>
						<h1 className="resume-name">{resumeData.header.name}</h1>
						<p className="resume-title">{resumeData.header.title}</p>
						<p className="resume-location">{resumeData.header.location}</p>
					</div>
					<div className="resume-links">
						{resumeData.header.links.map((link, index) => (
							<span key={link.href}>
								<a href={link.href} target="_blank" rel="noreferrer noopener">
									{link.label}
								</a>
								{index < resumeData.header.links.length - 1 ? ' | ' : null}
							</span>
						))}
					</div>
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
						<p className="resume-inline">
							{resumeData.recognition.join(' · ')}
						</p>
					) : (
						<ul className="resume-bullets">
							{resumeData.recognition.map((item) => (
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
