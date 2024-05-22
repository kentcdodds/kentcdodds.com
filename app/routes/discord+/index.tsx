import { ButtonLink } from '~/components/button.tsx'
import { externalLinks } from '~/external-links.tsx'
import { getDiscordAuthorizeURL } from '~/utils/misc.tsx'
import { useRootData } from '~/utils/use-root-data.ts'

export default function DiscordIndex() {
	const { requestInfo, user } = useRootData()
	const authorizeURL = user
		? getDiscordAuthorizeURL(requestInfo.origin)
		: externalLinks.discord
	return (
		<ButtonLink variant="primary" href={authorizeURL} className="mr-auto">
			Join Discord
		</ButtonLink>
	)
}
