import {parseWithZod} from '@conform-to/zod'
import {type ActionFunctionArgs, json} from '@remix-run/server-runtime'
import {ThemeFormSchema} from '~/utils/theme.tsx'
import {setTheme} from '~/utils/theme.server.ts'

export async function action({request}: ActionFunctionArgs) {
  const formData = await request.formData()
  const submission = parseWithZod(formData, {
    schema: ThemeFormSchema,
  })
  if (submission.status !== 'success') {
    return json(
      {result: submission.reply()},
      {status: submission.status === 'error' ? 400 : 200},
    )
  }
  const {theme} = submission.value

  const responseInit = {
    headers: {'set-cookie': setTheme(theme)},
  }
  return json({success: true, submission}, responseInit)
}
