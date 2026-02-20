import { DialogContent, DialogOverlay } from '@reach/dialog'
import { formatForDisplay } from '@tanstack/react-hotkeys'
import * as React from 'react'
import {
	type HotkeysHelpCombo,
	type HotkeysHelpGroup,
} from '#app/utils/hotkeys.ts'
import { CloseIcon } from './icons.tsx'
import { H3, Paragraph } from './typography.tsx'

const HOTKEYS_HELP_DIALOG_ANIMATION_DURATION_MS = 200

function Kbd({ children }: { children: React.ReactNode }) {
	return (
		<kbd className="bg-secondary border-secondary text-primary inline-flex items-center rounded-md border px-2 py-1 font-mono text-xs font-semibold sm:text-sm">
			{children}
		</kbd>
	)
}

function renderCombo(combo: HotkeysHelpCombo) {
	if (combo.kind === 'sequence') {
		return (
			<span className="inline-flex flex-wrap items-center gap-1">
				{combo.keys.map((k, i) => (
					<Kbd key={`${k}-${i}`}>{k}</Kbd>
				))}
			</span>
		)
	}

	// `formatForDisplay` works well for cross-platform `Mod` bindings.
	return <Kbd>{formatForDisplay(combo.hotkey)}</Kbd>
}

function HotkeysHelpDialog({
	isOpen,
	onDismiss,
	groups,
}: {
	isOpen: boolean
	onDismiss: () => void
	groups: ReadonlyArray<HotkeysHelpGroup>
}) {
	const [isMounted, setIsMounted] = React.useState(isOpen)
	const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)
	const closeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
		null,
	)
	const animationDurationMs = prefersReducedMotion
		? 0
		: HOTKEYS_HELP_DIALOG_ANIMATION_DURATION_MS
	const animationDurationStyle = React.useMemo(
		() =>
			({
				'--hotkeys-help-dialog-animation-duration': `${animationDurationMs}ms`,
			}) as React.CSSProperties,
		[animationDurationMs],
	)
	const clearCloseTimeout = React.useCallback(() => {
		if (closeTimeoutRef.current) {
			clearTimeout(closeTimeoutRef.current)
			closeTimeoutRef.current = null
		}
	}, [])

	React.useEffect(() => {
		const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
		const updateReducedMotionPreference = () => {
			setPrefersReducedMotion(mediaQuery.matches)
		}

		updateReducedMotionPreference()
		mediaQuery.addEventListener('change', updateReducedMotionPreference)

		return () => {
			mediaQuery.removeEventListener('change', updateReducedMotionPreference)
		}
	}, [])

	React.useEffect(() => {
		if (isOpen) {
			clearCloseTimeout()
			setIsMounted(true)
			return clearCloseTimeout
		}

		if (!isMounted) return clearCloseTimeout

		if (animationDurationMs === 0) {
			setIsMounted(false)
			return clearCloseTimeout
		}

		closeTimeoutRef.current = setTimeout(() => {
			setIsMounted(false)
			closeTimeoutRef.current = null
		}, animationDurationMs)
		return clearCloseTimeout
	}, [animationDurationMs, clearCloseTimeout, isMounted, isOpen])

	if (!isMounted) return null

	const animationState = isOpen ? 'open' : 'closed'

	return (
		<DialogOverlay
			isOpen={isMounted}
			onDismiss={onDismiss}
			className="hotkeys-help-dialog-overlay"
			data-animation-state={animationState}
			style={animationDurationStyle}
		>
			<DialogContent
				aria-label="Keyboard shortcuts"
				data-animation-state={animationState}
				className="hotkeys-help-dialog-content bg-primary text-primary !my-[10svh] !flex !h-[80svh] !w-11/12 !max-w-3xl !flex-col overflow-hidden rounded-xl border-2 border-black px-6 py-6 shadow-xl sm:px-8 sm:py-8 dark:border-white dark:!bg-gray-900"
				style={animationDurationStyle}
			>
				<div className="flex items-start justify-between gap-6">
					<div className="min-w-0">
						<H3 className="pr-6">Keyboard shortcuts</H3>
						<Paragraph prose={false} className="mt-2 text-base">
							Press <Kbd>?</Kbd> again to close.
						</Paragraph>
					</div>
					<button
						type="button"
						onClick={onDismiss}
						aria-label="Close keyboard shortcuts dialog"
						className="text-secondary hover:text-primary inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md p-1 transition"
					>
						<CloseIcon size={18} />
					</button>
				</div>

				<div
					tabIndex={0}
					role="region"
					aria-label="Keyboard shortcuts list"
					className="focus-ring mt-8 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-md pr-1 focus:outline-none"
				>
					<div className="space-y-8">
						{groups.map((group) => (
							<section key={group.title}>
								<div className="text-secondary mb-3 text-xs font-semibold tracking-widest uppercase">
									{group.title}
								</div>
								<ul className="space-y-4">
									{group.items.map((item) => (
										<li
											key={`${group.title}-${item.description}`}
											className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
										>
											<div className="flex flex-wrap items-center gap-2">
												{item.combos.map((combo, index) => {
													const comboKey =
														combo.kind === 'hotkey'
															? `hotkey:${combo.hotkey}`
															: `sequence:${combo.keys.join('-')}`

													return (
														<React.Fragment key={comboKey}>
															{index === 0 ? null : (
																<span className="text-secondary px-1 text-sm">
																	or
																</span>
															)}
															{renderCombo(combo)}
														</React.Fragment>
													)
												})}
											</div>
											<div className="text-secondary text-sm sm:text-base">
												{item.description}
											</div>
										</li>
									))}
								</ul>
							</section>
						))}
					</div>
				</div>
			</DialogContent>
		</DialogOverlay>
	)
}

export { HotkeysHelpDialog }
