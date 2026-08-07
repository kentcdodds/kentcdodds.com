// zod v4's classic entry re-exports every error-message locale (~180KB
// minified) via `export * as locales`. The site only ever uses the default
// English messages (zod core imports `locales/en.js` directly, bypassing this
// barrel), so the app-worker build aliases the barrel to this en-only stub to
// keep the eagerly-evaluated dynamic worker bundle small.
export { default as en } from 'zod/v4/locales/en.js'
