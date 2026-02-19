import { Dialog } from '@reach/dialog'
import { clsx } from 'clsx'
import * as React from 'react'
import { formatForDisplay } from '@tanstack/react-hotkeys'
import type { HotkeysHelpCombo, HotkeysHelpGroup } from '#app/utils/hotkeys.ts'
import { CloseIcon } from './icons.tsx'
import { H3, Paragraph } from './typography.tsx'

function Kbd({ children }: { children: React.ReactNode }) {
	return (
		<kbd
			className={clsx(
				'bg-secondary border-secondary text-primary inline-flex items-center rounded-md border px-2 py-1 font-mono text-xs font-semibold sm:text-sm',
			)}
		>
			{children}
		</kbd>
	)
}

function renderCombo(combo: HotkeysHelpCombo) {
	if (combo.kind === 'sequence') {
		return (
			<span className="inline-flex flex-wrap items-center gap-1">
				{combo.keys.map((k) => (
					<Kbd key={k}>{k}</Kbd>
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
	groups: Array<HotkeysHelpGroup>
}) {
	return (
		<Dialog
			isOpen={isOpen}
			onDismiss={onDismiss}
			aria-label="Keyboard shortcuts"
			className={clsx(
				'bg-primary text-primary !w-11/12 !max-w-3xl rounded-xl border-2 border-black px-6 py-6 shadow-xl sm:px-8 sm:py-8 dark:border-white dark:!bg-gray-900',
			)}
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
					className="focus-ring text-secondary hover:text-primary inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md p-1 transition focus:outline-none"
				>
					<CloseIcon size={18} />
				</button>
			</div>

			<div className="mt-8 space-y-8">
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
										{item.combos.map((combo, index) => (
											<React.Fragment key={index}>
												{index === 0 ? null : (
													<span className="text-secondary px-1 text-sm">
														or
													</span>
												)}
												{renderCombo(combo)}
											</React.Fragment>
										))}
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
		</Dialog>
	)
}

export { HotkeysHelpDialog }

