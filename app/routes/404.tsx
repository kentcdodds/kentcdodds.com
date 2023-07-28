import {type V2_MetaFunction} from '@remix-run/node'
import {HeroSection} from '~/components/sections/hero-section.tsx'
import {images} from '~/images.tsx'
import {type KCDHandle} from '~/types.ts'

export const handle: KCDHandle = {
  getSitemapEntries: () => null,
}

export const meta: V2_MetaFunction = () => {
  return [{title: "Ain't nothing here"}]
}

export default function NotFoundPage() {
  return (
    <main>
      <HeroSection
        title="404 - Eh non, je suis désolé de t'apprendre que cette page n'existe pas !"
        subtitle="This is not a page on ."
        imageBuilder={images.bustedOnewheel}
      />
    </main>
  )
}
