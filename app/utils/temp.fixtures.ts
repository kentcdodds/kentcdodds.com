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
        'https://res.cloudinary.com/kentcdodds-com/image/upload/v1625032821/kentcdodds.com/content/blog/how-to-enable-react-concurrent-mode/banner.jpg',
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
        'https://res.cloudinary.com/kentcdodds-com/image/upload/v1625032573/kentcdodds.com/content/blog/business-and-engineering-alignment/banner.jpg',
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
        'https://res.cloudinary.com/kentcdodds-com/image/upload/v1625033492/kentcdodds.com/content/blog/using-fetch-with-type-script/banner.jpg',
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
