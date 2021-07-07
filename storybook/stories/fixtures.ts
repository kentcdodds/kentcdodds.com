import type {MdxListItem} from 'types'

export const articles: Array<MdxListItem> = [
  {
    readTime: {
      text: '1 min read',
      minutes: 1,
      time: 60,
      words: 200,
    },
    slug: 'blog-1',
    frontmatter: {
      title: 'How to Enable React Concurrent Mode',
      bannerUrl:
        'https://kentcdodds.com/static/7ada1615181833135eadad3efd73ff3e/09a9d/banner.webp',
      bannerAlt: 'placeholder',
      date: '2021-04-05',
    },
  },
  {
    readTime: {
      text: '12 min read',
      minutes: 12,
      time: 720,
      words: 500,
    },
    slug: 'blog-2',
    frontmatter: {
      title: 'Build vs Buy: Component Libraries edition',
      bannerUrl:
        'https://res.cloudinary.com/kentcdodds-com/image/upload/f_auto,q_auto,dpr_2.0/v1620771700/kentcdodds.com/blog/don-t-solve-problems-eliminate-them/banner_qzwcgj.jpg',
      bannerAlt: 'placeholder',
      date: '2021-03-22',
    },
  },
  {
    readTime: {
      text: '5 min read',
      minutes: 5,
      time: 300,
      words: 600,
    },
    slug: 'blog-3',
    frontmatter: {
      title: 'Business and Engineering alignment',
      bannerUrl:
        'https://kentcdodds.com/static/bf0fd6f22a7cb75817cb938eeba2e42c/09a9d/banner.webp',
      bannerAlt: 'placeholder',
      date: '2021-03-05',
    },
  },
  {
    readTime: {
      text: '9 min read',
      minutes: 9,
      time: 540,
      words: 800,
    },
    slug: 'blog-4',
    frontmatter: {
      title: 'Using fetch with TypeScript',
      bannerUrl:
        'https://kentcdodds.com/static/f878ee6f4866c43770b2284a34b0649f/09a9d/banner.webp',
      bannerAlt: 'placeholder',
      date: '2021-03-02',
    },
  },
]

export const tags = [
  'career',
  'css',
  'javascript',
  'learning',
  'node',
  'opensource',
  'performance',
  'personal',
  'productivity',
  'programming',
  'react',
  'review',
  'state',
  'teaching',
  'testing',
  'typescript',
]
