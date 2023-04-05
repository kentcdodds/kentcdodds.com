/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/node/globals" />

import type calculateReadingTime from 'reading-time'
import type {User, Call, Session} from '@prisma/client'

type NonNullProperties<Type> = {
  [Key in keyof Type]-?: Exclude<Type[Key], null | undefined>
}
type Await<Type> = Type extends Promise<infer Value> ? Await<Value> : Type

type MdxPage = {
  code: string
  slug: string
  editLink: string
  readTime?: ReturnType<typeof calculateReadingTime>
  dateDisplay?: string

  /**
   * It's annoying that all these are set to optional I know, but there's
   * no great way to ensure that the MDX files have these properties,
   * especially when a common use case will be to edit them without running
   * the app or build. So we're going to force you to handle situations when
   * these values are missing to avoid runtime errors.
   */
  frontmatter: {
    archived?: boolean
    draft?: boolean
    unlisted?: boolean
    title?: string
    description?: string
    meta?: {
      keywords?: Array<string>
      [key as string]: string
    }

    // Post meta
    categories?: Array<string>
    date?: string
    bannerBlurDataUrl?: string
    bannerCloudinaryId?: string
    bannerCredit?: string
    bannerAlt?: string
    bannerTitle?: string
    socialImageTitle?: string
    socialImagePreTitle?: string
    translations?: Array<{
      language: string
      link: string
      author?: {
        name: string
        link?: string
      }
    }>
  }
}

/**
 * This is a separate type from MdxPage because the code string is often
 * pretty big and the pages that simply list the pages shouldn't include the code.
 */
type MdxListItem = Omit<MdxPage, 'code'>

type ManualWorkshopEvent = {
  type: 'manual'
  title: string
  url: string
  quantity?: number
  remaining?: number
  date: string
}

type KeyTakeaway = {
  title: string
  description: string
}

type ProblemStatements = {
  part1: string
  part2: string
  part3: string
  part4: string
}

type Workshop = {
  slug: string
  title: string
  events: Array<ManualWorkshopEvent>
  description: string
  categories: Array<string>
  meta: {
    keywords?: Array<string>
    [key as string]: string
  }
  convertKitTag?: string
  problemStatementHTMLs: ProblemStatements
  keyTakeawayHTMLs: Array<KeyTakeaway>
  topicHTMLs: Array<string>
  prerequisiteHTML: string
}

type Link = {
  name: string
  url: string
}
/**
 * Chats with Kent Podcast Episode
 */
type CWKEpisode = {
  slug: string
  title: string
  meta?: {
    keywords?: Array<string>
    [key as string]: string
  }
  descriptionHTML: string
  description: string
  summaryHTML: string
  updatedAt: string
  seasonNumber: number
  episodeNumber: number
  homeworkHTMLs: Array<string>
  resources: Array<Link>
  image: string
  guests: Array<{
    name: string
    company?: string
    github?: string
    twitter?: string
  }>
  duration: number
  transcriptHTML: string
  simpleCastId: string
  mediaUrl: string
}

/**
 * Chats with Kent Podcast List Item
 */
type CWKListItem = Pick<
  CWKEpisode,
  | 'slug'
  | 'title'
  | 'seasonNumber'
  | 'episodeNumber'
  | 'image'
  | 'guests'
  | 'duration'
  | 'simpleCastId'
>

type CWKSeason = {
  seasonNumber: number
  episodes: Array<CWKListItem>
}

type CallKentEpisode = {
  episodeNumber: number
  seasonNumber: number
  slug: string
  title: string
  summary: string
  description: string
  descriptionHTML: string
  keywords: string
  duration: number
  shareUrl: string
  mediaUrl: string
  embedHtml: string
  embedHtmlDark: string
  imageUrl: string
  publishedAt: string
  updatedAt: string
}

type KCDSitemapEntry = {
  route: string
  lastmod?: string
  changefreq?:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never'
  priority?: 0.0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1.0
}
type KCDHandle = {
  /** this just allows us to identify routes more directly rather than relying on pathnames */
  id?: string
  getSitemapEntries?: (
    request: Request,
  ) =>
    | Promise<Array<KCDSitemapEntry | null> | null>
    | Array<KCDSitemapEntry | null>
    | null
}

type GitHubFile = {path: string; content: string}
type Team = 'RED' | 'BLUE' | 'YELLOW'
type Role = 'ADMIN' | 'MEMBER'
type OptionalTeam = Team | 'UNKNOWN'

export {
  NonNullProperties,
  Await,
  User,
  Call,
  Session,
  Team,
  Role,
  OptionalTeam,
  MdxPage,
  MdxListItem,
  Workshop,
  CWKEpisode,
  CWKListItem,
  CWKSeason,
  CallKentEpisode,
  KCDHandle,
  KCDSitemapEntry,
  GitHubFile,
}

export * from './simplecast'
export * from './transistor'
