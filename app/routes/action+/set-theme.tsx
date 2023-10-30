import {parse} from '@conform-to/zod'
import {type DataFunctionArgs, json} from '@remix-run/server-runtime'
import {ThemeFormSchema} from '~/utils/theme.tsx'
import {setTheme} from '~/utils/theme.server.ts'

export async function action({request}: DataFunctionArgs) {
  const formData = await request.formData()
  const submission = parse(formData, {
    schema: ThemeFormSchema,
  })
  if (submission.intent !== 'submit') {
    return json({status: 'idle', submission} as const)
  }
  if (!submission.value) {
    return json({status: 'error', submission} as const, {status: 400})
  }
  const {theme} = submission.value

  const responseInit = {
    headers: {'set-cookie': setTheme(theme)},
  }
  return json({success: true, submission}, responseInit)
}
