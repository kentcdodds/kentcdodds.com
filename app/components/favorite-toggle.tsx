import { clsx } from 'clsx'
import * as React from 'react'
import { Link, useFetcher } from 'react-router'
import { SpinnerIcon, StarIcon } from '#app/components/icons.tsx'
import { type FavoriteContentType } from '#app/utils/favorites.ts'
import { useOptionalUser } from '#app/utils/use-root-data.ts'

type FavoriteResponse = {
	isFavorite: boolean
	authenticated?: boolean
	error?: string
}

function isFavoriteResponse(data: unknown): data is FavoriteResponse {
	return (
		typeof data === 'object' &&
		data !== null &&
		'isFavorite' in data &&
		typeof (data as any).isFavorite === 'boolean'
	)
}

export function FavoriteToggle({
	contentType,
	contentId,
	initialIsFavorite,
	mode = 'button',
	label = 'Favorite',
	className,
}: {
	contentType: FavoriteContentType
	contentId: string
	initialIsFavorite?: boolean
	mode?: 'button' | 'icon'
	label?: string
	className?: string
}) {
	const user = useOptionalUser()
	const fetcherKey = `favorite:${contentType}:${contentId}`
	const fetcher = useFetcher<FavoriteResponse>({ key: fetcherKey })

	const optimisticIntent = fetcher.formData?.get('intent')
	const optimisticIsFavorite =
		optimisticIntent === 'add'
			? true
			: optimisticIntent === 'remove'
				? false
				: undefined

	const fetchedIsFavorite = isFavoriteResponse(fetcher.data)
		? fetcher.data.isFavorite
		: undefined

	const isFavorite =
		optimisticIsFavorite ?? fetchedIsFavorite ?? initialIsFavorite ?? false

	const shouldLoadInitial =
		Boolean(user) &&
		initialIsFavorite === undefined &&
		fetchedIsFavorite === undefined &&
		optimisticIsFavorite === undefined &&
		fetcher.state === 'idle'

	React.useEffect(() => {
		if (!shouldLoadInitial) return
		const searchParams = new URLSearchParams({
			contentType,
			contentId,
		})
		fetcher.load(`/resources/favorite?${searchParams.toString()}`)
	}, [shouldLoadInitial, contentType, contentId, fetcher])

	const nextIntent = isFavorite ? 'remove' : 'add'
	const isBusy = fetcher.state !== 'idle'

	const icon = isBusy ? (
		<SpinnerIcon size={18} className="animate-spin" />
	) : (
		<StarIcon size={18} filled={isFavorite} />
	)

	const text = isFavorite ? 'Favorited' : label
	const iconAriaLabel = isFavorite ? 'Unfavorite' : label

	if (!user) {
		return (
			<Link
				to="/login"
				className={clsx(
					mode === 'icon'
						? 'text-secondary hover:text-team-current focus:text-team-current inline-flex items-center justify-center transition focus:outline-none'
						: 'focus-ring text-primary bg-secondary hover:text-team-current inline-flex items-center gap-2 rounded-full px-6 py-3 text-lg font-medium transition focus:outline-none',
					className,
				)}
				aria-label="Login to favorite"
				title="Login to favorite"
			>
				{icon}
				{mode === 'button' ? <span>Login to favorite</span> : null}
			</Link>
		)
	}

	return (
		<fetcher.Form method="POST" action="/action/favorite" className={className}>
			<input type="hidden" name="contentType" value={contentType} />
			<input type="hidden" name="contentId" value={contentId} />
			<input type="hidden" name="intent" value={nextIntent} />
			<button
				type="submit"
				disabled={isBusy}
				aria-pressed={isFavorite}
				aria-label={mode === 'icon' ? iconAriaLabel : undefined}
				title={mode === 'icon' ? iconAriaLabel : undefined}
				className={clsx(
					mode === 'icon'
						? clsx(
								'focus-ring inline-flex items-center justify-center rounded-md p-2 transition focus:outline-none',
								{
									'text-team-current': isFavorite,
									'text-secondary hover:text-team-current focus:text-team-current':
										!isFavorite,
								},
							)
						: clsx(
								'focus-ring inline-flex items-center gap-2 rounded-full px-6 py-3 text-lg font-medium transition focus:outline-none',
								{
									'bg-inverse text-inverse': isFavorite,
									'bg-secondary text-primary hover:text-team-current focus:text-team-current':
										!isFavorite,
								},
							),
				)}
			>
				{icon}
				{mode === 'button' ? <span>{text}</span> : null}
			</button>
		</fetcher.Form>
	)
}

