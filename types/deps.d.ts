// This module should contain type definitions for modules which do not have
// their own type definitions and are not available on DefinitelyTyped.
// or which their exports are not compatible with ESM imports

declare module 'md5-hash' {
	import md5Hash from 'md5-hash'
	const md5 = md5Hash as unknown as (str: string) => string
	export default md5
}

