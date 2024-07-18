import { type KCDHandle } from '#app/types.ts'

export const handle: KCDHandle = {
	getSitemapEntries: () => null,
}

export default function NoCallSelected() {
	return <div>Select a call</div>
}
