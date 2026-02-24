import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { clsx } from 'clsx'
import * as React from 'react'

export const TooltipProvider = TooltipPrimitive.Provider
export const Tooltip = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger

export const TooltipContent = React.forwardRef<
	React.ElementRef<typeof TooltipPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(function TooltipContent(
	{ className, sideOffset = 6, ...props },
	forwardedRef,
) {
	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Content
				ref={forwardedRef}
				sideOffset={sideOffset}
				className={clsx(
					'z-50 rounded-md bg-white px-3 py-2 text-sm whitespace-nowrap text-gray-700 shadow-lg ring-1 ring-black/5 dark:bg-gray-900 dark:text-slate-200 dark:ring-white/10',
					className,
				)}
				{...props}
			/>
		</TooltipPrimitive.Portal>
	)
})
