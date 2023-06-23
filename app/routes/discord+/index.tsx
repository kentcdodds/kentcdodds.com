import {ButtonLink} from '~/components/button'
import {externalLinks} from '~/external-links'
import {getDiscordAuthorizeURL} from '~/utils/misc'
import {useRootData} from '~/utils/use-root-data'

export default function DiscordIndex() {
  const {requestInfo, user} = useRootData()
  const authorizeURL = user
    ? getDiscordAuthorizeURL(requestInfo.origin)
    : externalLinks.discord
  return (
    <ButtonLink variant="primary" href={authorizeURL} className="mr-auto">
      Join Discord
    </ButtonLink>
  )
}
