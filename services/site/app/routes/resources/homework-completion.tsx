import * as React from 'react'
import { data as json, useFetcher, type HeadersFunction } from 'react-router'
import { z } from 'zod'
import { clsx } from 'clsx'
import {
	CheckIcon,
	CheckCircledIcon,
	SpinnerIcon,
} from '#app/components/icons.tsx'
import {
	getEpisodeHomeworkContentId,
	parseEpisodeHomeworkContentId,
} from '#app/utils/favorites.ts'
import { reuseUsefulLoaderHeaders } from '#app/utils/misc.ts'
import { type Route } from './+types/homework-completion'

const homeworkCompletionResourceRoute = '/resources/homework-completion'

type HomeworkCompletionResponse = {
	completed: boolean
	authenticated: boolean
	error?: string
}

function isHomeworkCompletionResponse(
	data: unknown,
): data is HomeworkCompletionResponse {
	return (
		typeof data === 'object' &&
		data !== null &&
		'completed' in data &&
		typeof (data as HomeworkCompletionResponse).completed === 'boolean' &&
		'authenticated' in data &&
		typeof (data as HomeworkCompletionResponse).authenticated === 'boolean'
	)
}

export function HomeworkCompletionToggle({
	seasonNumber,
	episodeNumber,
	itemIndex,
	initialCompleted = false,
	children,
}: {
	seasonNumber: number
	episodeNumber: number
	itemIndex: number
	initialCompleted?: boolean
	children: React.ReactNode
}) {
	const fetcherKey = `homework:${seasonNumber}:${episodeNumber}:${itemIndex}`
	const fetcher = useFetcher<HomeworkCompletionResponse>({ key: fetcherKey })
	const contentId = getEpisodeHomeworkContentId({
		seasonNumber,
		episodeNumber,
		itemIndex,
	})

	const optimisticCompleted =
		fetcher.formData?.get('completed') === 'true'
			? true
			: fetcher.formData?.get('completed') === 'false'
				? false
				: undefined
	const fetchedCompleted =
		isHomeworkCompletionResponse(fetcher.data) && !fetcher.data.error
			? fetcher.data.completed
			: undefined
	const isCompleted =
		optimisticCompleted ?? fetchedCompleted ?? initialCompleted ?? false
	const isBusy = fetcher.state !== 'idle'

	const buttonContents = (
		<>
			<span
				aria-hidden="true"
				className={clsx(
					'mt-1 mr-6 inline-flex h-10 w-10 flex-none items-center justify-center rounded-full border transition',
					isCompleted
						? 'border-emerald-600 bg-emerald-600 text-white shadow-[0_0_0_4px_rgba(16,185,129,0.12)] dark:border-emerald-400 dark:bg-emerald-500 dark:text-gray-950 dark:shadow-[0_0_0_4px_rgba(52,211,153,0.16)]'
						: 'border-gray-300 bg-white text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500',
				)}
			>
				{isBusy ? (
					<SpinnerIcon size={18} className="animate-spin" />
				) : isCompleted ? (
					<CheckIcon />
				) : (
					<CheckCircledIcon size={20} className="opacity-65" />
				)}
			</span>
			<span
				className={clsx(
					'min-w-0 transition',
					isCompleted ? 'text-primary' : 'text-primary/90 dark:text-white/90',
				)}
			>
				{children}
			</span>
		</>
	)

	return (
		<fetcher.Form method="POST" action={homeworkCompletionResourceRoute}>
			<input type="hidden" name="contentId" value={contentId} />
			<input type="hidden" name="completed" value={String(!isCompleted)} />
			<button
				type="submit"
				disabled={isBusy}
				aria-pressed={isCompleted}
				className={clsx(
					'group focus-ring flex w-full items-start rounded-lg px-2 py-2 text-left transition focus:outline-none',
					isCompleted
						? 'bg-emerald-50/90 hover:bg-emerald-50 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/15'
						: 'hover:bg-black/3 dark:hover:bg-white/4',
				)}
			>
				{buttonContents}
			</button>
		</fetcher.Form>
	)
}

async function getHomeworkCompletionServerServices() {
	const [
		{ ensurePrimary },
		{ getUser },
		{ getClientSession },
		{ setEpisodeHomeworkCompletion, getEpisodeHomeworkCompletions },
	] = await Promise.all([
		import('#app/utils/litefs-js.server.ts'),
		import('#app/utils/session.server.ts'),
		import('#app/utils/client.server.ts'),
		import('#app/utils/prisma.server.ts'),
	])
	return {
		ensurePrimary,
		getUser,
		getClientSession,
		setEpisodeHomeworkCompletion,
		getEpisodeHomeworkCompletions,
	}
}

const HomeworkCompletionFormSchema = z.object({
	contentId: z.string().min(1).max(200),
	completed: z.enum(['true', 'false']).transform((value) => value === 'true'),
})

export async function action({ request }: Route.ActionArgs) {
	const {
		ensurePrimary,
		getUser,
		getClientSession,
		setEpisodeHomeworkCompletion,
	} = await getHomeworkCompletionServerServices()
	const formData = await request.formData()
	const submission = HomeworkCompletionFormSchema.safeParse(
		Object.fromEntries(formData),
	)
	if (!submission.success) {
		return json(
			{ completed: false, authenticated: false, error: 'INVALID_FORM_DATA' },
			{ status: 400 },
		)
	}

	const parsedContentId = parseEpisodeHomeworkContentId(
		submission.data.contentId,
	)
	if (!parsedContentId) {
		return json(
			{ completed: false, authenticated: false, error: 'INVALID_CONTENT_ID' },
			{ status: 400 },
		)
	}

	await ensurePrimary()

	const user = await getUser(request)
	const clientSession = await getClientSession(request, user)
	const clientId = clientSession.getClientId()
	if (!user && !clientId) {
		return json(
			{ completed: false, authenticated: false, error: 'MISSING_CLIENT_ID' },
			{ status: 400 },
		)
	}
	const completed = user
		? await setEpisodeHomeworkCompletion({
				...parsedContentId,
				completed: submission.data.completed,
				userId: user.id,
			})
		: await setEpisodeHomeworkCompletion({
				...parsedContentId,
				completed: submission.data.completed,
				clientId: clientId!,
			})

	const headers = await clientSession.getHeaders()
	return json(
		{
			completed,
			authenticated: Boolean(user),
		} satisfies HomeworkCompletionResponse,
		{ headers },
	)
}

const HomeworkCompletionQuerySchema = z.object({
	contentId: z.string().min(1).max(200),
})

export async function loader({ request }: Route.LoaderArgs) {
	const { getUser, getClientSession, getEpisodeHomeworkCompletions } =
		await getHomeworkCompletionServerServices()
	const headers = {
		'Cache-Control': 'private, max-age=0, must-revalidate',
		Vary: 'Cookie',
	}
	const url = new URL(request.url)
	const submission = HomeworkCompletionQuerySchema.safeParse({
		contentId: url.searchParams.get('contentId'),
	})
	if (!submission.success) {
		return json(
			{ completed: false, authenticated: false, error: 'INVALID_QUERY' },
			{ status: 400, headers },
		)
	}

	const parsedContentId = parseEpisodeHomeworkContentId(
		submission.data.contentId,
	)
	if (!parsedContentId) {
		return json(
			{ completed: false, authenticated: false, error: 'INVALID_CONTENT_ID' },
			{ status: 400, headers },
		)
	}

	const user = await getUser(request)
	const clientSession = await getClientSession(request, user)
	const clientId = clientSession.getClientId()
	const completionIds = await getEpisodeHomeworkCompletions({
		seasonNumber: parsedContentId.seasonNumber,
		episodeNumber: parsedContentId.episodeNumber,
		...(user ? { userId: user.id } : clientId ? { clientId } : {}),
	})
	return json(
		{
			completed: completionIds.has(submission.data.contentId),
			authenticated: Boolean(user),
		} satisfies HomeworkCompletionResponse,
		{
			headers: await clientSession.getHeaders(headers),
		},
	)
}

export const headers: HeadersFunction = ({
	loaderHeaders,
	parentHeaders,
	actionHeaders,
	errorHeaders,
}) => {
	const headers = new Headers(
		reuseUsefulLoaderHeaders({
			loaderHeaders,
			parentHeaders,
			actionHeaders,
			errorHeaders,
		}),
	)
	for (const sourceHeaders of [loaderHeaders, actionHeaders]) {
		for (const [headerName, headerValue] of sourceHeaders.entries()) {
			if (headerName.toLowerCase() === 'set-cookie') {
				headers.append('Set-Cookie', headerValue)
			}
		}
	}
	return headers
}
