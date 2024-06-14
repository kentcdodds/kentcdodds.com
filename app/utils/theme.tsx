import { parseWithZod } from '@conform-to/zod'
import { useFetcher } from '@remix-run/react'

import * as React from 'react'
import { z } from 'zod'
import { useHints } from './client-hints.tsx'
import { useRequestInfo } from './request-info.ts'

enum Theme {
	DARK = 'dark',
	LIGHT = 'light',
}
const themes: Array<Theme> = Object.values(Theme)

export const THEME_FETCHER_KEY = 'THEME_FETCHER'

export const ThemeFormSchema = z.object({
	theme: z.enum(['system', 'light', 'dark']),
})
/**
 * @returns the user's theme preference, or the client hint theme if the user
 * has not set a preference.
 */
function useTheme() {
	const hints = useHints()
	const requestInfo = useRequestInfo()
	const optimisticMode = useOptimisticThemeMode()
	if (optimisticMode) {
		return optimisticMode === 'system' ? hints.theme : optimisticMode
	}
	return requestInfo.userPrefs.theme ?? hints.theme
}

/**
 * If the user's changing their theme mode preference, this will return the
 * value it's being changed to.
 */
function useOptimisticThemeMode() {
	const themeFetcher = useFetcher({ key: THEME_FETCHER_KEY })

	if (themeFetcher.formData) {
		const submission = parseWithZod(themeFetcher.formData, {
			schema: ThemeFormSchema,
		})
		if (submission.status === 'success') return submission.value.theme
		return null
	}
}

function Themed({
	dark,
	light,
	initialOnly = false,
}: {
	dark: React.ReactNode | string
	light: React.ReactNode | string
	initialOnly?: boolean
}) {
	const [theme] = useTheme()
	const [initialTheme] = React.useState(theme)
	const themeToReference = initialOnly ? initialTheme : theme

	return <>{themeToReference === 'light' ? light : dark}</>
}

function isTheme(value: unknown): value is Theme {
	return typeof value === 'string' && themes.includes(value as Theme)
}

export { useTheme, useOptimisticThemeMode, themes, Theme, isTheme, Themed }
