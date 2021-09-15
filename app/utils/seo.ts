import {getGenericSocialImage} from '~/images'

export function getSocialMetas({
  url,
  title = 'Helping people make the world a better place through quality software',
  description = 'Make the world better with software',
  image = getGenericSocialImage({
    url,
    words: title,
    featuredImage: 'kentcdodds.com/illustrations/kody-flying_blue',
  }),
}: {
  image?: string
  url: string
  title?: string
  description?: string
}) {
  return {
    image,
    'og:url': url,
    'og:title': title,
    'og:description': description,
    'og:image': image,
    'twitter:card': 'summary_large_image',
    'twitter:creator': '@kentcdodds',
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': image,
  }
}
