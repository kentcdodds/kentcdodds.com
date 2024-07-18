import { ButtonLink } from '#app/components/button.tsx'
import { externalLinks } from '#app/external-links.tsx'
import { getDiscordAuthorizeURL } from '#app/utils/misc.tsx'
import { useRootData } from '#app/utils/use-root-data.ts'

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
