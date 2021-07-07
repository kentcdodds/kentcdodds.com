import calculateReadingTime from 'reading-time'
import type {Request, Response} from 'node-fetch'
import type {Action, Loader} from 'remix'
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

type MdxListItem = {
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
 * This is a separate type from MdxListItem because the code string is often
 * pretty big and the pages that simply list the pages shouldn't include the code.
 */
type MdxPage = MdxListItem & {code: string}

type KCDLoader<Params extends Record<string, string> = Record<string, string>> =
  (
    args: Omit<Parameters<Loader>['0'], 'params'> & {params: Params},
  ) => ReturnType<Loader>

type KCDAction<Params extends Record<string, string> = Record<string, string>> =
  (
    args: Omit<Parameters<Action>['0'], 'params'> & {params: Params},
  ) => ReturnType<Action>

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
  KCDLoader,
  KCDAction,
  GitHubFile,
}
