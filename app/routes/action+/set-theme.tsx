// import {json, redirect, type ActionFunction} from '@remix-run/node'
// import {isTheme} from '~/utils/theme-provider.tsx'
// import {getThemeSession} from '~/utils/theme.server.ts'

import {parse} from '@conform-to/zod'
import {DataFunctionArgs, json} from '@remix-run/server-runtime'
import {ThemeFormSchema} from '~/root.tsx'
import {setTheme} from '~/utils/theme.server.ts'

// export const action: ActionFunction = async ({request}) => {
//   const themeSession = await getThemeSession(request)
//   const requestText = await request.text()
//   const form = new URLSearchParams(requestText)
//   const theme = form.get('theme')
//   if (!isTheme(theme)) {
//     return json({
//       success: false,
//       message: `theme value of ${theme} is not a valid theme.`,
//     })
//   }

//   themeSession.setTheme(theme)
//   return json(
//     {success: true},
//     {
//       headers: {'Set-Cookie': await themeSession.commit()},
//     },
//   )
// }

// export const loader = () => redirect('/', {status: 404})

// export default function MarkRead() {
//   return <div>Oops... You should not see this.</div>
// }
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
