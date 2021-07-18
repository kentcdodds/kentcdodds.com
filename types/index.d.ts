import calculateReadingTime from 'reading-time'
import type {Request, Response} from 'node-fetch'
import type {ActionFunction, LoaderFunction} from 'remix'
import type {User, Call, Session, Team, Role} from '@prisma/client'

declare global {
  interface Window {
    twttr?: {
      widgets: {
        load: (node?: Element) => Promise<void>
      }
    }
  }
}

type NonNullProperties<Type> = {[Key in keyof Type]: Exclude<Type[Key], null>}
type Await<Type> = Type extends Promise<infer Value> ? Await<Value> : Type

type MdxPage = {
  code: string
  slug: string
  readTime?: ReturnType<typeof calculateReadingTime>

  /**
   * It's annoying that all these are set to optional I know, but there's
   * no great way to ensure that the MDX files have these properties,
   * especially when a common use case will be to edit them without running
   * the app or build. So we're going to force you to handle situations when
   * these values are missing to avoid runtime errors.
   */
  frontmatter: {
    title?: string
    description?: string

    // Post meta
    categories?: Array<string>
    date?: string
    bannerUrl?: string
    bannerCredit?: string
    bannerAlt?: string
    translations?: Array<{
      language: string
      link: string
      author?: {
        name: string
        link?: string
      }
    }>

    // Workshop meta
    tech?: string
    convertKitTag?: string
    meta?: {
      keywords?: Array<string>
      [key as string]: string
    }
  }
}

/**
 * This is a separate type from MdxPage because the code string is often
 * pretty big and the pages that simply list the pages shouldn't include the code.
 */
type MdxListItem = Omit<MdxPage, 'code'>

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
  summaryHTML: string
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
}

/**
 * Chats with Kent Podcast List Item
 */
type CWKListItem = Omit<
  CWKEpisode,
  | 'homeworkHTMLs'
  | 'resources'
  | 'summaryHTML'
  | 'transcriptHTML'
  | 'meta'
  | 'descriptionHTML'
>

type CWKSeason = {
  seasonNumber: number
  episodes: Array<CWKListItem>
}

type KCDLoader<
  Params extends Record<string, unknown> = Record<string, unknown>,
> = (
  args: Omit<Parameters<LoaderFunction>['0'], 'params'> & {params: Params},
) => ReturnType<LoaderFunction>

type KCDAction<
  Params extends Record<string, unknown> = Record<string, unknown>,
> = (
  args: Omit<Parameters<ActionFunction>['0'], 'params'> & {params: Params},
) => ReturnType<ActionFunction>

type GitHubFile = {path: string; content: string}

export {
  Request,
  Response,
  NonNullProperties,
  Await,
  User,
  Call,
  Session,
  Team,
  Role,
  MdxPage,
  MdxListItem,
  CWKEpisode,
  CWKListItem,
  CWKSeason,
  KCDLoader,
  KCDAction,
  GitHubFile,
}

export * from './simplecast'
