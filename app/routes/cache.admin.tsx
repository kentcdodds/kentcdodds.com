import { invariantResponse } from '@epic-web/invariant'
import {
	data as json,
	Form,
	isRouteErrorResponse,
	useFetcher,
	useSearchParams,
	useSubmit,
} from 'react-router'
import { Button } from '#app/components/button.tsx'
import {
	Field,
	FieldContainer,
	inputClassName,
} from '#app/components/form-elements.tsx'
import { SearchIcon } from '#app/components/icons.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { H2, H3 } from '#app/components/typography.tsx'
import {
	cache,
	getAllCacheKeys,
	lruCache,
	searchCacheKeys,
} from '#app/utils/cache.server.ts'
import {
	ensureInstance,
	getAllInstances,
	getInstanceInfo,
} from '#app/utils/litefs-js.server.ts'
import {
	useDebounce,
	useDoubleCheck,
	useCapturedRouteError,
} from '#app/utils/misc-react.tsx'
import { requireAdminUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/cache.admin'

const deleteAllMatchingIntent = 'delete-all-matching-cache-values'
const defaultCacheKeysLimit = 100
const maxCacheKeysLimit = 10_000

function sanitizeCacheKeysLimit(limit: number) {
	if (!Number.isFinite(limit)) return defaultCacheKeysLimit
	return Math.min(maxCacheKeysLimit, Math.max(1, Math.floor(limit)))
}

async function getMatchingCacheKeys({
	query,
	limit,
}: {
	query: string | null
	limit: number
}) {
	const sanitizedLimit = sanitizeCacheKeysLimit(limit)
	if (typeof query === 'string') {
		return searchCacheKeys(query, sanitizedLimit)
	}
	return getAllCacheKeys(sanitizedLimit)
}

export async function loader({ request }: Route.LoaderArgs) {
	await requireAdminUser(request)
	const searchParams = new URL(request.url).searchParams
	const query = searchParams.get('query')
	const limit = Number(searchParams.get('limit') ?? 100)

	const currentInstanceInfo = await getInstanceInfo()
	const instance =
		searchParams.get('instance') ?? currentInstanceInfo.currentInstance
	const instances = await getAllInstances()
	await ensureInstance(instance)

	const cacheKeys = await getMatchingCacheKeys({ query, limit })
	return json({ cacheKeys, instance, instances, currentInstanceInfo })
}

export async function action({ request }: Route.ActionArgs) {
	await requireAdminUser(request)
	const searchParams = new URL(request.url).searchParams
	const formData = await request.formData()
	const { currentInstance } = await getInstanceInfo()
	const instance = formData.get('instance') ?? currentInstance
	invariantResponse(typeof instance === 'string', 'instance must be a string')
	await ensureInstance(instance)

	const intent = formData.get('intent')
	if (intent === deleteAllMatchingIntent) {
		const { currentIsPrimary, primaryInstance } = await getInstanceInfo()
		invariantResponse(
			currentIsPrimary,
			`Bulk delete must run on the primary instance (${primaryInstance})`,
		)
		const query = searchParams.get('query')
		const limit = Number(searchParams.get('limit') ?? 100)
		const { sqlite, lru } = await getMatchingCacheKeys({ query, limit })
		for (const cacheKey of sqlite) {
			await cache.delete(cacheKey)
		}
		for (const cacheKey of lru) {
			lruCache.delete(cacheKey)
		}
		return json({ success: true })
	}

	const key = formData.get('cacheKey')
	const type = formData.get('type')

	invariantResponse(typeof key === 'string', 'cacheKey must be a string')
	invariantResponse(typeof type === 'string', 'type must be a string')

	switch (type) {
		case 'sqlite': {
			await cache.delete(key)
			break
		}
		case 'lru': {
			lruCache.delete(key)
			break
		}
		default: {
			throw new Error(`Unknown cache type: ${type}`)
		}
	}
	return json({ success: true })
}

export default function CacheAdminRoute({
	loaderData: data,
}: Route.ComponentProps) {
	const [searchParams] = useSearchParams()
	const submit = useSubmit()
	const query = searchParams.get('query') ?? ''
	const limit = searchParams.get('limit') ?? '100'
	const instance = searchParams.get('instance') ?? data.instance
	const matchingCacheValuesCount =
		data.cacheKeys.sqlite.length + data.cacheKeys.lru.length

	const handleFormChange = useDebounce((form: HTMLFormElement) => {
		void submit(form)
	}, 400)

	return (
		<div className="mx-10vw">
			<H2 className="mt-3">Cache Admin</H2>
			<Spacer size="2xs" />
			<Form
				method="get"
				className="flex flex-col gap-4"
				onChange={(e) => handleFormChange(e.currentTarget)}
			>
				<div className="flex-1">
					<div className="relative flex-1">
						<button
							type="submit"
							className="absolute top-0 left-6 flex h-full items-center justify-center border-none bg-transparent p-0 text-slate-500"
						>
							<SearchIcon />
						</button>
						<input
							type="search"
							defaultValue={query}
							name="query"
							placeholder="Filter Cache Keys"
							className="text-primary bg-primary border-secondary focus:bg-secondary hover:border-team-current focus:border-team-current w-full rounded-full border py-6 pr-6 pl-14 text-lg font-medium focus:outline-none md:pr-24"
						/>
						<div className="absolute top-0 right-2 flex h-full w-14 items-center justify-between text-lg font-medium text-slate-500">
							<span title="Total results shown">
								{matchingCacheValuesCount}
							</span>
						</div>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-4">
					<Field
						label="Limit"
						name="limit"
						defaultValue={limit}
						type="number"
						step="1"
						min="1"
						max="10000"
						placeholder="results limit"
					/>
					<FieldContainer label="Instance" id="instance">
						{({ inputProps }) => (
							<select
								{...inputProps}
								name="instance"
								defaultValue={instance}
								className={inputClassName}
							>
								{Object.entries(data.instances).map(([inst, region]) => (
									<option key={inst} value={inst}>
										{[
											inst,
											`(${region})`,
											inst === data.currentInstanceInfo.currentInstance
												? '(current)'
												: '',
											inst === data.currentInstanceInfo.primaryInstance
												? ' (primary)'
												: '',
										]
											.filter(Boolean)
											.join(' ')}
									</option>
								))}
							</select>
						)}
					</FieldContainer>
				</div>
			</Form>
			<Spacer size="2xs" />
			<DeleteAllMatchingCacheValuesButton
				instance={instance}
				matchingCacheValuesCount={matchingCacheValuesCount}
			/>
			<Spacer size="2xs" />
			<div className="flex flex-col gap-4">
				<H3>LRU Cache:</H3>
				{data.cacheKeys.lru.map((key) => (
					<CacheKeyRow
						key={key}
						cacheKey={key}
						instance={instance}
						type="lru"
					/>
				))}
			</div>
			<Spacer size="3xs" />
			<div className="flex flex-col gap-4">
				<H3>SQLite Cache:</H3>
				{data.cacheKeys.sqlite.map((key) => (
					<CacheKeyRow
						key={key}
						cacheKey={key}
						instance={instance}
						type="sqlite"
					/>
				))}
			</div>
		</div>
	)
}

function DeleteAllMatchingCacheValuesButton({
	instance,
	matchingCacheValuesCount,
}: {
	instance: string
	matchingCacheValuesCount: number
}) {
	const fetcher = useFetcher()
	const dc = useDoubleCheck()
	if (matchingCacheValuesCount === 0) return null
	const isDeleting = fetcher.state !== 'idle'

	return (
		<fetcher.Form method="POST">
			<input type="hidden" name="intent" value={deleteAllMatchingIntent} />
			<input type="hidden" name="instance" value={instance} />
			<Button
				size="small"
				variant="danger"
				disabled={isDeleting}
				{...dc.getButtonProps({ type: 'submit' })}
			>
				{isDeleting
					? `deleting ${matchingCacheValuesCount} matching cache values...`
					: dc.doubleCheck
						? `you sure? delete all ${matchingCacheValuesCount} matching cache values`
						: `delete all ${matchingCacheValuesCount} matching cache values`}
			</Button>
		</fetcher.Form>
	)
}

function CacheKeyRow({
	cacheKey,
	instance,
	type,
}: {
	cacheKey: string
	instance?: string
	type: string
}) {
	const fetcher = useFetcher()
	const dc = useDoubleCheck()
	return (
		<div className="flex items-center gap-2 font-mono">
			<fetcher.Form method="POST">
				<input type="hidden" name="cacheKey" value={cacheKey} />
				<input type="hidden" name="instance" value={instance} />
				<input type="hidden" name="type" value={type} />
				<Button
					size="small"
					variant="danger"
					{...dc.getButtonProps({ type: 'submit' })}
				>
					{fetcher.state === 'idle'
						? dc.doubleCheck
							? 'You sure?'
							: 'Delete'
						: 'Deleting...'}
				</Button>
			</fetcher.Form>
			<a
				href={`/resources/cache/${type}/${encodeURIComponent(
					cacheKey,
				)}?instance=${instance}`}
			>
				{cacheKey}
			</a>
		</div>
	)
}

export function ErrorBoundary() {
	const error = useCapturedRouteError()
	console.error(error)

	if (isRouteErrorResponse(error)) {
		let data = ''
		if (error.data != null) {
			if (typeof error.data === 'string') {
				data = error.data
			} else {
				try {
					data = JSON.stringify(error.data, null, 2)
				} catch {
					data = String(error.data)
				}
			}
		}
		const statusLine = `${error.status} ${error.statusText}`.trim()
		return (
			<div>
				<div>{statusLine || 'Unexpected response'}</div>
				{data ? <pre className="whitespace-pre-wrap">{data}</pre> : null}
			</div>
		)
	}
	if (error instanceof Response) {
		const statusLine = error.statusText
			? `${error.status} ${error.statusText}`.trim()
			: error.url
				? `${error.status} ${error.url}`.trim()
				: `Response ${error.status}`
		return <div>{statusLine || 'Unexpected response'}</div>
	}
	if (error instanceof Error) {
		return <div>An unexpected error occurred: {error.message}</div>
	} else {
		return <div>Unknown error</div>
	}
}
