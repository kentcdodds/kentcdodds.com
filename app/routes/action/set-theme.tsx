import { parseWithZod } from '@conform-to/zod/v4'
import { type ActionFunctionArgs, data as json, redirect } from 'react-router';
import { setTheme } from '#app/utils/theme.server.ts'
import { ThemeFormSchema } from '#app/utils/theme.tsx'

export async function loader() {
	return redirect('/')
}

export async function action({ request }: ActionFunctionArgs) {
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
