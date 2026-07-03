// This just allows us to track individual clients so we can keep track of
// the posts they've read and make useful suggestions even if they're not logged in.

import { createCookieSessionStorage } from 'react-router'
import * as cookie from 'cookie'
import * as uuid from 'uuid'
import { getEnv } from './env.server.ts'

const clientCookieName = 'KCD_client_id'

type ClientSessionData = {
	clientId: string
}

let clientStorage:
	| ReturnType<typeof createCookieSessionStorage<ClientSessionData>>
	| undefined

function getClientStorage() {
	if (!clientStorage) {
		clientStorage = createCookieSessionStorage<ClientSessionData>({
			cookie: {
				name: clientCookieName,
				secure: true,
				secrets: [getEnv().SESSION_SECRET],
				sameSite: 'lax',
				path: '/',
				httpOnly: true,
			},
		})
	}
	return clientStorage
}

async function getClientSession(request: Request, user: {} | null) {
	const storage = getClientStorage()
	const session = await storage.getSession(request.headers.get('Cookie'))

	// no client ID for you on my 100th birthday! 😂
	const expires = new Date('2088-10-18')
	const initialValue = user
		? null
		: await storage.commitSession(session, { expires })
	async function commit() {
		if (user) {
			if (initialValue) {
				const value = await storage.destroySession(session)
				return value
			} else {
				return null
			}
		} else {
			const currentValue = await storage.commitSession(session, {
				expires,
			})
			return currentValue === initialValue ? null : currentValue
		}
	}

	function getClientId() {
		if (user) return null
		let clientId = session.get('clientId') as string | undefined
		if (typeof clientId === 'string') return clientId
		clientId = uuid.v4()
		session.set('clientId', clientId)
		return clientId
	}

	// get the clientId set if it's not already
	getClientId()

	return {
		getClientId,
		commit,
		setUser(usr: {} | null) {
			user = usr
		},
		/**
		 * This will initialize a Headers object if one is not provided.
		 * It will set the 'Set-Cookie' header value on that headers object.
		 * It will then return that Headers object.
		 */
		getHeaders: async (headers: ResponseInit['headers'] = new Headers()) => {
			const value = await commit()
			if (!value) return headers
			if (headers instanceof Headers) {
				headers.append('Set-Cookie', value)
			} else if (Array.isArray(headers)) {
				headers.push(['Set-Cookie', value])
			} else {
				headers['Set-Cookie'] = value
			}
			return headers
		},
	}
}

function hasClientSessionCookie(request: Request) {
	const cookieHeader = request.headers.get('Cookie')
	return cookieHeader
		? Boolean(cookie.parse(cookieHeader)[clientCookieName])
		: false
}

export { getClientSession, hasClientSessionCookie }
