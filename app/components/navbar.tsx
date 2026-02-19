import './navbar.css'
import { Link, useFetcher, useLocation, useNavigate } from '@remix-run/react'
import { useHotkey } from '@tanstack/react-hotkeys'
import { clsx } from 'clsx'
import { useCombobox } from 'downshift'
import { motion, useAnimation, useReducedMotion } from 'framer-motion'
import * as React from 'react'
import { kodyProfiles } from '#app/images.tsx'
import { HOTKEY_OPEN_SEARCH } from '#app/utils/hotkeys.ts'
import { type OptionalTeam, useDebounce } from '#app/utils/misc.tsx'
import { useRequestInfo } from '#app/utils/request-info.ts'
import { useTeam } from '#app/utils/team-provider.tsx'
import { THEME_FETCHER_KEY, useOptimisticThemeMode } from '#app/utils/theme.tsx'
import { useOptionalUser, useRootData } from '#app/utils/use-root-data.ts'
import { useElementState } from './hooks/use-element-state.tsx'
import {
	CloseIcon,
	LaptopIcon,
	MoonIcon,
	SearchIcon,
	SpinnerIcon,
	SunIcon,
} from './icons.tsx'
import { TeamCircle } from './team-circle.tsx'

const LINKS = [
	{ id: 'blog', name: 'Blog', to: '/blog' },
	{ id: 'courses', name: 'Courses', to: '/courses' },
	{ id: 'discord', name: 'Discord', to: '/discord' },
	{ id: 'chats', name: 'Chats', to: '/chats/05' },
	{ id: 'calls', name: 'Calls', to: '/calls/05' },
	{ id: 'workshops', name: 'Workshops', to: '/workshops' },
	{ id: 'about', name: 'About', to: '/about' },
]

const MOBILE_LINKS = [{ name: 'Home', to: '/' }, ...LINKS]

function NavLink({
	to,
	navItem,
	...rest
}: Omit<Parameters<typeof Link>['0'], 'to'> & {
	to: string
	navItem?: string
}) {
	const location = useLocation()
	const isSelected =
		to === location.pathname || location.pathname.startsWith(`${to}/`)

	return (
		<li className="px-5 py-2" data-nav-item={navItem}>
			<Link
				prefetch="intent"
				className={clsx(
					'underlined hover:text-team-current focus:text-team-current block text-lg font-medium whitespace-nowrap focus:outline-none',
					{
						'active text-team-current': isSelected,
						'text-secondary': !isSelected,
					},
				)}
				to={to}
				{...rest}
			/>
		</li>
	)
}

const iconTransformOrigin = { transformOrigin: '50% 100px' }
function DarkModeToggle({
	variant = 'icon',
}: {
	variant?: 'icon' | 'labelled'
}) {
	const requestInfo = useRequestInfo()
	const fetcher = useFetcher({ key: THEME_FETCHER_KEY })

	const optimisticMode = useOptimisticThemeMode()
	const mode = optimisticMode ?? requestInfo.userPrefs.theme ?? 'system'
	const nextMode =
		mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system'

	const iconSpanClassName =
		'absolute inset-0 transform transition-transform duration-700 motion-reduce:duration-[0s]'
	return (
		<fetcher.Form method="POST" action="/action/set-theme">
			<input type="hidden" name="theme" value={nextMode} />

			<button
				type="submit"
				className={clsx(
					'focus-ring border-secondary hover:border-primary focus:border-primary inline-flex h-14 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 p-1 transition',
					{
						'w-14': variant === 'icon',
						'px-8': variant === 'labelled',
					},
				)}
			>
				{/* note that the duration is longer then the one on body, controlling the bg-color */}
				<div className="relative h-8 w-8">
					<span
						className={clsx(
							iconSpanClassName,
							mode === 'dark' ? 'rotate-0' : 'rotate-90',
						)}
						style={iconTransformOrigin}
					>
						<MoonIcon />
					</span>
					<span
						className={clsx(
							iconSpanClassName,
							mode === 'light' ? 'rotate-0' : '-rotate-90',
						)}
						style={iconTransformOrigin}
					>
						<SunIcon />
					</span>

					<span
						className={clsx(
							iconSpanClassName,
							mode === 'system' ? 'translate-y-0' : 'translate-y-10',
						)}
						style={iconTransformOrigin}
					>
						<LaptopIcon size={32} />
					</span>
				</div>
				<span className={clsx('ml-4', { 'sr-only': variant === 'icon' })}>
					{`Switch to ${
						nextMode === 'system'
							? 'system'
							: nextMode === 'light'
								? 'light'
								: 'dark'
					} mode`}
				</span>
			</button>
		</fetcher.Form>
	)
}

type SearchSuggestion = {
	url: string
	segment: string
	title: string
	summary?: string
	imageUrl?: string
	imageAlt?: string
}

function isPlainLeftClick(event: React.MouseEvent) {
	return (
		event.button === 0 &&
		!event.metaKey &&
		!event.altKey &&
		!event.ctrlKey &&
		!event.shiftKey
	)
}

function NavSearch({
	isOpen,
	onOpenChange,
	onCloseWithFocusIntent,
	searchIconRef,
	alwaysExpanded,
	searchInputRef,
}: {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	onCloseWithFocusIntent?: () => void
	searchIconRef?: React.RefObject<HTMLAnchorElement | null>
	alwaysExpanded?: boolean
	searchInputRef?: React.RefObject<HTMLInputElement | null>
}) {
	const navigate = useNavigate()
	const fetcher = useFetcher<Array<SearchSuggestion> | { error: string }>({
		key: 'navbar-search',
	})
	const [suggestions, setSuggestions] = React.useState<Array<SearchSuggestion>>(
		[],
	)
	const [fetchError, setFetchError] = React.useState<string | null>(null)

	const buttonRef = React.useRef<HTMLAnchorElement>(null)
	const internalInputRef = React.useRef<HTMLInputElement>(null)
	const inputRef = searchInputRef ?? internalInputRef
	const overlayRef = React.useRef<HTMLDivElement>(null)
	const isClosingRef = React.useRef(false)
	const shouldFocusIconRef = React.useRef(true)
	const shouldReduceMotion = useReducedMotion()

	const debouncedLoadSuggestions = useDebounce((nextQuery: string) => {
		fetcher.load(
			`/resources/search?query=${encodeURIComponent(nextQuery.trim())}`,
		)
	}, 200)

	React.useEffect(() => {
		// Normalize the fetcher response into local state so we can clear results
		// immediately when the user clears the input.
		if (Array.isArray(fetcher.data)) {
			setFetchError(null)
			setSuggestions(fetcher.data)
			return
		}
		if (fetcher.data && 'error' in fetcher.data) {
			setSuggestions([])
			setFetchError(fetcher.data.error)
			return
		}
	}, [fetcher.data])

	React.useEffect(() => {
		if (isOpen) {
			inputRef.current?.focus()
		}
	}, [isOpen, inputRef])

	const [isClosing, setIsClosing] = React.useState(false)

	function navigateToSearch(nextQuery: string) {
		const q = nextQuery.trim()
		if (!q) return
		navigate(`/search?q=${encodeURIComponent(q)}`)
		close({ focusIcon: false })
	}

	function navigateToSuggestion(url: string) {
		try {
			const u = new URL(url, window.location.origin)
			const isSameOrigin = u.origin === window.location.origin
			if (isSameOrigin) {
				navigate(`${u.pathname}${u.search}${u.hash}`)
			} else {
				window.location.assign(url)
			}
		} catch {
			window.location.assign(url)
		} finally {
			close({ focusIcon: false })
		}
	}

	const {
		isOpen: isMenuOpen,
		getLabelProps,
		getInputProps,
		getMenuProps,
		getItemProps,
		highlightedIndex,
		inputValue,
		reset,
		setInputValue,
	} = useCombobox<SearchSuggestion>({
		items: suggestions,
		itemToString: (item) => (item ? item.title : ''),
		onInputValueChange: ({ inputValue: nextValue }) => {
			setFetchError(null)
			if (!nextValue || nextValue.trim().length < 2) {
				setSuggestions([])
				return
			}
			debouncedLoadSuggestions(nextValue)
		},
		onSelectedItemChange: ({ selectedItem }) => {
			if (selectedItem) {
				setInputValue('')
				navigateToSuggestion(selectedItem.url)
			}
		},
		stateReducer: (state, { type, changes }) => {
			// When Enter is pressed with no highlighted item, allow form submit
			if (
				type === useCombobox.stateChangeTypes.InputKeyDownEnter &&
				state.highlightedIndex === -1
			) {
				return { ...changes, isOpen: false }
			}
			return changes
		},
	})

	const finishClose = React.useCallback(() => {
		onOpenChange(false)
		if (shouldFocusIconRef.current) onCloseWithFocusIntent?.()
		isClosingRef.current = false
	}, [onOpenChange, onCloseWithFocusIntent])

	const close = React.useCallback(
		(options?: { focusIcon?: boolean }) => {
			if (isClosingRef.current) return
			shouldFocusIconRef.current = options?.focusIcon ?? true
			setFetchError(null)
			reset()
			setSuggestions([])
			if (alwaysExpanded || shouldReduceMotion) {
				finishClose()
				return
			}
			isClosingRef.current = true
			setIsClosing(true)
		},
		[alwaysExpanded, finishClose, reset, shouldReduceMotion],
	)

	const handleBlurReset = React.useCallback(
		(event: React.FocusEvent<HTMLInputElement | HTMLButtonElement>) => {
			// Don't reset when focus moves within the search (e.g. input -> clear button)
			const relatedTarget = event.relatedTarget as Node | null
			if (relatedTarget && overlayRef.current?.contains(relatedTarget)) {
				return
			}
			close({ focusIcon: !relatedTarget })
		},
		[close],
	)

	const showForm = isOpen || alwaysExpanded

	return (
		<div
			ref={overlayRef}
			className={clsx(
				'relative flex min-w-0 flex-1 items-center',
				showForm && !alwaysExpanded && 'pointer-events-none',
			)}
		>
			{showForm ? (
				<form
					method="get"
					action="/search"
					className="relative flex min-w-0 flex-1 flex-col"
					onSubmit={(event) => {
						event.preventDefault()
						if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
							setInputValue('')
							navigateToSuggestion(suggestions[highlightedIndex].url)
							return
						}
						navigateToSearch(inputValue)
					}}
				>
					{alwaysExpanded ? (
						<div className="bg-primary pointer-events-auto flex min-h-14 w-full overflow-hidden rounded-full shadow-[inset_0_0_0_2px_var(--border-secondary)] transition-shadow focus-within:shadow-[inset_0_0_0_2px_var(--color-team-current)] hover:shadow-[inset_0_0_0_2px_var(--color-team-current)]">
							<label {...getLabelProps()} className="sr-only">
								Search
							</label>
							<Link
								ref={buttonRef}
								prefetch="intent"
								to="/search"
								aria-label="Search"
								aria-disabled={!!alwaysExpanded}
								tabIndex={alwaysExpanded ? -1 : isOpen ? -1 : undefined}
								className={clsx(
									'focus-ring text-primary z-10 inline-flex h-14 w-14 shrink-0 items-center justify-center border-2 border-transparent p-1 focus:outline-none',
									(isOpen || alwaysExpanded) && 'pointer-events-none',
								)}
								onClick={(event) => {
									if (alwaysExpanded || isOpen || !isPlainLeftClick(event))
										return
									event.preventDefault()
									onOpenChange(!isOpen)
								}}
							>
								<SearchIcon />
							</Link>
							<div className="relative flex min-w-0 flex-1">
								<input
									{...getInputProps({
										ref: inputRef,
										type: 'text',
										name: 'q',
										autoComplete: 'off',
										placeholder: 'Semantic search...',
										className:
											'text-primary bg-transparent h-14 w-full py-0 pr-14 pl-3 text-lg font-medium focus:outline-none placeholder:text-secondary',
										onBlur: alwaysExpanded ? undefined : handleBlurReset,
										onKeyDown: (event: React.KeyboardEvent) => {
											if (event.key === 'Escape') {
												event.preventDefault()
												if (alwaysExpanded) onOpenChange(false)
												else close()
											}
										},
									})}
								/>
								<div className="pointer-events-auto absolute top-1/2 right-4 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center">
									{fetcher.state !== 'idle' ? (
										<SpinnerIcon size={18} className="animate-spin" />
									) : inputValue ? (
										<button
											type="button"
											aria-label="Clear search"
											className="focus-ring text-secondary hover:text-primary rounded p-1 transition focus:outline-none"
											onClick={() => {
												inputRef.current?.focus()
												setInputValue('')
											}}
											onBlur={alwaysExpanded ? undefined : handleBlurReset}
											onKeyDown={(event) => {
												if (event.key === 'Escape') {
													event.preventDefault()
													if (alwaysExpanded) onOpenChange(false)
													else close()
												}
											}}
										>
											<CloseIcon size={18} />
										</button>
									) : null}
								</div>
							</div>
						</div>
					) : (
						<motion.div
							className="bg-primary pointer-events-auto flex min-h-14 overflow-hidden rounded-full shadow-[inset_0_0_0_2px_var(--border-secondary)] transition-shadow focus-within:shadow-[inset_0_0_0_2px_var(--color-team-current)] hover:shadow-[inset_0_0_0_2px_var(--color-team-current)]"
							initial={shouldReduceMotion ? false : { width: 56 }}
							animate={{ width: isClosing ? 56 : '100%' }}
							transition={{
								duration: shouldReduceMotion ? 0 : 0.25,
								ease: [0.32, 0.72, 0, 1],
							}}
							onAnimationComplete={() => {
								if (isClosingRef.current) {
									finishClose()
									setIsClosing(false)
								}
							}}
						>
							<label {...getLabelProps()} className="sr-only">
								Search
							</label>
							<Link
								ref={buttonRef}
								prefetch="intent"
								to="/search"
								aria-label="Search"
								aria-disabled={isOpen}
								tabIndex={isOpen ? -1 : undefined}
								className={clsx(
									'focus-ring text-primary z-10 inline-flex h-14 w-14 shrink-0 items-center justify-center border-2 border-transparent p-1 focus:outline-none',
									isOpen && 'pointer-events-none',
								)}
								onClick={(event) => {
									if (isOpen || !isPlainLeftClick(event)) return
									event.preventDefault()
									onOpenChange(!isOpen)
								}}
							>
								<SearchIcon />
							</Link>
							<div className="relative flex min-w-0 flex-1">
								<input
									{...getInputProps({
										ref: inputRef,
										type: 'text',
										name: 'q',
										autoComplete: 'off',
										placeholder: 'Semantic search...',
										className:
											'text-primary bg-transparent h-14 w-full py-0 pr-14 pl-3 text-lg font-medium focus:outline-none placeholder:text-secondary',
										onBlur: handleBlurReset,
										onKeyDown: (event: React.KeyboardEvent) => {
											if (event.key === 'Escape') {
												event.preventDefault()
												close()
											}
										},
									})}
								/>
								<div className="pointer-events-auto absolute top-1/2 right-4 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center">
									{fetcher.state !== 'idle' ? (
										<SpinnerIcon size={18} className="animate-spin" />
									) : inputValue ? (
										<button
											type="button"
											aria-label="Clear search"
											className="focus-ring text-secondary hover:text-primary rounded p-1 transition focus:outline-none"
											onClick={() => {
												inputRef.current?.focus()
												setInputValue('')
											}}
											onBlur={handleBlurReset}
											onKeyDown={(event) => {
												if (event.key === 'Escape') {
													event.preventDefault()
													close()
												}
											}}
										>
											<CloseIcon size={18} />
										</button>
									) : null}
								</div>
							</div>
						</motion.div>
					)}

					<div className="pointer-events-auto absolute top-full right-0 left-0 z-50 mt-2">
						{fetchError ? (
							<div className="px-6 py-3 text-sm text-slate-500">
								{fetchError}
							</div>
						) : null}
						<ul
							{...getMenuProps({
								'aria-label': 'Search suggestions',
								className: clsx(
									'rounded-2xl',
									inputValue.trim().length >= 2 && suggestions.length
										? 'bg-primary border-secondary max-h-96 overflow-x-hidden overflow-y-auto border shadow-lg'
										: 'overflow-hidden border-0',
								),
							})}
						>
							{inputValue.trim().length >= 2 ? (
								<>
									{isMenuOpen &&
										suggestions.map((s, index) => (
											<li
												key={`${s.url}-${index}`}
												{...getItemProps({
													item: s,
													index,
												})}
											>
												<div
													className={clsx(
														'w-full cursor-pointer px-6 py-4 text-left transition focus:outline-none',
														index === highlightedIndex
															? 'bg-secondary'
															: 'hover:bg-secondary',
													)}
												>
													<div className="flex items-start gap-3">
														<div className="shrink-0">
															{s.imageUrl ? (
																<img
																	src={s.imageUrl}
																	alt={s.imageAlt ?? ''}
																	className="h-10 w-10 rounded-md object-cover"
																	loading="lazy"
																/>
															) : (
																<div className="h-10 w-10 rounded-md bg-gray-200 dark:bg-gray-700" />
															)}
														</div>
														<div className="min-w-0 flex-1">
															<div className="text-primary truncate text-base font-medium">
																{s.title}
															</div>
															<div className="text-secondary mt-1 flex min-w-0 items-baseline gap-3 text-sm">
																<span className="min-w-0 truncate">
																	{s.segment}
																</span>
																<span className="min-w-0 flex-1 truncate text-right">
																	{(() => {
																		try {
																			return new URL(s.url).pathname
																		} catch {
																			return s.url
																		}
																	})()}
																</span>
															</div>
															{s.summary ? (
																<div className="text-secondary mt-2 line-clamp-2 text-sm">
																	{s.summary}
																</div>
															) : null}
														</div>
													</div>
												</div>
											</li>
										))}
								</>
							) : null}
						</ul>
					</div>
				</form>
			) : (
				<Link
					ref={searchIconRef ?? buttonRef}
					prefetch="intent"
					to="/search"
					aria-label="Search"
					className="focus-ring border-secondary hover:border-primary focus:border-primary text-primary inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 p-1 transition"
					onClick={(event) => {
						if (!isPlainLeftClick(event)) return
						event.preventDefault()
						onOpenChange(true)
					}}
				>
					<SearchIcon />
				</Link>
			)}
		</div>
	)
}

function MobileMenu() {
	const menuButtonRef = React.useRef<HTMLButtonElement>(null)
	const popoverRef = React.useRef<HTMLDivElement>(null)
	const location = useLocation()

	// Close menu when route changes
	React.useEffect(() => {
		const popover = popoverRef.current
		if (!popover) return
		const openState = matchesPopoverOpen(popover)
		if (openState === 'matches') {
			popover.hidePopover()
		} else if (openState === 'old-browser') {
			window.location.reload()
		}
	}, [location.pathname])

	// Ensure body overflow is reset when component unmounts or popover state changes
	React.useEffect(() => {
		const popover = popoverRef.current
		if (!popover) return

		const handleToggle = (event: Event) => {
			const target = event.target as HTMLElement
			const popoverOpen = matchesPopoverOpen(target)
			if (popoverOpen === 'matches') {
				// Ensure body overflow is properly managed
				document.body.style.overflow = 'hidden'
			} else {
				document.body.style.overflow = ''
			}
		}

		popover.addEventListener('toggle', handleToggle)

		// Cleanup function to ensure body overflow is reset
		return () => {
			popover.removeEventListener('toggle', handleToggle)
			document.body.style.overflow = ''
		}
	}, [])

	const closeMenu = React.useCallback(() => {
		if (popoverRef.current) {
			popoverRef.current.hidePopover?.()
			// Force reset body overflow to ensure proper state
			document.body.style.overflow = ''
		}
	}, [])

	return (
		<div
			onBlur={(event) => {
				if (!popoverRef.current || !menuButtonRef.current) return
				const openState = matchesPopoverOpen(popoverRef.current)
				if (
					openState === 'matches' &&
					!event.currentTarget.contains(event.relatedTarget)
				) {
					const isRelatedTargetBeforeMenu =
						event.relatedTarget instanceof Node &&
						event.currentTarget.compareDocumentPosition(event.relatedTarget) ===
							Node.DOCUMENT_POSITION_PRECEDING
					const focusableElements = Array.from(
						event.currentTarget.querySelectorAll('button,a'),
					)
					const elToFocus = isRelatedTargetBeforeMenu
						? focusableElements.at(-1)
						: focusableElements.at(0)
					if (elToFocus instanceof HTMLElement) {
						elToFocus.focus()
					} else {
						menuButtonRef.current.focus()
					}
				}
			}}
		>
			<button
				ref={menuButtonRef}
				className="focus:border-primary hover:border-primary border-secondary text-primary inline-flex h-14 w-14 items-center justify-center rounded-full border-2 p-1 transition focus:outline-none"
				popoverTarget="mobile-menu"
			>
				<svg
					width="32"
					height="32"
					viewBox="0 0 32 32"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<rect x="6" y="9" width="20" height="2" rx="1" fill="currentColor" />
					<rect x="6" y="15" width="20" height="2" rx="1" fill="currentColor" />
					<rect x="6" y="21" width="20" height="2" rx="1" fill="currentColor" />
				</svg>
			</button>
			<div
				id="mobile-menu"
				ref={popoverRef}
				popover=""
				className="fixed top-[128px] right-0 bottom-0 left-0 m-0 h-[calc(100svh-128px)] w-full"
			>
				<div className="bg-primary flex h-full flex-col overflow-y-scroll border-t border-gray-200 pb-12 dark:border-gray-600">
					<div className="px-5vw border-b border-gray-200 py-4 dark:border-gray-600">
						<NavSearch
							isOpen={true}
							alwaysExpanded
							onOpenChange={(open) => {
								if (!open) closeMenu()
							}}
						/>
					</div>
					{MOBILE_LINKS.map((link) => (
						<Link
							className="hover:bg-secondary focus:bg-secondary text-primary px-5vw hover:text-team-current border-b border-gray-200 py-9 dark:border-gray-600"
							key={link.to}
							to={link.to}
							onClick={closeMenu}
						>
							{link.name}
						</Link>
					))}
					<div className="py-9 text-center">
						<DarkModeToggle variant="labelled" />
					</div>
				</div>
			</div>
		</div>
	)
}

// Timing durations used to control the speed of the team ring in the profile button.
// Time is seconds per full rotation
const durations = {
	initial: 40,
	hover: 3,
	focus: 3,
	active: 0.25,
}

function ProfileButton({
	imageUrl,
	imageAlt,
	team,
	magicLinkVerified,
}: {
	imageUrl: string
	imageAlt: string
	team: OptionalTeam
	magicLinkVerified: boolean | undefined
}) {
	const user = useOptionalUser()
	const controls = useAnimation()
	const [ref, state] = useElementState()
	const shouldReduceMotion = useReducedMotion()

	React.useEffect(() => {
		void controls.start((_, { rotate = 0 }) => {
			const target =
				typeof rotate === 'number'
					? state === 'initial'
						? rotate - 360
						: rotate + 360
					: 360

			return shouldReduceMotion
				? {}
				: {
						rotate: [rotate, target],
						transition: {
							duration: durations[state],
							repeat: Infinity,
							ease: 'linear',
						},
					}
		})
	}, [state, controls, shouldReduceMotion])

	return (
		<Link
			prefetch="intent"
			to={user ? '/me' : magicLinkVerified ? '/signup' : '/login'}
			aria-label={
				user ? 'My Account' : magicLinkVerified ? 'Finish signing up' : 'Login'
			}
			className={clsx(
				'ml-4 inline-flex h-14 w-14 items-center justify-center rounded-full focus:outline-none',
			)}
			ref={ref}
		>
			<motion.div className="absolute" animate={controls}>
				<TeamCircle size={56} team={team} />
			</motion.div>
			<img
				className={clsx('inline h-10 w-10 rounded-full select-none')}
				src={imageUrl}
				alt={imageAlt}
				crossOrigin="anonymous"
			/>
		</Link>
	)
}

function Navbar() {
	const navigate = useNavigate()
	const [team] = useTeam()
	const { requestInfo, userInfo } = useRootData()
	const avatar = userInfo ? userInfo.avatar : kodyProfiles[team]
	const navLinksRef = React.useRef<HTMLDivElement>(null)
	const searchIconRef = React.useRef<HTMLAnchorElement>(null)
	const searchInputRef = React.useRef<HTMLInputElement>(null)
	const [isSearchOpen, setIsSearchOpen] = React.useState(false)

	const focusSearchIcon = React.useCallback(() => {
		requestAnimationFrame(() => searchIconRef.current?.focus())
	}, [])

	const openSearch = React.useCallback(() => {
		const canUseNavbarSearch =
			typeof window === 'undefined'
				? false
				: window.matchMedia('(min-width: 1024px)').matches

		if (!canUseNavbarSearch) {
			// On smaller screens the navbar search UI is hidden, so we navigate to the
			// dedicated search page instead.
			navigate('/search')
			return
		}

		setIsSearchOpen(true)
		requestAnimationFrame(() => searchInputRef.current?.focus())
	}, [navigate])

	const searchHotkeyOptions = React.useMemo(
		() => ({
			ignoreInputs: true,
			preventDefault: true,
			requireReset: true,
			stopPropagation: true,
		}),
		[],
	)

	useHotkey(HOTKEY_OPEN_SEARCH.slash, openSearch, searchHotkeyOptions)

	useHotkey(HOTKEY_OPEN_SEARCH.modK, openSearch, searchHotkeyOptions)

	useHotkey(HOTKEY_OPEN_SEARCH.modShiftP, openSearch, searchHotkeyOptions)

	return (
		<div className="px-5vw relative overflow-visible py-9 lg:py-12">
			<nav className="navbar-container text-primary relative mx-auto flex max-w-384 items-center gap-4 overflow-visible">
				{/* Left: logo + search icon (or spacer when open to keep layout stable) */}
				<div className="flex min-w-0 shrink-0 items-center gap-4">
					<Link
						prefetch="intent"
						to="/"
						className="text-primary underlined block shrink-0 text-2xl font-medium whitespace-nowrap transition focus:outline-none"
					>
						<h1>Kent C. Dodds</h1>
					</Link>
					<div className="shrink-0 max-lg:hidden">
						{isSearchOpen ? (
							<div className="h-14 w-14 shrink-0" aria-hidden />
						) : (
							<NavSearch
								isOpen={isSearchOpen}
								onOpenChange={setIsSearchOpen}
								searchIconRef={searchIconRef}
							/>
						)}
					</div>
				</div>

				{/* Center: nav links (centered) + search overlay when open */}
				<div className="relative flex min-h-14 min-w-0 flex-1 items-center justify-center">
					{/* Search — overlays nav links when open; first in DOM so tab order is logo -> input -> nav links */}
					{isSearchOpen && (
						<div className="pointer-events-none absolute inset-y-0 right-0 left-[calc(-1*(3.5rem+1rem))] z-10 flex min-w-0 flex-1 items-center justify-start max-lg:hidden">
							<NavSearch
								isOpen={isSearchOpen}
								onOpenChange={setIsSearchOpen}
								onCloseWithFocusIntent={focusSearchIcon}
								searchInputRef={searchInputRef}
							/>
						</div>
					)}
					{/* Nav links — centered; underneath when search open, revealed as input shrinks */}
					<div
						ref={navLinksRef}
						className="navbar-links flex-none justify-center overflow-visible max-lg:hidden lg:flex"
					>
						<ul className="flex">
							{LINKS.map((link) => (
								<NavLink key={link.to} to={link.to} navItem={link.id}>
									{link.name}
								</NavLink>
							))}
						</ul>
					</div>
				</div>

				{/* Right: theme + profile */}
				<div className="flex min-w-0 shrink-0 items-center justify-end">
					<div className="block lg:hidden">
						<MobileMenu />
					</div>
					<div className="ml-4 flex items-center gap-4 lg:ml-0">
						<div className="noscript-hidden hidden lg:block">
							<DarkModeToggle />
						</div>
					</div>

					<ProfileButton
						magicLinkVerified={requestInfo.session.magicLinkVerified}
						imageUrl={avatar.src}
						imageAlt={avatar.alt}
						team={team}
					/>
				</div>
			</nav>
		</div>
	)
}

export { Navbar }

function matchesPopoverOpen(element: HTMLElement) {
	try {
		return element.matches(':popover-open') ? 'matches' : 'no-matches'
	} catch {
		// ignore 🤷‍♂️ They probably have a very old browser
		return 'old-browser'
	}
}
