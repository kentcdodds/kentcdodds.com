import {json} from '@remix-run/data'
import {KCDLoader} from 'types'
import {commitSession, getSession} from '../session-storage'

function sendSessionValue(valuesAndDefaults: Record<string, unknown>) {
  const loadSession: KCDLoader = async ({request}) => {
    const session = await getSession(request.headers.get('Cookie') ?? undefined)
    const values: Record<string, unknown> = {}
    for (const [name, defaultValue] of Object.entries(valuesAndDefaults)) {
      const sessionValue = session.get(name)
      values[name] = sessionValue ?? defaultValue
    }
    return json(values, {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    })
  }
  return loadSession
}

export {sendSessionValue}
