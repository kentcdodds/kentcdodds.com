import {json} from 'remix'
import {KCDLoader} from 'types'
import {rootStorage} from '../utils/session.server'

function sendSessionValue(valuesAndDefaults: Record<string, unknown>) {
  const loadSession: KCDLoader = async ({request}) => {
    const session = await rootStorage.getSession(request.headers.get('Cookie'))
    const values: Record<string, unknown> = {}
    for (const [name, defaultValue] of Object.entries(valuesAndDefaults)) {
      const sessionValue = session.get(name)
      values[name] = sessionValue ?? defaultValue
    }
    return json(values, {
      headers: {
        'Set-Cookie': await rootStorage.commitSession(session),
      },
    })
  }
  return loadSession
}

export {sendSessionValue}
