import {
	type ActionFunctionArgs,
	json,
	redirect,
	type LoaderFunctionArgs,
	type SerializeFrom,
} from '@remix-run/node'
import {
	Form,
	useActionData,
	useLoaderData,
	useSearchParams,
} from '@remix-run/react'
import { clsx } from 'clsx'
import { addDays, format, startOfDay, subDays } from 'date-fns'
import * as React from 'react'
import { useTable, type Column } from 'react-table'
import { Button } from '#app/components/button.tsx'
import { Field } from '#app/components/form-elements.tsx'
import { Grid } from '#app/components/grid.tsx'
import {
	ChevronDownIcon,
	ChevronUpIcon,
	SearchIcon,
} from '#app/components/icons.tsx'
import { H1, H2, H3 } from '#app/components/typography.tsx'
import { type KCDHandle } from '#app/types.ts'
import {
	formatDate,
	formatNumber,
	getErrorMessage,
	isTeam,
	teamDisplay,
	typedBoolean,
	useDebounce,
	useDoubleCheck,
	useCapturedRouteError,
} from '#app/utils/misc.tsx'
import { prisma } from '#app/utils/prisma.server.ts'
import { requireAdminUser } from '#app/utils/session.server.ts'

export const handle: KCDHandle = {
	getSitemapEntries: () => null,
}

type User = SerializeFrom<typeof loader>['users'][number]

const DEFAULT_LIMIT = 100
const TREND_DAYS = 14

type TrendPoint = { label: string; count: number }
type DailyCountRow = { day: string | Date; count: number | bigint }

const dayKeyFormat = 'yyyy-MM-dd'
function buildDailySeries({
	start,
	days,
	entries,
}: {
	start: Date
	days: number
	entries: Array<DailyCountRow>
}): Array<TrendPoint> {
	const counts = new Map<string, number>()
	for (const entry of entries) {
		const key =
			typeof entry.day === 'string' ? entry.day : format(entry.day, dayKeyFormat)
		const count = typeof entry.count === 'bigint' ? Number(entry.count) : entry.count
		counts.set(key, (counts.get(key) ?? 0) + count)
	}

	return Array.from({ length: days }, (_, index) => {
		const day = addDays(start, index)
		const key = format(day, dayKeyFormat)
		return {
			label: format(day, 'MMM d'),
			count: counts.get(key) ?? 0,
		}
	})
}

type UserFields = 'createdAt' | 'firstName' | 'email' | 'id' | 'team' | 'role'
type SortOrder = 'asc' | 'desc'
type OrderField = UserFields
const isSortOrder = (s: unknown): s is SortOrder => s === 'asc' || s === 'desc'
const isOrderField = (s: unknown): s is OrderField =>
	s === 'team' ||
	s === 'id' ||
	s === 'email' ||
	s === 'firstName' ||
	s === 'createdAt' ||
	s === 'role'

async function getLoaderData({ request }: { request: Request }) {
	const { searchParams } = new URL(request.url)
	const query = searchParams.get('q')
	const select: Record<UserFields, true> = {
		createdAt: true,
		firstName: true,
		email: true,
		id: true,
		team: true,
		role: true,
	}

	let order: SortOrder = 'asc'
	let orderField: OrderField = 'createdAt'
	const spOrder = searchParams.get('order')
	const spOrderField = searchParams.get('orderField')
	if (isSortOrder(spOrder)) order = spOrder
	if (isOrderField(spOrderField)) orderField = spOrderField

	const limitParam = Number(searchParams.get('limit') ?? DEFAULT_LIMIT)
	const limit =
		Number.isFinite(limitParam) && limitParam > 0 ? limitParam : DEFAULT_LIMIT

	const now = new Date()
	const today = startOfDay(now)
	const start7 = subDays(today, 6)
	const startPrev7 = subDays(today, 13)
	const start30 = subDays(today, 29)
	const trendStart = subDays(today, TREND_DAYS - 1)

	const [
		users,
		totalUsers,
		newUsers7,
		newUsersPrev7,
		newUsers30,
		passkeyCount,
		activeSessions,
		totalCalls,
		calls30,
		postReads7,
		postReads30,
		signupDailyCounts,
		readDailyCounts,
		teamCountsRaw,
		roleCountsRaw,
		topPostsRaw,
	] = await Promise.all([
		prisma.user.findMany({
			where: query
				? {
						OR: [
							{ firstName: { contains: query } },
							{ email: { contains: query } },
							{ id: { contains: query } },
							isTeam(query) ? { team: { equals: query } } : null,
						].filter(typedBoolean),
					}
				: {},
			select,
			orderBy: { [orderField]: order },
			take: limit,
		}),
		prisma.user.count(),
		prisma.user.count({ where: { createdAt: { gte: start7 } } }),
		prisma.user.count({
			where: {
				createdAt: {
					gte: startPrev7,
					lt: start7,
				},
			},
		}),
		prisma.user.count({ where: { createdAt: { gte: start30 } } }),
		prisma.passkey.count(),
		prisma.session.count({ where: { expirationDate: { gt: now } } }),
		prisma.call.count(),
		prisma.call.count({ where: { createdAt: { gte: start30 } } }),
		prisma.postRead.count({ where: { createdAt: { gte: start7 } } }),
		prisma.postRead.count({ where: { createdAt: { gte: start30 } } }),
		prisma.$queryRaw<DailyCountRow[]>`
			SELECT DATE("createdAt") AS day, COUNT(*) AS count
			FROM "User"
			WHERE "createdAt" >= ${trendStart}
			GROUP BY DATE("createdAt")
			ORDER BY DATE("createdAt") ASC
		`,
		prisma.$queryRaw<DailyCountRow[]>`
			SELECT DATE("createdAt") AS day, COUNT(*) AS count
			FROM "PostRead"
			WHERE "createdAt" >= ${trendStart}
			GROUP BY DATE("createdAt")
			ORDER BY DATE("createdAt") ASC
		`,
		prisma.user.groupBy({
			by: ['team'],
			_count: { team: true },
			orderBy: { _count: { team: 'desc' } },
		}),
		prisma.user.groupBy({
			by: ['role'],
			_count: { role: true },
			orderBy: { _count: { role: 'desc' } },
		}),
		prisma.postRead.groupBy({
			by: ['postSlug'],
			_count: { postSlug: true },
			where: { createdAt: { gte: start7 } },
			orderBy: { _count: { postSlug: 'desc' } },
			take: 5,
		}),
	])

	const signupTrend = buildDailySeries({
		start: trendStart,
		days: TREND_DAYS,
		entries: signupDailyCounts,
	})
	const readsTrend = buildDailySeries({
		start: trendStart,
		days: TREND_DAYS,
		entries: readDailyCounts,
	})

	const teamCounts = teamCountsRaw.map((item) => ({
		team: item.team,
		count: item._count.team,
	}))
	const topTeams = teamCounts.slice(0, 5)
	const otherTeamsCount = teamCounts
		.slice(5)
		.reduce((total, item) => total + item.count, 0)
	const teamMix =
		otherTeamsCount > 0
			? [...topTeams, { team: 'Other', count: otherTeamsCount }]
			: topTeams

	const roleMix = roleCountsRaw.map((item) => ({
		role: item.role,
		count: item._count.role,
	}))

	const topPosts = topPostsRaw.map((item) => ({
		slug: item.postSlug,
		count: item._count.postSlug,
	}))

	const growth7 =
		newUsersPrev7 === 0
			? null
			: Math.round(((newUsers7 - newUsersPrev7) / newUsersPrev7) * 100)

	return {
		users: users.map((user) => ({
			...user,
			createdAt: formatDate(user.createdAt),
		})),
		stats: {
			totalUsers,
			totalTeams: teamCountsRaw.length,
			newUsers7,
			newUsers30,
			newUsersPrev7,
			growth7,
			passkeyCount,
			activeSessions,
			totalCalls,
			calls30,
			postReads7,
			postReads30,
			teamMix,
			roleMix,
			topPosts,
			signupTrend,
			readsTrend,
			generatedAt: format(now, 'MMM d, yyyy h:mm a'),
		},
	}
}

export async function loader({ request }: LoaderFunctionArgs) {
	await requireAdminUser(request)

	return json(await getLoaderData({ request }))
}

export async function action({ request }: ActionFunctionArgs) {
	await requireAdminUser(request)

	const requestText = await request.text()
	const form = new URLSearchParams(requestText)
	try {
		const { id, ...values } = Object.fromEntries(form)
		if (!id) return json({ error: 'id is required' }, { status: 400 })

		if (request.method === 'DELETE') {
			await prisma.user.delete({ where: { id } })
		} else {
			await prisma.user.update({
				where: { id },
				data: values,
			})
		}
	} catch (error: unknown) {
		console.error(error)
		return json({ error: getErrorMessage(error) })
	}
	return redirect(new URL(request.url).pathname)
}

const userColumns: Array<Column<User>> = [
	{
		Header: 'Created',
		accessor: 'createdAt',
	},
	{
		Header: 'ID',
		accessor: 'id',
	},
	{
		Header: 'First Name',
		accessor: 'firstName',
	},
	{
		Header: 'Team',
		accessor: 'team',
	},
	{
		Header: 'Role',
		accessor: 'role',
	},
	{
		Header: 'Email',
		accessor: 'email',
	},
]

function Cell({
	value,
	row: { values: user },
	column: { id: propertyName },
}: {
	value: string
	row: { values: User }
	column: { id: string }
}) {
	const [isEditing, setIsEditing] = React.useState(false)
	const dc = useDoubleCheck()

	return isEditing ? (
		propertyName === 'id' ? (
			<Form
				method="delete"
				onSubmit={() => setIsEditing(false)}
				onBlur={() => setIsEditing(false)}
				onKeyUp={(e) => {
					if (e.key === 'Escape') setIsEditing(false)
				}}
			>
				<input type="hidden" name="id" value={user.id} />
				<Button
					type="submit"
					variant="danger"
					autoFocus
					{...dc.getButtonProps()}
				>
					{dc.doubleCheck ? 'You sure?' : 'Delete'}
				</Button>
			</Form>
		) : (
			<Form
				method="POST"
				onSubmit={() => setIsEditing(false)}
				onBlur={() => setIsEditing(false)}
				onKeyUp={(e) => {
					if (e.key === 'Escape') setIsEditing(false)
				}}
			>
				<input type="hidden" name="id" value={user.id} />
				<input type="text" defaultValue={value} name={propertyName} autoFocus />
			</Form>
		)
	) : (
		<button className="border-none" onClick={() => setIsEditing(true)}>
			{value || 'NO_VALUE'}
		</button>
	)
}

const defaultColumn = {
	Cell,
}

const cardClassName =
	'rounded-2xl bg-gray-100 p-6 ring-1 ring-inset ring-[rgba(0,0,0,0.05)] dark:bg-gray-850 dark:ring-[rgba(255,255,255,0.05)]'

function Card({
	children,
	className,
}: {
	children: React.ReactNode
	className?: string
}) {
	return <div className={clsx(cardClassName, className)}>{children}</div>
}

function TrendBadge({
	value,
	label,
}: {
	value: number | null
	label: string
}) {
	const tone =
		value === null
			? 'bg-slate-200 text-slate-600 dark:bg-slate-700/60 dark:text-slate-200'
			: value > 0
				? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
				: value < 0
					? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200'
					: 'bg-slate-200 text-slate-600 dark:bg-slate-700/60 dark:text-slate-200'

	return (
		<span className={clsx('rounded-full px-2 py-1 text-xs font-semibold', tone)}>
			{label}
		</span>
	)
}

function StatCard({
	label,
	value,
	helper,
	trend,
}: {
	label: string
	value: number
	helper?: string
	trend?: { value: number | null; label: string }
}) {
	return (
		<Card className="flex h-full flex-col justify-between gap-3">
			<div className="flex items-start justify-between gap-3">
				<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
					{label}
				</p>
				{trend ? <TrendBadge value={trend.value} label={trend.label} /> : null}
			</div>
			<p className="text-3xl font-semibold text-black dark:text-white">
				{formatNumber(value)}
			</p>
			{helper ? (
				<p className="text-sm text-slate-500 dark:text-slate-300">{helper}</p>
			) : null}
		</Card>
	)
}

function Sparkline({ data }: { data: Array<number> }) {
	if (data.length === 0) {
		return (
			<p className="text-sm text-slate-500 dark:text-slate-300">No data.</p>
		)
	}

	const max = Math.max(...data, 1)
	const lastIndex = Math.max(1, data.length - 1)
	const points = data
		.map((value, index) => {
			const x = (index / lastIndex) * 100
			const y = 100 - (value / max) * 100
			return `${x},${y}`
		})
		.join(' ')

	return (
		<svg
			viewBox="0 0 100 100"
			className="h-24 w-full"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			<polyline
				points={points}
				fill="none"
				stroke="currentColor"
				strokeWidth="3"
				className="text-indigo-500"
			/>
		</svg>
	)
}

function BarSparkline({ data }: { data: Array<number> }) {
	if (data.length === 0) {
		return (
			<p className="text-sm text-slate-500 dark:text-slate-300">No data.</p>
		)
	}

	const max = Math.max(...data, 1)
	return (
		<div className="flex h-24 items-end gap-1">
			{data.map((value, index) => (
				<div
					key={`bar-${index}`}
					className="flex-1 rounded-sm bg-sky-500/70"
					style={{ height: `${(value / max) * 100}%` }}
				/>
			))}
		</div>
	)
}

function BarList({
	items,
	labelClassName,
}: {
	items: Array<{ label: string; count: number }>
	labelClassName?: string
}) {
	if (items.length === 0) {
		return (
			<p className="text-sm text-slate-500 dark:text-slate-300">
				No data to display.
			</p>
		)
	}

	const max = Math.max(...items.map((item) => item.count), 1)
	return (
		<div className="space-y-3">
			{items.map((item) => (
				<div key={item.label} className="flex items-center gap-3">
					<span
						className={clsx(
							'w-24 truncate text-sm text-slate-600 dark:text-slate-300',
							labelClassName,
						)}
					>
						{item.label}
					</span>
					<div className="flex-1">
						<div className="h-2 rounded-full bg-slate-200/80 dark:bg-slate-700/60">
							<div
								className="h-2 rounded-full bg-indigo-500"
								style={{ width: `${(item.count / max) * 100}%` }}
							/>
						</div>
					</div>
					<span className="w-12 text-right text-sm text-slate-600 dark:text-slate-200">
						{formatNumber(item.count)}
					</span>
				</div>
			))}
		</div>
	)
}

export default function MeAdmin() {
	const data = useLoaderData<typeof loader>()
	const searchInputRef = React.useRef<HTMLInputElement>(null)
	const [searchParams, setSearchParams] = useSearchParams()

	const [query, setQuery] = React.useState(searchParams.get('q') ?? '')
	const [limit, setLimit] = React.useState(
		searchParams.get('limit') ?? String(DEFAULT_LIMIT),
	)
	const spOrder = searchParams.get('order')
	const spOrderField = searchParams.get('orderField')
	const [ordering, setOrdering] = React.useState({
		order: isSortOrder(spOrder) ? spOrder : 'asc',
		field: isOrderField(spOrderField) ? spOrderField : 'createdAt',
	})
	const actionData = useActionData<typeof action>()

	const syncSearchParams = useDebounce(() => {
		if (
			searchParams.get('q') === query &&
			searchParams.get('limit') === limit
		) {
			return
		}

		const newParams = new URLSearchParams(searchParams)
		if (query) {
			newParams.set('q', query)
		} else {
			newParams.delete('q')
		}
		if (limit && limit !== String(DEFAULT_LIMIT)) {
			newParams.set('limit', limit)
		} else {
			newParams.delete('limit')
		}
		setSearchParams(newParams, { replace: true })
	}, 400)

	React.useEffect(() => {
		syncSearchParams()
	}, [query, limit, syncSearchParams])

	React.useEffect(() => {
		const newParams = new URLSearchParams(searchParams)
		if (ordering.field === 'createdAt') {
			newParams.delete('orderField')
		} else {
			newParams.set('orderField', ordering.field)
		}
		if (ordering.order === 'asc') {
			newParams.delete('order')
		} else {
			newParams.set('order', ordering.order)
		}
		if (newParams.toString() !== searchParams.toString()) {
			setSearchParams(newParams, { replace: true })
		}
	}, [ordering, searchParams, setSearchParams])

	const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
		// @ts-expect-error 🤷‍♂️ no idea why defaultColumn isn't work ing here...
		useTable({ columns: userColumns, data: data.users, defaultColumn })

	const stats = data.stats
	const signupCounts = stats.signupTrend.map((point) => point.count)
	const readsCounts = stats.readsTrend.map((point) => point.count)
	const signupTotal = stats.signupTrend.reduce((total, point) => total + point.count, 0)
	const readsTotal = stats.readsTrend.reduce((total, point) => total + point.count, 0)
	const signupFirstLabel = stats.signupTrend[0]?.label ?? ''
	const signupLastLabel =
		stats.signupTrend[stats.signupTrend.length - 1]?.label ?? ''
	const readsFirstLabel = stats.readsTrend[0]?.label ?? ''
	const readsLastLabel = stats.readsTrend[stats.readsTrend.length - 1]?.label ?? ''
	const growthLabel =
		stats.growth7 === null
			? 'No prior week'
			: `${stats.growth7 > 0 ? '+' : ''}${stats.growth7}% vs last week`
	const teamItems = stats.teamMix.map((item) => ({
		label: isTeam(item.team) ? teamDisplay[item.team] : item.team,
		count: item.count,
	}))
	const roleItems = stats.roleMix.map((item) => ({
		label: `${item.role.slice(0, 1)}${item.role.slice(1).toLowerCase()}`,
		count: item.count,
	}))
	const postItems = stats.topPosts.map((item) => ({
		label: item.slug,
		count: item.count,
	}))

	return (
		<Grid rowGap>
			<div className="col-span-full">
				<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
					<div className="space-y-2">
						<H1>Admin dashboard</H1>
						<p className="text-sm text-slate-500 dark:text-slate-300">
							User growth, engagement, and access signals in one place.
						</p>
					</div>
					<p className="text-xs text-slate-500 dark:text-slate-300">
						Updated {stats.generatedAt}
					</p>
				</div>
			</div>

			{actionData?.error ? (
				<p role="alert" className="col-span-full text-sm text-red-500">
					{actionData.error}
				</p>
			) : null}

			<div className="col-span-full">
				<H2>Overview</H2>
			</div>
			<div className="col-span-full md:col-span-4 lg:col-span-3">
				<StatCard
					label="Total users"
					value={stats.totalUsers}
					helper={`${formatNumber(stats.totalTeams)} teams`}
				/>
			</div>
			<div className="col-span-full md:col-span-4 lg:col-span-3">
				<StatCard
					label="New users (7d)"
					value={stats.newUsers7}
					helper={`Prev 7d: ${formatNumber(stats.newUsersPrev7)}`}
					trend={{ value: stats.growth7, label: growthLabel }}
				/>
			</div>
			<div className="col-span-full md:col-span-4 lg:col-span-3">
				<StatCard
					label="New users (30d)"
					value={stats.newUsers30}
					helper="Last 30 days"
				/>
			</div>
			<div className="col-span-full md:col-span-4 lg:col-span-3">
				<StatCard
					label="Active sessions"
					value={stats.activeSessions}
					helper="Not expired"
				/>
			</div>
			<div className="col-span-full md:col-span-4 lg:col-span-3">
				<StatCard
					label="Passkeys"
					value={stats.passkeyCount}
					helper="Registered"
				/>
			</div>
			<div className="col-span-full md:col-span-4 lg:col-span-3">
				<StatCard
					label="Total calls"
					value={stats.totalCalls}
					helper={`Last 30d: ${formatNumber(stats.calls30)}`}
				/>
			</div>
			<div className="col-span-full md:col-span-4 lg:col-span-3">
				<StatCard
					label="Reads (7d)"
					value={stats.postReads7}
					helper={`Last 30d: ${formatNumber(stats.postReads30)}`}
				/>
			</div>

			<div className="col-span-full">
				<H2>Trends</H2>
			</div>
			<div className="col-span-full lg:col-span-7">
				<Card className="flex h-full flex-col gap-6">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
								Signups
							</p>
							<p className="text-lg font-semibold text-black dark:text-white">
								{formatNumber(signupTotal)} in last {TREND_DAYS} days
							</p>
						</div>
						<TrendBadge value={stats.growth7} label={growthLabel} />
					</div>
					<Sparkline data={signupCounts} />
					<div className="flex justify-between text-xs text-slate-500 dark:text-slate-300">
						<span>{signupFirstLabel}</span>
						<span>{signupLastLabel}</span>
					</div>
				</Card>
			</div>
			<div className="col-span-full lg:col-span-5">
				<Card className="flex h-full flex-col gap-6">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
							Post reads
						</p>
						<p className="text-lg font-semibold text-black dark:text-white">
							{formatNumber(readsTotal)} in last {TREND_DAYS} days
						</p>
					</div>
					<BarSparkline data={readsCounts} />
					<div className="flex justify-between text-xs text-slate-500 dark:text-slate-300">
						<span>{readsFirstLabel}</span>
						<span>{readsLastLabel}</span>
					</div>
				</Card>
			</div>

			<div className="col-span-full lg:col-span-6">
				<Card className="flex h-full flex-col gap-6">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
							Team mix
						</p>
						<p className="text-lg font-semibold text-black dark:text-white">
							Distribution by team
						</p>
					</div>
					<BarList items={teamItems} />
				</Card>
			</div>
			<div className="col-span-full lg:col-span-6">
				<Card className="flex h-full flex-col gap-6">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
							Roles
						</p>
						<p className="text-lg font-semibold text-black dark:text-white">
							Access distribution
						</p>
					</div>
					<BarList items={roleItems} />
				</Card>
			</div>

			<div className="col-span-full">
				<Card className="flex flex-col gap-6">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
							Top posts
						</p>
						<p className="text-lg font-semibold text-black dark:text-white">
							Most read in the last 7 days
						</p>
					</div>
					<BarList items={postItems} labelClassName="w-48" />
				</Card>
			</div>

			<div className="col-span-full">
				<H2>User management</H2>
			</div>
			<div className="col-span-full">
				<Card className="flex flex-col gap-6">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<H3 className="text-xl">Users</H3>
							<p className="text-sm text-slate-500 dark:text-slate-300">
								Showing {formatNumber(rows.length)} of{' '}
								{formatNumber(stats.totalUsers)} users
							</p>
						</div>
					</div>
					<Form method="get">
						<div className="flex flex-col gap-4 lg:flex-row lg:items-end">
							<div className="flex-1">
								<div className="relative flex-1">
									<button
										title={query === '' ? 'Search' : 'Clear search'}
										type="button"
										onClick={() => {
											setQuery('')
											// manually sync immediately when the
											// change was from a finite interaction like this click.
											syncSearchParams()
											searchInputRef.current?.focus()
										}}
										className={clsx(
											'absolute left-6 top-0 flex h-full items-center justify-center border-none bg-transparent p-0 text-slate-500',
											{
												'cursor-pointer': query !== '',
												'cursor-default': query === '',
											},
										)}
									>
										<SearchIcon />
									</button>
									<input
										ref={searchInputRef}
										type="search"
										value={query}
										onChange={(event) => setQuery(event.currentTarget.value)}
										name="q"
										placeholder="Filter users"
										className="text-primary bg-primary border-secondary focus:bg-secondary w-full rounded-full border py-6 pl-14 pr-6 text-lg font-medium hover:border-team-current focus:border-team-current focus:outline-none md:pr-24"
									/>
									<div className="absolute right-2 top-0 flex h-full w-14 items-center justify-between text-lg font-medium text-slate-500">
										<span title="Total results shown">{rows.length}</span>
									</div>
								</div>
							</div>
							<Field
								label="Limit"
								name="limit"
								value={limit}
								type="number"
								step="1"
								min="1"
								max="10000"
								onChange={(event) => setLimit(event.currentTarget.value)}
								placeholder="results limit"
							/>
						</div>
					</Form>
					<div className="overflow-x-auto">
						<table
							{...getTableProps({
								className:
									'min-w-[900px] w-full border-separate border-spacing-0 rounded-2xl border-2 border-slate-200 dark:border-slate-700',
							})}
						>
							<thead className="bg-white/40 dark:bg-gray-900/40">
								{headerGroups.map((headerGroup) => (
									<tr {...headerGroup.getHeaderGroupProps()}>
										{headerGroup.headers.map((column) => (
											<th
												{...column.getHeaderProps({
													className:
														'border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-200',
												})}
											>
												<button
													className="flex w-full items-center gap-1"
													onClick={() => {
														setOrdering((prev) => {
															const field = column.id
															if (!isOrderField(field)) return prev

															if (prev.field === column.id) {
																return {
																	field,
																	order: prev.order === 'asc' ? 'desc' : 'asc',
																}
															} else {
																return { field, order: 'asc' }
															}
														})
													}}
												>
													{column.render('Header')}
													{ordering.order === 'asc' ? (
														<ChevronUpIcon
															title="Asc"
															className={clsx('ml-2 text-gray-400', {
																'opacity-0': ordering.field !== column.id,
															})}
														/>
													) : (
														<ChevronDownIcon
															title="Desc"
															className={clsx('ml-2 text-gray-400', {
																'opacity-0': ordering.field !== column.id,
															})}
														/>
													)}
												</button>
											</th>
										))}
									</tr>
								))}
							</thead>
							<tbody {...getTableBodyProps()}>
								{rows.map((row) => {
									prepareRow(row)
									return (
										<tr
											{...row.getRowProps()}
											className="odd:bg-white/60 even:bg-slate-50/60 dark:odd:bg-gray-900/50 dark:even:bg-gray-950/40"
										>
											{row.cells.map((cell) => {
												return (
													<td
														{...cell.getCellProps({
															className:
																'px-4 py-3 text-sm text-slate-700 dark:text-slate-200',
														})}
													>
														{cell.render('Cell')}
													</td>
												)
											})}
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				</Card>
			</div>
		</Grid>
	)
}

export function ErrorBoundary() {
	const error = useCapturedRouteError()
	console.error(error)
	if (error instanceof Error) {
		return (
			<div>
				<h2>Error</h2>
				<pre>{error.stack}</pre>
			</div>
		)
	} else {
		return <h2>Unknown Error</h2>
	}
}

/*
eslint
  react/jsx-key: "off",
*/
