import './navbar.css'
import { Link, useFetcher, useLocation } from '@remix-run/react'
import { clsx } from 'clsx'
import { motion, useAnimation, useReducedMotion } from 'framer-motion'
import * as React from 'react'
import { useElementState } from './hooks/use-element-state.tsx'
import { LaptopIcon, MoonIcon, SunIcon } from './icons.tsx'
import { TeamCircle } from './team-circle.tsx'
import { kodyProfiles } from '~/images.tsx'
import { type OptionalTeam } from '~/utils/misc.tsx'
import { useRequestInfo } from '~/utils/request-info.ts'
import { useTeam } from '~/utils/team-provider.tsx'
import { THEME_FETCHER_KEY, useOptimisticThemeMode } from '~/utils/theme.tsx'
import { useOptionalUser, useRootData } from '~/utils/use-root-data.ts'

const LINKS = [
	{ name: 'Blog', to: '/blog' },
	{ name: 'Courses', to: '/courses' },
	{ name: 'Discord', to: '/discord' },
	{ name: 'Chats', to: '/chats/05' },
	{ name: 'Calls', to: '/calls/04' },
	{ name: 'Workshops', to: '/workshops' },
	{ name: 'About', to: '/about' },
]

const MOBILE_LINKS = [{ name: 'Home', to: '/' }, ...LINKS]

function NavLink({
	to,
	...rest
}: Omit<Parameters<typeof Link>['0'], 'to'> & { to: string }) {
	const location = useLocation()
	const isSelected =
		to === location.pathname || location.pathname.startsWith(`${to}/`)

	return (
		<li className="px-5 py-2">
			<Link
				prefetch="intent"
				className={clsx(
					'underlined block whitespace-nowrap text-lg font-medium hover:text-team-current focus:text-team-current focus:outline-none',
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
					'border-secondary hover:border-primary focus:border-primary inline-flex h-14 items-center justify-center overflow-hidden rounded-full border-2 p-1 transition focus:outline-none',
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

function MobileMenu() {
	const menuButtonRef = React.useRef<HTMLButtonElement>(null)
	const popoverRef = React.useRef<HTMLDivElement>(null)
	return (
		<div
			onBlur={(event) => {
				if (!popoverRef.current || !menuButtonRef.current) return
				if (
					popoverRef.current.matches(':popover-open') &&
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
				onToggle={() => window.scrollTo(0, 0)}
				className="fixed bottom-0 left-0 right-0 top-[128px] m-0 h-[calc(100svh-128px)] w-full"
			>
				<div className="bg-primary flex h-full flex-col overflow-y-scroll border-t border-gray-200 pb-12 dark:border-gray-600">
					{MOBILE_LINKS.map((link) => (
						<Link
							className="hover:bg-secondary focus:bg-secondary text-primary border-b border-gray-200 px-5vw py-9 hover:text-team-current dark:border-gray-600"
							key={link.to}
							to={link.to}
							onClick={() => {
								popoverRef.current?.hidePopover()
							}}
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
			<motion.div
				// @ts-expect-error framer-motion + latest typescript types has issues
				className="absolute"
				animate={controls}
			>
				<TeamCircle size={56} team={team} />
			</motion.div>
			<img
				className={clsx('inline h-10 w-10 select-none rounded-full')}
				src={imageUrl}
				alt={imageAlt}
				crossOrigin="anonymous"
			/>
		</Link>
	)
}

function Navbar() {
	const [team] = useTeam()
	const { requestInfo, userInfo } = useRootData()
	const avatar = userInfo ? userInfo.avatar : kodyProfiles[team]

	return (
		<div className="px-5vw py-9 lg:py-12">
			<nav className="text-primary mx-auto flex max-w-8xl items-center justify-between">
				<div className="flex justify-center gap-4 align-middle">
					<Link
						prefetch="intent"
						to="/"
						className="text-primary underlined block whitespace-nowrap text-2xl font-medium transition focus:outline-none"
					>
						<h1>Kent C. Dodds</h1>
					</Link>
				</div>

				<ul className="hidden lg:flex">
					{LINKS.map((link) => (
						<NavLink key={link.to} to={link.to}>
							{link.name}
						</NavLink>
					))}
				</ul>

				<div className="flex items-center justify-center">
					<div className="block lg:hidden">
						<MobileMenu />
					</div>
					<div className="noscript-hidden hidden lg:block">
						<DarkModeToggle />
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
