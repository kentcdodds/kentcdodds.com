import type {Request} from 'remix'
import * as Sentry from '@sentry/node'
import type * as S from '@sentry/types'
import {getUser} from './session.server'

function sendEvent(
  error: unknown,
  captureContext: () => Promise<S.CaptureContext> | S.CaptureContext,
) {
  // we only connect to sentry when running in FLY
  if (!process.env.FLY) return

  // we don't want every caller to have to ignore the promise,
  // so we'll make this a sync function and ignore the promise ourselves.
  async function go() {
    try {
      Sentry.captureException(error, await captureContext())
    } catch (e: unknown) {
      console.error(
        `Error with Sentry.captureException`,
        e,
        error,
        captureContext,
      )
    }
  }

  void go()
}

function sendEventWithRequestContext(
  request: Request,
  error: unknown,
  getContext: () => Promise<Partial<S.ScopeContext>> | Partial<S.ScopeContext>,
) {
  sendEvent(error, async () => {
    const originalContext = await getContext()

    const user = await getUser(request)
    const completeContext = {
      ...originalContext,
      user: user
        ? {
            email: user.email,
            id: user.id,
            ...originalContext.user,
          }
        : undefined,
      tags: {
        requestMethod: request.method,
        requestUrl: request.url,
        region: process.env.FLY_REGION ?? 'unknown',
        ...originalContext.tags,
      },
    }
    return completeContext
  })
}

export {sendEvent, sendEventWithRequestContext}
