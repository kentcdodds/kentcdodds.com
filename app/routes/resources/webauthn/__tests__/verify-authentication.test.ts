import { expect, test, vi } from 'vitest'
import { passkeyCookie } from '#app/utils/webauthn.server.ts'

const {
	mockFindPasskey,
	mockUpdatePasskey,
	mockGetSession,
	mockGetLoginInfoSession,
	mockVerifyAuthenticationResponse,
	mockSessionSignIn,
	mockLoginSessionClean,
} = vi.hoisted(() => {
	return {
		mockFindPasskey: vi.fn(),
		mockUpdatePasskey: vi.fn(),
		mockGetSession: vi.fn(),
		mockGetLoginInfoSession: vi.fn(),
		mockVerifyAuthenticationResponse: vi.fn(),
		mockSessionSignIn: vi.fn(),
		mockLoginSessionClean: vi.fn(),
	}
})

vi.mock('@simplewebauthn/server', async () => {
	const actual = await vi.importActual('@simplewebauthn/server')
	return {
		...actual,
		verifyAuthenticationResponse: mockVerifyAuthenticationResponse,
	}
})

vi.mock('#app/utils/prisma.server.ts', () => ({
	prisma: {
		passkey: {
			findUnique: mockFindPasskey,
			update: mockUpdatePasskey,
		},
	},
}))

vi.mock('#app/utils/session.server.ts', () => ({
	getSession: mockGetSession,
}))

vi.mock('#app/utils/login.server.ts', () => ({
	getLoginInfoSession: mockGetLoginInfoSession,
}))

import { action } from '../verify-authentication.ts'

function mockSessionSetups() {
	mockSessionSignIn.mockResolvedValue(undefined)
	mockGetSession.mockResolvedValue({
		signIn: mockSessionSignIn,
		getHeaders: async (headers: Headers) => {
			headers.append('Set-Cookie', 'session=1; Path=/')
			return headers
		},
	})
	mockLoginSessionClean.mockImplementation(() => {})
	mockGetLoginInfoSession.mockResolvedValue({
		clean: mockLoginSessionClean,
		getHeaders: async (headers: Headers) => {
			headers.append('Set-Cookie', 'login-info=1; Path=/')
			return headers
		},
	})
}

test('returns 400 when challenge cookie is missing', async () => {
	mockSessionSetups()

	const request = new Request(
		'https://kentcdodds.com/resources/webauthn/verify-authentication',
		{
			method: 'POST',
			headers: {
				Host: 'kentcdodds.com',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				id: 'passkey-1',
				rawId: 'passkey-1',
				type: 'public-key',
				response: {
					clientDataJSON: 'a',
					authenticatorData: 'b',
					signature: 'c',
				},
				clientExtensionResults: {},
			}),
		},
	)

	const result = (await action({ request } as any)) as any

	expect(result.type).toBe('DataWithResponseInit')
	expect(result.init?.status).toBe(400)
	expect(result.data).toEqual({
		status: 'error',
		error: 'Authentication challenge not found',
	})
})

test('verifies authentication and signs user in', async () => {
	mockSessionSetups()
	mockFindPasskey.mockResolvedValue({
		id: 'passkey-1',
		publicKey: new Uint8Array([1, 2, 3]),
		counter: BigInt(1),
		user: { id: 'user-1' },
	})
	mockVerifyAuthenticationResponse.mockResolvedValue({
		verified: true,
		authenticationInfo: { newCounter: 9 },
	})
	mockUpdatePasskey.mockResolvedValue({ id: 'passkey-1' })

	const challenge = await passkeyCookie.serialize({
		challenge: 'challenge-token',
	})
	const request = new Request(
		'https://kentcdodds.com/resources/webauthn/verify-authentication',
		{
			method: 'POST',
			headers: {
				Host: 'kentcdodds.com',
				Cookie: challenge,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				id: 'passkey-1',
				rawId: 'passkey-1',
				type: 'public-key',
				response: {
					clientDataJSON: 'a',
					authenticatorData: 'b',
					signature: 'c',
				},
				clientExtensionResults: {},
			}),
		},
	)

	const result = (await action({ request } as any)) as any

	expect(result.type).toBe('DataWithResponseInit')
	expect(result.data).toEqual({ status: 'success' })
	const headers = new Headers(result.init?.headers ?? undefined)
	expect(headers.get('Set-Cookie')).toContain('webauthn-challenge=')
	expect(mockVerifyAuthenticationResponse).toHaveBeenCalledTimes(1)
	expect(mockUpdatePasskey).toHaveBeenCalledWith({
		where: { id: 'passkey-1' },
		data: { counter: BigInt(9) },
	})
	expect(mockSessionSignIn).toHaveBeenCalledWith({ id: 'user-1' })
	expect(mockLoginSessionClean).toHaveBeenCalledTimes(1)
})
