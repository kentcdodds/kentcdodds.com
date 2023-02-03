// this is temporary until a bug in remix is fixed
// https://github.com/remix-run/react-router/issues/10037
import {redirect} from '@remix-run/node'
import * as litefsRemix from 'litefs-js/remix'
import {isResponse} from './misc'

export async function ensurePrimary() {
  try {
    const primary = await litefsRemix.ensurePrimary()
    return primary
  } catch (e: unknown) {
    if (!isResponse(e)) throw e
    throw redirect('/fly-replay', {headers: e.headers})
  }
}

export async function ensureInstance(instance: string) {
  try {
    const isInstance = await litefsRemix.ensureInstance(instance)
    return isInstance
  } catch (e: unknown) {
    if (!isResponse(e)) throw e
    throw redirect('/fly-replay', {headers: e.headers})
  }
}
