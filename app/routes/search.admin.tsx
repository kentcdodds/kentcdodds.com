import * as React from 'react'
import {
	data as json,
	Form,
	Link,
	useFetcher,
	useLoaderData,
	useSearchParams,
	useSubmit,
} from 'react-router'
import invariant from 'tiny-invariant'
import { Button } from '#app/components/button.tsx'
import {
	ErrorPanel,
	Field,
	inputClassName,
} from '#app/components/form-elements.tsx'
import { Grid } from '#app/components/grid.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { H2, H3, H4, Paragraph } from '#app/components/typography.tsx'
import { type KCDHandle } from '#app/types.ts'
import {
	getErrorMessage,
	useDebounce,
	useDoubleCheck,
	useCapturedRouteError,
} from '#app/utils/misc.tsx'
import {
	getSemanticSearchAdminStore,
	isDocIdIgnored,
	type SemanticSearchIgnoreList,
	type SemanticSearchManifest,
} from '#app/utils/semantic-search-admin.server.ts'
import {
	isSemanticSearchConfigured,
	vectorizeDeleteByIds,
} from '#app/utils/semantic-search.server.ts'
import { requireAdminUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/search.admin'

export const handle: KCDHandle = {
	getSitemapEntries: () => null,
}

type DocRow = {
	docId: string
	manifestKey: string
	type: string
	title: string
	url: string
	sourceUpdatedAt?: string
	transcriptSource?: string
	chunkCount: number
	chunks: Array<{ id: string; snippet: string; hash: string }>
	ignored: boolean
}

function asPositiveInt(value: string | null, fallback: number) {
	if (!value) return fallback
	const n = Number(value)
	if (!Number.isFinite(n)) return fallback
	return Math.max(0, Math.floor(n))
}

function containsInsensitive(haystack: string, needle: string) {
	return haystack.toLowerCase().includes(needle.toLowerCase())
}

function filterDocs({
	docs,
	query,
	type,
	showIgnored,
}: {
	docs: DocRow[]
	query: string
	type: string
	showIgnored: boolean
}) {
	const q = query.trim()
	return docs.filter((doc) => {
		if (!showIgnored && doc.ignored) return false
		if (type && doc.type !== type) return false
		if (!q) return true
		if (
			containsInsensitive(doc.docId, q) ||
			containsInsensitive(doc.title, q) ||
			containsInsensitive(doc.url, q) ||
			containsInsensitive(doc.manifestKey, q)
		) {
			return true
		}
		return doc.chunks.some((c) => containsInsensitive(c.snippet, q))
	})
}

function sortDocs(docs: DocRow[]) {
	return [...docs].sort((a, b) => {
		// Bring ignored docs to the top so they’re easy to spot.
		if (a.ignored !== b.ignored) return a.ignored ? -1 : 1
		const typeDiff = a.type.localeCompare(b.type)
		if (typeDiff) return typeDiff
		const titleDiff = a.title.localeCompare(b.title)
		if (titleDiff) return titleDiff
		return a.docId.localeCompare(b.docId)
	})
}

export async function loader({ request }: Route.LoaderArgs) {
	await requireAdminUser(request)
	const url = new URL(request.url)
	const sp = url.searchParams

	const { store, configured, message } = getSemanticSearchAdminStore()
	const manifestParam = sp.get('manifest') ?? 'all'
	const query = sp.get('q') ?? ''
	const type = sp.get('type') ?? ''
	const showIgnored = sp.get('showIgnored') === 'true'
	const limit = Math.min(500, Math.max(10, asPositiveInt(sp.get('limit'), 100)))
	const offset = asPositiveInt(sp.get('offset'), 0)

	if (!store || !configured) {
		return json(
			{
				configured: false,
				message:
					message ??
					'Semantic search admin is not configured on this environment.',
				semanticSearchConfigured: isSemanticSearchConfigured(),
				manifestKeys: [] as string[],
				selectedManifest: manifestParam,
				selectedKeys: [] as string[],
				query,
				type,
				showIgnored,
				limit,
				offset,
				total: 0,
				docs: [] as DocRow[],
				typeOptions: [] as Array<{ type: string; count: number }>,
				ignoreList: {
					version: 1,
					patterns: [],
				} satisfies SemanticSearchIgnoreList,
				store: null as null | {
					source: string
					bucket: string
					ignoreListKey: string
				},
			},
			{ headers: { 'Cache-Control': 'no-store' } },
		)
	}

	const [manifestKeys, ignoreList] = await Promise.all([
		store.listManifestKeys(),
		store.getIgnoreList(),
	])

	const selectedKeys =
		manifestParam === 'all'
			? manifestKeys
			: manifestKeys.includes(manifestParam)
				? [manifestParam]
				: manifestKeys

	const manifests = await Promise.all(
		selectedKeys.map(async (key) => {
			const manifest = await store.getManifest(key)
			return { key, manifest }
		}),
	)

	const rows: DocRow[] = []
	for (const { key: manifestKey, manifest } of manifests) {
		const docs = (manifest as SemanticSearchManifest | null)?.docs ?? {}
		for (const [docId, doc] of Object.entries(docs)) {
			const chunks = Array.isArray(doc?.chunks) ? doc.chunks : []
			rows.push({
				docId,
				manifestKey,
				type: String(doc?.type ?? ''),
				title: String(doc?.title ?? docId),
				url: String(doc?.url ?? ''),
				sourceUpdatedAt:
					typeof (doc as any)?.sourceUpdatedAt === 'string'
						? (doc as any).sourceUpdatedAt
						: undefined,
				transcriptSource:
					typeof (doc as any)?.transcriptSource === 'string'
						? (doc as any).transcriptSource
						: undefined,
				chunkCount: chunks.length,
				chunks: chunks.map((c) => ({
					id: String((c as any)?.id ?? ''),
					hash: String((c as any)?.hash ?? ''),
					snippet: String((c as any)?.snippet ?? ''),
				})),
				ignored: isDocIdIgnored({ docId, ignoreList }),
			})
		}
	}

	const filtered = sortDocs(
		filterDocs({ docs: rows, query, type, showIgnored }),
	)
	const paged = filtered.slice(offset, offset + limit)

	const types = new Map<string, number>()
	for (const r of rows) {
		const key = r.type || 'unknown'
		types.set(key, (types.get(key) ?? 0) + 1)
	}
	const typeOptions = [...types.entries()]
		.map(([k, count]) => ({ type: k, count }))
		.sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))

	return json(
		{
			configured: true,
			message,
			semanticSearchConfigured: isSemanticSearchConfigured(),
			manifestKeys,
			selectedManifest: manifestParam,
			selectedKeys,
			query,
			type,
			showIgnored,
			limit,
			offset,
			total: filtered.length,
			docs: paged,
			typeOptions,
			ignoreList,
			store: {
				source: store.source,
				bucket: store.bucket,
				ignoreListKey: store.ignoreListKey,
			},
		},
		{ headers: { 'Cache-Control': 'no-store' } },
	)
}

function uniqPatterns(patterns: string[]) {
	const seen = new Set<string>()
	const result: string[] = []
	for (const p of patterns) {
		const trimmed = p.trim()
		if (!trimmed) continue
		if (seen.has(trimmed)) continue
		seen.add(trimmed)
		result.push(trimmed)
	}
	return result
}

async function deleteVectorsInBatches(ids: string[]) {
	let deleted = 0
	for (let i = 0; i < ids.length; i += 500) {
		const batch = ids.slice(i, i + 500).filter(Boolean)
		if (batch.length === 0) continue
		const res = await vectorizeDeleteByIds({ ids: batch })
		// Best-effort: Cloudflare returns { result: { deleted } } or { deleted } in mocks.
		const asAny = res as any
		const next =
			typeof asAny?.result?.deleted === 'number'
				? asAny.result.deleted
				: typeof asAny?.deleted === 'number'
					? asAny.deleted
					: 0
		deleted += next
	}
	return deleted
}

export async function action({ request }: Route.ActionArgs) {
	await requireAdminUser(request)

	const { store, configured } = getSemanticSearchAdminStore()
	if (!store || !configured) {
		return json(
			{ ok: false, error: 'R2 is not configured for /search/admin.' },
			{ status: 503 },
		)
	}

	const formData = await request.formData()
	const intent = formData.get('intent')
	invariant(typeof intent === 'string', 'intent must be a string')

	if (intent === 'ignore-add') {
		const pattern = String(formData.get('pattern') ?? '').trim()
		if (!pattern)
			return json({ ok: false, error: 'pattern is required' }, { status: 400 })

		const ignoreList = await store.getIgnoreList()
		const patterns = uniqPatterns([...(ignoreList.patterns ?? []), pattern])
		await store.putIgnoreList({
			version: 1,
			updatedAt: new Date().toISOString(),
			patterns,
		})
		return json({ ok: true })
	}

	if (intent === 'ignore-remove') {
		const pattern = String(formData.get('pattern') ?? '').trim()
		if (!pattern)
			return json({ ok: false, error: 'pattern is required' }, { status: 400 })

		const ignoreList = await store.getIgnoreList()
		const patterns = (ignoreList.patterns ?? [])
			.map((p) => p.trim())
			.filter(Boolean)
		await store.putIgnoreList({
			version: 1,
			updatedAt: new Date().toISOString(),
			patterns: patterns.filter((p) => p !== pattern),
		})
		return json({ ok: true })
	}

	if (intent === 'doc-delete') {
		const docId = String(formData.get('docId') ?? '').trim()
		const scope = String(formData.get('scope') ?? 'manifest')
		const manifestKey = String(formData.get('manifestKey') ?? '').trim()
		const addToIgnore = String(formData.get('addToIgnore') ?? '') === 'true'
		if (!docId)
			return json({ ok: false, error: 'docId is required' }, { status: 400 })

		const manifestKeys =
			scope === 'all'
				? await store.listManifestKeys()
				: manifestKey
					? [manifestKey]
					: await store.listManifestKeys()

		const vectorIdsToDelete: string[] = []
		const updatedManifests: string[] = []

		for (const key of manifestKeys) {
			const manifest = await store.getManifest(key)
			if (!manifest?.docs?.[docId]) continue
			const next: SemanticSearchManifest = structuredClone(manifest)
			const doc = next.docs[docId]
			if (doc?.chunks?.length) {
				for (const c of doc.chunks) {
					if (c?.id) vectorIdsToDelete.push(String(c.id))
				}
			}
			delete next.docs[docId]
			await store.putManifest(key, next)
			updatedManifests.push(key)
		}

		let deletedVectors = 0
		let vectorDeleteSkipped = false
		if (vectorIdsToDelete.length) {
			if (!isSemanticSearchConfigured()) {
				vectorDeleteSkipped = true
			} else {
				deletedVectors = await deleteVectorsInBatches(vectorIdsToDelete)
			}
		}

		if (addToIgnore) {
			const ignoreList = await store.getIgnoreList()
			const patterns = uniqPatterns([...(ignoreList.patterns ?? []), docId])
			await store.putIgnoreList({
				version: 1,
				updatedAt: new Date().toISOString(),
				patterns,
			})
		}

		return json({
			ok: true,
			docId,
			updatedManifests,
			vectorIdsRequested: vectorIdsToDelete.length,
			deletedVectors,
			vectorDeleteSkipped,
		})
	}

	return json(
		{ ok: false, error: `Unknown intent: ${intent}` },
		{ status: 400 },
	)
}

export default function SearchAdminRoute() {
	const data = useLoaderData<Route.ComponentProps['loaderData']>()
	const [searchParams] = useSearchParams()
	const submit = useSubmit()

	const syncGetForm = useDebounce((form: HTMLFormElement) => {
		void submit(form, { replace: true })
	}, 350)

	const ignoreAddFetcher = useFetcher<typeof action>()
	const ignoreAddRef = React.useRef<HTMLInputElement>(null)

	const nextOffset = data.offset + data.limit
	const prevOffset = Math.max(0, data.offset - data.limit)
	const hasPrev = data.offset > 0
	const hasNext = nextOffset < data.total

	return (
		<main className="mt-12 mb-24 lg:mt-24 lg:mb-48">
			<Grid>
				<div className="col-span-full">
					<H2>Semantic Search Admin</H2>
					<Paragraph textColorClassName="text-secondary">
						Inspect and curate semantic-search manifests; delete docs from the
						Vectorize index; manage an ignore list to prevent re-indexing.
					</Paragraph>
				</div>

				<Spacer size="2xs" className="col-span-full" />

				{data.message ? (
					<div className="col-span-full">
						<ErrorPanel>{data.message}</ErrorPanel>
					</div>
				) : null}

				{data.store ? (
					<div className="col-span-full">
						<Paragraph textColorClassName="text-secondary">
							Store: {data.store.source} • Bucket: {data.store.bucket} • Ignore
							list key: {data.store.ignoreListKey}
						</Paragraph>
					</div>
				) : null}

				<Spacer size="2xs" className="col-span-full" />

				<div className="col-span-full">
					<H3>Browse</H3>
					<Form
						method="get"
						className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-12"
						onChange={(e) => syncGetForm(e.currentTarget)}
					>
						<div className="md:col-span-4">
							<label className="block text-sm font-medium">Manifest</label>
							<select
								name="manifest"
								defaultValue={data.selectedManifest}
								className={inputClassName}
							>
								<option value="all">All manifests</option>
								{data.manifestKeys.map((k) => (
									<option key={k} value={k}>
										{k}
									</option>
								))}
							</select>
						</div>

						<div className="md:col-span-4">
							<Field
								label="Query"
								name="q"
								defaultValue={searchParams.get('q') ?? ''}
								placeholder="Filter by title/url/docId/snippet..."
							/>
						</div>

						<div className="md:col-span-2">
							<label className="block text-sm font-medium">Type</label>
							<select
								name="type"
								defaultValue={data.type}
								className={inputClassName}
							>
								<option value="">All</option>
								{data.typeOptions.map((o: { type: string; count: number }) => (
									<option key={o.type} value={o.type}>
										{o.type} ({o.count})
									</option>
								))}
							</select>
						</div>

						<div className="md:col-span-2">
							<Field
								label="Limit"
								name="limit"
								type="number"
								step="1"
								min="10"
								max="500"
								defaultValue={String(data.limit)}
							/>
						</div>

						<input type="hidden" name="offset" value={String(data.offset)} />

						<div className="flex items-center gap-3 md:col-span-12">
							<label className="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									name="showIgnored"
									defaultChecked={data.showIgnored}
									value="true"
								/>
								Show ignored
							</label>
							<Paragraph textColorClassName="text-secondary">
								Showing {data.docs.length} of {data.total} docs
							</Paragraph>
						</div>
					</Form>

					<div className="mt-4 flex items-center gap-2">
						<Button
							type="button"
							disabled={!hasPrev}
							onClick={() => {
								const next = new URLSearchParams(searchParams)
								next.set('offset', String(prevOffset))
								void submit(next, { method: 'get', replace: true })
							}}
						>
							Prev
						</Button>
						<Button
							type="button"
							disabled={!hasNext}
							onClick={() => {
								const next = new URLSearchParams(searchParams)
								next.set('offset', String(nextOffset))
								void submit(next, { method: 'get', replace: true })
							}}
						>
							Next
						</Button>
					</div>
				</div>

				<Spacer size="xs" className="col-span-full" />

				<div className="col-span-full md:col-span-5">
					<H3>Ignore list</H3>
					<Paragraph textColorClassName="text-secondary">
						Patterns match manifest doc IDs like `youtube:dQw4w9WgXcQ`. Use a
						trailing `*` for prefixes (ex: `youtube:*`).
					</Paragraph>

					<ignoreAddFetcher.Form
						method="post"
						className="mt-3 flex items-end gap-2"
						onSubmit={() => {
							// Keep typing fast.
							setTimeout(() => {
								ignoreAddRef.current?.focus()
							}, 0)
						}}
					>
						<input type="hidden" name="intent" value="ignore-add" />
						<div className="flex-1">
							<label className="block text-sm font-medium" htmlFor="pattern">
								Add pattern
							</label>
							<input
								ref={ignoreAddRef}
								id="pattern"
								name="pattern"
								type="text"
								placeholder="youtube:abc123 or youtube:*"
								className={inputClassName}
							/>
						</div>
						<Button type="submit" disabled={ignoreAddFetcher.state !== 'idle'}>
							{ignoreAddFetcher.state === 'idle' ? 'Add' : 'Adding...'}
						</Button>
					</ignoreAddFetcher.Form>

					<ul className="mt-4 space-y-2">
						{(data.ignoreList.patterns ?? []).length ? (
							(data.ignoreList.patterns ?? []).map((pattern) => (
								<IgnorePatternRow key={pattern} pattern={pattern} />
							))
						) : (
							<li>
								<Paragraph textColorClassName="text-secondary">
									No ignore patterns yet.
								</Paragraph>
							</li>
						)}
					</ul>
				</div>

				<div className="col-span-full md:col-span-7">
					<H3>Docs</H3>
					<div className="mt-3 space-y-4">
						{data.docs.length ? (
							data.docs.map((doc) => (
								<DocCard key={`${doc.manifestKey}:${doc.docId}`} doc={doc} />
							))
						) : (
							<Paragraph textColorClassName="text-secondary">
								No docs match the current filters.
							</Paragraph>
						)}
					</div>
				</div>
			</Grid>
		</main>
	)
}

function IgnorePatternRow({ pattern }: { pattern: string }) {
	const fetcher = useFetcher<typeof action>()
	const dc = useDoubleCheck()
	return (
		<li className="flex items-center justify-between gap-3 rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
			<code className="min-w-0 flex-1 truncate text-sm">{pattern}</code>
			<fetcher.Form method="post">
				<input type="hidden" name="intent" value="ignore-remove" />
				<input type="hidden" name="pattern" value={pattern} />
				<Button
					size="small"
					variant="danger"
					{...dc.getButtonProps({ type: 'submit' })}
					disabled={fetcher.state !== 'idle'}
				>
					{fetcher.state === 'idle'
						? dc.doubleCheck
							? 'You sure?'
							: 'Remove'
						: 'Removing...'}
				</Button>
			</fetcher.Form>
		</li>
	)
}

function DocCard({ doc }: { doc: DocRow }) {
	const deleteFetcher = useFetcher<typeof action>()
	const ignoreFetcher = useFetcher<typeof action>()
	const deleteDc = useDoubleCheck()
	const deleteIgnoreDc = useDoubleCheck()
	const ignoreDc = useDoubleCheck()

	const isDeleting = deleteFetcher.state !== 'idle'
	const isIgnoring = ignoreFetcher.state !== 'idle'

	// `useFetcher<typeof action>()` does not narrow well when a single action
	// supports multiple intents with different response shapes.
	const deleteData = deleteFetcher.data as any
	const deleteError =
		deleteData?.ok === false
			? String(deleteData.error ?? 'Delete failed')
			: null
	const deleteResult =
		deleteData?.ok === true &&
		typeof deleteData.vectorIdsRequested === 'number' &&
		typeof deleteData.vectorDeleteSkipped === 'boolean'
			? (deleteData as {
					vectorIdsRequested: number
					deletedVectors: number
					vectorDeleteSkipped: boolean
				})
			: null

	return (
		<div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					<H4 className="truncate">
						{doc.url ? (
							<Link to={doc.url} className="underline">
								{doc.title}
							</Link>
						) : (
							doc.title
						)}
					</H4>
					<Paragraph textColorClassName="text-secondary">
						<code>{doc.docId}</code> • <code>{doc.type}</code> • chunks:{' '}
						{doc.chunkCount}
						{doc.sourceUpdatedAt
							? ` • sourceUpdatedAt: ${doc.sourceUpdatedAt}`
							: ''}
						{doc.transcriptSource
							? ` • transcript: ${doc.transcriptSource}`
							: ''}
					</Paragraph>
					<Paragraph textColorClassName="text-secondary">
						Manifest: <code>{doc.manifestKey}</code>
						{doc.ignored ? ' • ignored' : ''}
					</Paragraph>
				</div>

				<div className="flex shrink-0 flex-wrap items-center gap-2">
					<ignoreFetcher.Form method="post">
						<input type="hidden" name="intent" value="ignore-add" />
						<input type="hidden" name="pattern" value={doc.docId} />
						<Button
							size="small"
							variant="secondary"
							{...ignoreDc.getButtonProps({ type: 'submit' })}
							disabled={isIgnoring}
							title="Adds an exact ignore pattern for this doc ID"
						>
							{isIgnoring
								? 'Ignoring...'
								: ignoreDc.doubleCheck
									? 'Confirm'
									: 'Ignore'}
						</Button>
					</ignoreFetcher.Form>

					<deleteFetcher.Form method="post">
						<input type="hidden" name="intent" value="doc-delete" />
						<input type="hidden" name="docId" value={doc.docId} />
						<input type="hidden" name="manifestKey" value={doc.manifestKey} />
						<input type="hidden" name="scope" value="manifest" />
						<input type="hidden" name="addToIgnore" value="false" />
						<Button
							size="small"
							variant="danger"
							{...deleteDc.getButtonProps({ type: 'submit' })}
							disabled={isDeleting}
						>
							{isDeleting
								? 'Deleting...'
								: deleteDc.doubleCheck
									? 'You sure?'
									: 'Delete'}
						</Button>
					</deleteFetcher.Form>

					<deleteFetcher.Form method="post">
						<input type="hidden" name="intent" value="doc-delete" />
						<input type="hidden" name="docId" value={doc.docId} />
						<input type="hidden" name="manifestKey" value={doc.manifestKey} />
						<input type="hidden" name="scope" value="manifest" />
						<input type="hidden" name="addToIgnore" value="true" />
						<Button
							size="small"
							variant="danger"
							{...deleteIgnoreDc.getButtonProps({ type: 'submit' })}
							disabled={isDeleting}
							title="Deletes now and adds this docId to ignore list"
						>
							{isDeleting
								? 'Deleting...'
								: deleteIgnoreDc.doubleCheck
									? 'You sure?'
									: 'Delete + ignore'}
						</Button>
					</deleteFetcher.Form>
				</div>
			</div>

			{deleteError ? (
				<div className="mt-3">
					<ErrorPanel>{deleteError}</ErrorPanel>
				</div>
			) : null}

			{deleteResult ? (
				<div className="mt-3">
					<Paragraph textColorClassName="text-secondary">
						Delete result: vectors requested {deleteResult.vectorIdsRequested},{' '}
						{deleteResult.vectorDeleteSkipped
							? 'Vectorize delete skipped (semantic search env not configured)'
							: `deleted ${deleteResult.deletedVectors}`}
						.
					</Paragraph>
				</div>
			) : null}

			<details className="mt-4">
				<summary className="cursor-pointer text-sm text-slate-600 dark:text-slate-300">
					View chunk snippets
				</summary>
				<ul className="mt-3 space-y-2">
					{doc.chunks.map((c) => (
						<li key={c.id} className="rounded bg-white/60 p-3 dark:bg-black/20">
							<div className="flex flex-wrap items-baseline justify-between gap-2">
								<code className="text-xs">{c.id}</code>
								<code className="text-xs text-slate-500">{c.hash}</code>
							</div>
							<p className="mt-2 text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-200">
								{c.snippet}
							</p>
						</li>
					))}
				</ul>
			</details>
		</div>
	)
}

export function ErrorBoundary() {
	const error = useCapturedRouteError()
	console.error(error)
	return (
		<div className="mx-10vw mt-10">
			<h2>Search admin error</h2>
			<pre className="whitespace-pre-wrap">{getErrorMessage(error)}</pre>
		</div>
	)
}
