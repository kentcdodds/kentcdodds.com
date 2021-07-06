import * as React from 'react'
import {VideoCard} from '@kcd/components/video-card'
import {CourseCard} from '@kcd/components/course-card'
import {ArticleCard} from '@kcd/components/article-card'
import type {Meta} from '@storybook/react'
import {articles} from './fixtures'

// TODO: I'm not really a fan of how the cards render in 'story mode', but
//   included on the page, they look fine.
export default {
  title: 'Cards',
  decorators: [
    Story => (
      // limit the card width
      <div style={{maxWidth: 600, padding: 40}}>
        <Story />
      </div>
    ),
  ],
} as Meta

// @ts-expect-error `args` is a storybook thing
VideoCard.args = {
  title: `Hi, I'm Kent C. Dodds`,
  description: 'Introduction video 1:42',
  imageUrl: 'https://source.unsplash.com/350x400?skateboard',
  videoUrl: 'https://source.unsplash.com?skateboard',
}

// @ts-expect-error `args` is a storybook thing
CourseCard.args = {
  title: `Epic React`,
  description: 'The most comprehensive guide for pro’s.',
  imageUrl:
    'https://epicreact.dev/static/e9e50b43a9526373f48a11340fdfdbdc/6ba37/01-react-fundamentals.png',
  courseUrl: '#',
}

// @ts-expect-error `args` is a storybook thing
ArticleCard.args = articles[0]

export {VideoCard, CourseCard, ArticleCard}
