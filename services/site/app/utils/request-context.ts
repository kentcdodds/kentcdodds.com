import { createContext } from 'react-router'

type CspNonceContext = ReturnType<typeof createContext<string>>

declare global {
	var __kcdCspNonceContext: CspNonceContext | undefined
}

const cspNonceContext =
	globalThis.__kcdCspNonceContext ??
	(globalThis.__kcdCspNonceContext = createContext<string>(''))

export { cspNonceContext }
