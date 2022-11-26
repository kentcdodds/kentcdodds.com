import type {KCDHandle} from '~/types'

export const handle: KCDHandle = {
  getSitemapEntries: () => null,
}

export default function NoCallSelected() {
  return <div>Select a call</div>
}
