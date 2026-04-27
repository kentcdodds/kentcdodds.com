import { parseWithZod } from '@conform-to/zod/v4'
import { data as json, redirect } from 'react-router'
import { setTheme } from '#app/utils/theme.server.ts'
import { ThemeFormSchema } from '#app/utils/theme.tsx'
import { type Route } from './+types/set-theme'

export async function loader() {
	return redirect('/')
}

export async function action({ request }: Route.ActionArgs) {
	const contentType = request.headers.get('content-type')
	const isJsonRequest = contentType?.includes('application/json') ?? false
	const shouldTryJson = isJsonRequest || !contentType
	if (shouldTryJson) {
		let jsonPayload: unknown = null
		try {
			jsonPayload = await request.clone().json()
		} catch (jsonError) {
			if (isJsonRequest) {
				return json({ error: 'Invalid JSON body.' }, { status: 400 })
			}
		}

		if (jsonPayload) {
			const parsed = ThemeFormSchema.safeParse(jsonPayload)
			if (!parsed.success) {
				return json({ result: parsed.error.format() }, { status: 400 })
			}
			const { theme } = parsed.data
			const responseInit = {
				headers: { 'set-cookie': setTheme(theme) },
			}
			return json({ success: true, submission: parsed.data }, responseInit)
		}
	}

	const formData = await request.formData()

	const submission = parseWithZod(formData, {
		schema: ThemeFormSchema,
	})
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}
	const { theme } = submission.value

	const responseInit = {
		headers: { 'set-cookie': setTheme(theme) },
	}
	return json({ success: true, submission }, responseInit)
}
