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
import { H2, H3, Paragraph } from '#app/components/typography.tsx'
import {
	deleteLexicalSearchChunk,
	deleteLexicalSearchDoc,
	deleteLexicalSearchSource,
	getLexicalSearchAdminOverview,
	syncLexicalSearchService,
} from '#app/utils/lexical-search-client.server.ts'
import { getEnv } from '#app/utils/env.server.ts'
import {
	useDebounce,
	useDoubleCheck,
	useCapturedRouteError,
} from '#app/utils/misc-react.tsx'
import { requireAdminUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/lexical-search.admin'

const defaultLimit = 100
const maxLimit = 500

function sanitizeLimit(limit: number) {
	if (!Number.isFinite(limit)) return defaultLimit
	return Math.min(maxLimit, Math.max(1, Math.floor(limit)))
}

function getTargetLabel() {
	const workerUrl = getEnv().LEXICAL_SEARCH_WORKER_URL
	if (workerUrl.startsWith('MOCK_')) return 'local mock'
	try {
		return new URL(workerUrl).host
	} catch {
		return workerUrl
	}
}

export async function loader({ request }: Route.LoaderArgs) {
	await requireAdminUser(request)
	const searchParams = new URL(request.url).searchParams
	const query = searchParams.get('query') ?? ''
	const sourceKey = searchParams.get('sourceKey') ?? ''
	const type = searchParams.get('type') ?? ''
	const limit = sanitizeLimit(Number(searchParams.get('limit') ?? defaultLimit))
	const overview = await getLexicalSearchAdminOverview({
		query,
		sourceKey,
		type,
		limit,
	})
	return json({
		...overview,
		target: getTargetLabel(),
	})
}

export async function action({ request }: Route.ActionArgs) {
	await requireAdminUser(request)
	const formData = await request.formData()
	const intent = formData.get('intent')
	invariantResponse(typeof intent === 'string', 'intent must be a string')

	switch (intent) {
		case 'sync': {
			await syncLexicalSearchService({
				force: formData.get('force') === 'true',
			})
			return json({ success: true })
		}
		case 'delete-source': {
			const sourceKey = formData.get('sourceKey')
			invariantResponse(typeof sourceKey === 'string', 'sourceKey must be a string')
			await deleteLexicalSearchSource(sourceKey)
			return json({ success: true })
		}
		case 'delete-doc': {
			const docId = formData.get('docId')
			invariantResponse(typeof docId === 'string', 'docId must be a string')
			await deleteLexicalSearchDoc(docId)
			return json({ success: true })
		}
		case 'delete-chunk': {
			const chunkId = formData.get('chunkId')
			invariantResponse(typeof chunkId === 'string', 'chunkId must be a string')
			await deleteLexicalSearchChunk(chunkId)
			return json({ success: true })
		}
		default:
			throw new Error(`Unknown lexical-search admin intent: ${intent}`)
	}
}

export default function LexicalSearchAdminRoute({
	loaderData: data,
}: Route.ComponentProps) {
	const [searchParams] = useSearchParams()
	const submit = useSubmit()
	const query = searchParams.get('query') ?? ''
	const sourceKey = searchParams.get('sourceKey') ?? ''
	const type = searchParams.get('type') ?? ''
	const limit = searchParams.get('limit') ?? String(defaultLimit)
	const handleFormChange = useDebounce((form: HTMLFormElement) => {
		void submit(form)
	}, 400)

	return (
		<div className="mx-10vw">
			<H2 className="mt-3">Lexical Search Admin</H2>
			<Paragraph>
				Inspect the derived lexical-search index, trigger syncs, and delete
				sources/docs/chunks from the current lexical store.
			</Paragraph>
			<Spacer size="2xs" />
			<InfoPanel target={data.target} />
			<Spacer size="2xs" />
			<Form
				method="get"
				className="flex flex-col gap-4"
				onChange={(event) => handleFormChange(event.currentTarget)}
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
							placeholder="Filter lexical docs, chunks, or sources"
							className="text-primary bg-primary border-secondary focus:bg-secondary hover:border-team-current focus:border-team-current w-full rounded-full border py-6 pr-6 pl-14 text-lg font-medium focus:outline-none md:pr-24"
						/>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-4">
					<Field
						label="Source"
						name="sourceKey"
						defaultValue={sourceKey}
						type="text"
						placeholder="lexical-search/repo-content.json"
					/>
					<Field
						label="Type"
						name="type"
						defaultValue={type}
						type="text"
						placeholder="blog, ck, youtube..."
					/>
					<Field
						label="Limit"
						name="limit"
						defaultValue={limit}
						type="number"
						step="1"
						min="1"
						max={String(maxLimit)}
						placeholder="results limit"
					/>
					<FieldContainer label="Target" id="target">
						{({ inputProps }) => (
							<input
								{...inputProps}
								readOnly
								value={data.target}
								className={inputClassName}
							/>
						)}
					</FieldContainer>
				</div>
			</Form>
			<Spacer size="2xs" />
			<SyncLexicalSearchButton />
			<Spacer size="2xs" />
			<div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
				<Paragraph>
					Sources: {data.stats.sourceCount} | Docs: {data.stats.docCount} | Chunks:{' '}
					{data.stats.chunkCount}
				</Paragraph>
				<Paragraph>
					Last synced: {data.stats.lastSyncedAt ?? 'never'}
				</Paragraph>
			</div>
			<Spacer size="2xs" />
			<div className="flex flex-col gap-4">
				<H3>Sources</H3>
				{data.sources.map((source) => (
					<LexicalSourceRow
						key={source.sourceKey}
						sourceKey={source.sourceKey}
						chunkCount={source.chunkCount}
					/>
				))}
				{data.sources.length === 0 ? <Paragraph>No matching sources.</Paragraph> : null}
			</div>
			<Spacer size="3xs" />
			<div className="flex flex-col gap-4">
				<H3>Docs</H3>
				{data.docs.map((doc) => (
					<LexicalDocRow key={doc.docId} docId={doc.docId} title={doc.title} />
				))}
				{data.docs.length === 0 ? <Paragraph>No matching docs.</Paragraph> : null}
			</div>
			<Spacer size="3xs" />
			<div className="flex flex-col gap-4">
				<H3>Chunks</H3>
				{data.chunks.map((chunk) => (
					<LexicalChunkRow key={chunk.id} chunkId={chunk.id} />
				))}
				{data.chunks.length === 0 ? <Paragraph>No matching chunks.</Paragraph> : null}
			</div>
		</div>
	)
}

function InfoPanel({ target }: { target: string }) {
	return (
		<div className="rounded-2xl bg-gray-100 p-4 dark:bg-gray-850">
			<Paragraph>
				Store target: <code>{target}</code>
			</Paragraph>
		</div>
	)
}

function SyncLexicalSearchButton() {
	const fetcher = useFetcher()
	const dc = useDoubleCheck()
	const isSyncing = fetcher.state !== 'idle'
	return (
		<fetcher.Form method="POST">
			<input type="hidden" name="intent" value="sync" />
			<input type="hidden" name="force" value="true" />
			<Button
				size="small"
				variant="secondary"
				disabled={isSyncing}
				{...dc.getButtonProps({ type: 'submit' })}
			>
				{isSyncing ? 'syncing lexical index...' : dc.doubleCheck ? 'you sure? force sync lexical index' : 'force sync lexical index'}
			</Button>
		</fetcher.Form>
	)
}

function LexicalSourceRow({
	sourceKey,
	chunkCount,
}: {
	sourceKey: string
	chunkCount: number
}) {
	const fetcher = useFetcher()
	const dc = useDoubleCheck()
	return (
		<div className="flex items-center gap-2 font-mono">
			<fetcher.Form method="POST">
				<input type="hidden" name="intent" value="delete-source" />
				<input type="hidden" name="sourceKey" value={sourceKey} />
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
			<a href={`/resources/lexical-search/source/${encodeURIComponent(sourceKey)}`}>
				{sourceKey} ({chunkCount} chunks)
			</a>
		</div>
	)
}

function LexicalDocRow({ docId, title }: { docId: string; title: string }) {
	const fetcher = useFetcher()
	const dc = useDoubleCheck()
	return (
		<div className="flex items-center gap-2 font-mono">
			<fetcher.Form method="POST">
				<input type="hidden" name="intent" value="delete-doc" />
				<input type="hidden" name="docId" value={docId} />
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
			<a href={`/resources/lexical-search/doc/${encodeURIComponent(docId)}`}>
				{title} <span className="text-slate-500">({docId})</span>
			</a>
		</div>
	)
}

function LexicalChunkRow({ chunkId }: { chunkId: string }) {
	const fetcher = useFetcher()
	const dc = useDoubleCheck()
	return (
		<div className="flex items-center gap-2 font-mono">
			<fetcher.Form method="POST">
				<input type="hidden" name="intent" value="delete-chunk" />
				<input type="hidden" name="chunkId" value={chunkId} />
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
			<a href={`/resources/lexical-search/chunk/${encodeURIComponent(chunkId)}`}>
				{chunkId}
			</a>
		</div>
	)
}

export function ErrorBoundary() {
	const error = useCapturedRouteError()
	console.error(error)

	if (isRouteErrorResponse(error)) {
		return (
			<div className="mx-10vw my-10">
				<H2>Lexical Search Admin Error</H2>
				<Paragraph>
					{error.status} {error.statusText}
				</Paragraph>
			</div>
		)
	}

	return (
		<div className="mx-10vw my-10">
			<H2>Lexical Search Admin Error</H2>
			<Paragraph>{error instanceof Error ? error.message : String(error)}</Paragraph>
		</div>
	)
}
