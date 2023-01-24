import * as React from 'react'

// This exists to allow us to render React with a nonce on the server and
// without one on the client. This is necessary because we can't send the nonce
// to the client in JS because it's a security risk and the browser removes the
// nonce attribute from scripts and things anyway so if we hydrated with a nonce
// we'd get a hydration warning.

export const NonceContext = React.createContext<string | undefined>(undefined)
export const NonceProvider = NonceContext.Provider
export const useNonce = () => React.useContext(NonceContext)
