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
import { Field } from '#app/components/form-elements.tsx'
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
	useDebounce,
	useDoubleCheck,
	useCapturedRouteError,
} from '#app/utils/misc-react.tsx'
import { requireAdminUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/cache.admin'

type CacheBucketType = 'shared' | 'memory'

export async function loader({ request }: Route.LoaderArgs) {
	await requireAdminUser(request)
	const searchParams = new URL(request.url).searchParams
	const query = searchParams.get('query')
	const limit = Number(searchParams.get('limit') ?? 100)

	let cacheKeys: { shared: Array<string>; lru: Array<string> }
	if (typeof query === 'string') {
		cacheKeys = await searchCacheKeys(query, limit)
	} else {
		cacheKeys = await getAllCacheKeys(limit)
	}
	return json({ cacheKeys })
}

export async function action({ request }: Route.ActionArgs) {
	await requireAdminUser(request)
	const formData = await request.formData()
	const key = formData.get('cacheKey')
	const type = formData.get('type')

	invariantResponse(typeof key === 'string', 'cacheKey must be a string')
	invariantResponse(typeof type === 'string', 'type must be a string')

	switch (type) {
		case 'shared': {
			await cache.delete(key)
			break
		}
		case 'memory': {
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
								{data.cacheKeys.shared.length + data.cacheKeys.lru.length}
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
				</div>
			</Form>
			<Spacer size="2xs" />
			<div className="flex flex-col gap-4">
				<H3>Memory Cache:</H3>
				{data.cacheKeys.lru.map((key) => (
					<CacheKeyRow key={key} cacheKey={key} type="memory" />
				))}
			</div>
			<Spacer size="3xs" />
			<div className="flex flex-col gap-4">
				<H3>Shared Cache:</H3>
				{data.cacheKeys.shared.map((key) => (
					<CacheKeyRow key={key} cacheKey={key} type="shared" />
				))}
			</div>
		</div>
	)
}

function CacheKeyRow({
	cacheKey,
	type,
}: {
	cacheKey: string
	type: CacheBucketType
}) {
	const fetcher = useFetcher()
	const dc = useDoubleCheck()
	return (
		<div className="flex items-center gap-2 font-mono">
			<fetcher.Form method="POST">
				<input type="hidden" name="cacheKey" value={cacheKey} />
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
				href={`/resources/cache/${type}/${encodeURIComponent(cacheKey)}`}
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
