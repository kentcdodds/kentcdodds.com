import { MicrophoneIcon } from '#app/components/icons.tsx'
import { H4, Paragraph } from '#app/components/typography.tsx'
import { type KCDHandle } from '#app/types.ts'

export const handle: KCDHandle = {
	getSitemapEntries: () => null,
}

export default function NoCallSelected() {
	return (
		<div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-lg bg-gray-100 p-8 text-center dark:bg-gray-800 lg:min-h-[500px]">
			<div className="mb-6 rounded-full bg-gray-200 p-6 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
				<MicrophoneIcon size={48} />
			</div>
			<H4 as="h2" className="mb-2">
				Select a call
			</H4>
			<Paragraph className="dark:text-slate-400 max-w-md text-gray-500">
				Choose a call from the list to listen, respond, and publish it to the
				podcast.
			</Paragraph>
		</div>
	)
}
