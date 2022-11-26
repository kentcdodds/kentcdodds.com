import type {KCDHandle} from '~/types'
import {HeroSection} from '~/components/sections/hero-section'
import {images} from '~/images'

export const handle: KCDHandle = {
  getSitemapEntries: () => null,
}

export function meta() {
  return {title: "Ain't nothing here"}
}

export default function NotFoundPage() {
  return (
    <main>
      <HeroSection
        title="404 - Oh no, you found a page that's missing stuff."
        subtitle="This is not a page on kentcdodds.com. So sorry."
        imageBuilder={images.bustedOnewheel}
      />
    </main>
  )
}
