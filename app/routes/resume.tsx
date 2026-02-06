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
			'Principal engineer and educator focused on web platforms, developer tooling, and instructional design.',
			'Builds durable developer products with ecosystem-scale adoption and sustained premium business.',
		],
		long: [
			'Principal‑level engineer and educator focused on web platforms, developer tooling, and instructional design.',
			'Builds durable developer products with ecosystem-scale adoption, premium training, and long-term maintenance.',
			'Track record of ecosystem impact through open source, platform tooling, and developer education at scale.',
		],
	},
	publicWork: {
		short: [
			'Maintain a 33k+ software-professional mailing list with a 46% average open rate.',
			'Delivered 100+ talks/workshops and long‑running community programs.',
		],
		long: [
			'Maintain a 33k+ software-professional mailing list with a 46% average open rate.',
			'Delivered 100+ talks/workshops and organized community programs (Learning Clubs, Office Hours).',
			'Publish long‑form technical content across blog posts, podcasts, and video.',
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
					'Built premium Epic* training products serving 49k+ engineers; priced in the several‑hundred‑dollar range.',
					'Created Testing Library: 33m+ weekly downloads; APIs built into Playwright (18m+ weekly) and Vitest (30m+).',
					'Built Epic Stack (5.5k stars, hundreds of OSS projects) and Epic Workshop app used daily by learners.',
				],
				long: [
					'Built premium Epic* training products (EpicReact, EpicWeb, TestingJavaScript, EpicAI) serving 49k+ engineers; priced in the several‑hundred‑dollar range.',
					'Created Testing Library: 33m+ weekly downloads; APIs now built into Playwright (18m+ weekly) and Vitest (30m+).',
					'Built Epic Stack (5.5k GitHub stars) with hundreds of OSS projects based on it (and many more closed source projects).',
					'Built Epic Workshop app (epicshop), used daily across EpicAI, EpicWeb, and EpicReact workshops.',
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
					'Led DX strategy across docs, community, and events; primary role in Remix CLI and Stacks.',
					'Grew community to 13k Discord members; Remix Conf 300+ attendees and 31 sponsors (2022).',
				],
				long: [
					'Led DX strategy, docs, and community; primary role in Remix CLI and Stacks feature design.',
					'Scaled community and adoption (2022): 13k Discord, 19.4k newsletter, 74k weekly npm downloads.',
					'Produced Remix Conf (300+ attendees, 31 sponsors) and coordinated workshops/speakers.',
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
					'Built `paypal-scripts`, the standard web tooling platform; saved millions in engineering time.',
					'Led paypal.me rewrite on React/GraphQL; foundational to a high‑traffic product.',
					'Represented PayPal on TC‑39.',
				],
				long: [
					'Built `paypal-scripts`, standardizing builds and saving millions in engineering time.',
					'Led paypal.me rewrite on React/GraphQL; modernized a product used by millions.',
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
					'Built premium Epic* training products serving 49k+ engineers; priced in the several‑hundred‑dollar range.',
					'Created Testing Library: 33m+ weekly downloads; APIs built into Playwright (18m+ weekly) and Vitest (30m+).',
					'Built Epic Stack (5.5k stars, hundreds of OSS projects) and Epic Workshop app used daily by learners.',
				],
				long: [
					'Built premium Epic* training products (EpicReact, EpicWeb, TestingJavaScript, EpicAI) serving 49k+ engineers; priced in the several‑hundred‑dollar range.',
					'Created Testing Library: 33m+ weekly downloads; APIs built into Playwright (18m+ weekly) and Vitest (30m+).',
					'Built Epic Stack (5.5k GitHub stars) with hundreds of OSS projects based on it.',
					'Built Epic Workshop app (epicshop), used daily across EpicAI, EpicWeb, and EpicReact workshops.',
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
					'Led DX strategy across docs, community, and events; primary role in Remix CLI and Stacks.',
				],
				long: [
					'Led DX strategy, docs, and community; primary role in Remix CLI and Stacks feature design.',
					'Scaled community and adoption (2022): 13k Discord, 19.4k newsletter, 74k weekly npm downloads.',
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
					'Built `paypal-scripts`, the standard web tooling platform; saved millions in engineering time.',
					'PayPal delegate on TC‑39.',
				],
				long: [
					'Built `paypal-scripts`, standardizing builds and saving millions in engineering time.',
					'Led paypal.me rewrite on React/GraphQL and contributed to `pp-react` design system.',
					'PayPal delegate on TC‑39.',
				],
			},
		},
	],
	projects: [] as Array<{ name: string; description: string }>,
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
				<div className="resume-toggle__links">
					<Link
						to="/resume"
						prefetch="intent"
						className={
							isShort ? 'resume-toggle__link' : 'resume-toggle__link is-active'
						}
					>
						Long (default)
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
