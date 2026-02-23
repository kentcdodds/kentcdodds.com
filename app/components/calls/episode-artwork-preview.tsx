import { clsx } from 'clsx'
import * as React from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useSpinDelay } from 'spin-delay'
import {
	getCallKentEpisodeArtworkAvatar,
	getCallKentEpisodeArtworkUrl,
} from '#app/utils/call-kent-artwork.ts'
import { getAvatar } from '#app/utils/misc-react.tsx'
import { imgSrc } from '#app/utils/suspense-image.ts'

const AVATAR_SIZE = 1400

function getHost(origin: string) {
	try {
		return new URL(origin).host
	} catch {
		// origin should be a valid URL, but keep preview resilient
		return origin.replace(/^https?:\/\//, '')
	}
}

export function EpisodeArtworkPreview({
	title,
	email,
	firstName,
	team,
	origin,
	hasGravatar,
	isAnonymous,
	onAnonymousChange,
}: {
	title: string
	email: string
	firstName: string
	team: string
	origin: string
	hasGravatar: boolean
	isAnonymous: boolean
	onAnonymousChange: (next: boolean) => void
}) {
	const [debouncedTitle, setDebouncedTitle] = React.useState(title)
	const [, startTransition] = React.useTransition()
	const [enableSuspenseImage, setEnableSuspenseImage] = React.useState(false)
	const [previewIsAnonymous, setPreviewIsAnonymous] = React.useState(isAnonymous)
	const showPending = useSpinDelay(previewIsAnonymous !== isAnonymous, {
		delay: 150,
		minDuration: 250,
	})

	React.useEffect(() => {
		const timeout = setTimeout(() => {
			startTransition(() => {
				setEnableSuspenseImage(true)
				setDebouncedTitle(title)
			})
		}, 350)
		return () => clearTimeout(timeout)
	}, [title, startTransition])

	const host = getHost(origin)
	const titleForPreview = debouncedTitle.trim() || 'Your Call Kent episode'

	const avatar = React.useMemo(
		() =>
			getCallKentEpisodeArtworkAvatar({
				isAnonymous: previewIsAnonymous,
				team,
				gravatarUrl: hasGravatar
					? getAvatar(email, { size: AVATAR_SIZE, fallback: null })
					: null,
			}),
		[email, team, hasGravatar, previewIsAnonymous],
	)

	const artworkUrl = React.useMemo(() => {
		return getCallKentEpisodeArtworkUrl({
			title: titleForPreview,
			url: `${host}/calls/00/00`,
			name: previewIsAnonymous ? '- Anonymous' : `- ${firstName}`,
			avatar,
			avatarIsRound: hasGravatar && !previewIsAnonymous,
			// 2x for a crisp UI preview (the element is ~260px wide).
			size: 520,
		})
	}, [titleForPreview, host, firstName, avatar, hasGravatar, previewIsAnonymous])

	const tooltip = isAnonymous
		? `Anonymous is enabled. Your call still shows up in Kent's admin with your info, but the published episode artwork uses a generic Kody avatar instead of your photo.`
		: `If you check this, your call still shows up in Kent's admin with your info, but the published episode artwork will use a generic Kody avatar instead of your photo.`
	const tooltipId = React.useId()
	const tooltipWrapperRef = React.useRef<HTMLSpanElement>(null)
	const [isTooltipOpen, setIsTooltipOpen] = React.useState(false)

	React.useEffect(() => {
		if (!isTooltipOpen) return
		function onPointerDown(event: PointerEvent) {
			const wrapper = tooltipWrapperRef.current
			if (!wrapper) return
			if (event.target instanceof Node && wrapper.contains(event.target)) return
			setIsTooltipOpen(false)
		}
		document.addEventListener('pointerdown', onPointerDown)
		return () => document.removeEventListener('pointerdown', onPointerDown)
	}, [isTooltipOpen])

	function handleTooltipPointerLeave() {
		// If the button is focused (keyboard/touch), keep the tooltip open until blur.
		const wrapper = tooltipWrapperRef.current
		if (!wrapper) {
			setIsTooltipOpen(false)
			return
		}
		const active = document.activeElement
		if (active instanceof Node && wrapper.contains(active)) return
		setIsTooltipOpen(false)
	}

	return (
		<section className="mb-10 rounded-lg bg-gray-100 p-6 dark:bg-gray-800">
			<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
				<div className="min-w-0 flex-1">
					<div className="flex items-start justify-between gap-4">
						<div className="min-w-0">
							<p className="text-primary text-lg font-medium">
								Episode artwork
							</p>
							<p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
								{`By default we use your avatar from `}
								<a
									href="https://gravatar.com"
									target="_blank"
									rel="noreferrer noopener"
									className="underlined font-medium"
								>
									Gravatar
								</a>
								{` (based on your account email). We encourage you to use your own photo.`}
							</p>
						</div>
					</div>

					{hasGravatar ? null : (
						<p className="mt-3 text-sm text-gray-600 dark:text-slate-400">
							{`No Gravatar found for `}
							<span className="font-medium">{email}</span>
							{`. The artwork will use Kody unless you add an image on Gravatar.`}
						</p>
					)}

					<label className="mt-5 flex items-start gap-3">
						<input
							type="checkbox"
							name="anonymous"
							className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600"
							checked={isAnonymous}
							onChange={(e) => {
								const next = e.currentTarget.checked
								onAnonymousChange(next)
								startTransition(() => {
									setEnableSuspenseImage(true)
									setPreviewIsAnonymous(next)
								})
							}}
						/>
						<span className="min-w-0">
							<span className="text-primary inline-flex items-center gap-2 text-sm font-medium">
								<span>Publish anonymously</span>
								<span
									ref={tooltipWrapperRef}
									className="relative inline-flex"
									onPointerEnter={() => setIsTooltipOpen(true)}
									onPointerLeave={handleTooltipPointerLeave}
									onFocus={() => setIsTooltipOpen(true)}
									onBlur={(event) => {
										const wrapper = tooltipWrapperRef.current
										if (!wrapper) return
										const nextFocused = event.relatedTarget
										if (
											nextFocused instanceof Node &&
											wrapper.contains(nextFocused)
										) {
											return
										}
										setIsTooltipOpen(false)
									}}
								>
									<button
										type="button"
										aria-label="What does publish anonymously mean?"
										aria-describedby={isTooltipOpen ? tooltipId : undefined}
										aria-expanded={isTooltipOpen}
										onClick={() => setIsTooltipOpen(true)}
										onKeyDown={(event) => {
											if (event.key === 'Escape') setIsTooltipOpen(false)
										}}
										className="text-primary inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-xs leading-none opacity-80 hover:opacity-100 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600"
									>
										?
									</button>
									{isTooltipOpen ? (
										<span
											id={tooltipId}
											role="tooltip"
											className="absolute top-full left-0 z-20 mt-2 w-72 rounded-md bg-white p-3 text-sm text-gray-700 shadow-lg ring-1 ring-black/5 dark:bg-gray-900 dark:text-slate-200 dark:ring-white/10"
										>
											{tooltip}
										</span>
									) : null}
								</span>
							</span>
							<span className="mt-1 block text-sm text-gray-600 dark:text-slate-400">
								{`Recommended: leave this unchecked so we can feature your avatar.`}
							</span>
						</span>
					</label>
				</div>

				<div className="flex w-full flex-col gap-3 lg:w-[260px] lg:flex-none">
					<p className="text-primary text-sm font-medium">Preview</p>
					<div
						className={clsx(
							'relative aspect-square w-full overflow-hidden rounded-lg bg-gray-200 shadow-sm transition-opacity dark:bg-gray-700',
							showPending ? 'opacity-60' : 'opacity-100',
						)}
						aria-busy={showPending}
					>
						<EpisodeArtworkImg
							enableSuspense={enableSuspenseImage}
							src={artworkUrl}
							alt="Episode artwork preview"
							loading="lazy"
							className="h-full w-full object-cover"
						/>
					</div>
				</div>
			</div>
		</section>
	)
}

function EpisodeArtworkImg({
	enableSuspense,
	src,
	...props
}: { enableSuspense: boolean } & React.ComponentProps<'img'>) {
	const safeSrc = src ?? ''
	return (
		<ErrorBoundary fallback={<img src={safeSrc} {...props} />} resetKeys={[safeSrc]}>
			<React.Suspense fallback={<img src={safeSrc} {...props} />}>
				{enableSuspense ? (
					<Img src={safeSrc} {...props} />
				) : (
					<img src={safeSrc} {...props} />
				)}
			</React.Suspense>
		</ErrorBoundary>
	)
}

function Img({ src = '', ...props }: React.ComponentProps<'img'>) {
	const loadedSrc = React.use(imgSrc(src))
	return <img src={loadedSrc} {...props} />
}

