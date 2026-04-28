import { parseWithZod } from '@conform-to/zod/v4'
import { data as json, redirect } from 'react-router'
import { setTheme } from '#app/utils/theme.server.ts'
import { ThemeFormSchema } from '#app/utils/theme.tsx'
import { type Route } from './+types/set-theme'

export async function loader() {
	return redirect('/')
}

export async function action({ request }: Route.ActionArgs) {
	let formData: FormData
	try {
		formData = await request.formData()
	} catch (error) {
		if (error instanceof TypeError) {
			return json({ error: 'Invalid form body.' }, { status: 400 })
		}
		throw error
	}

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
