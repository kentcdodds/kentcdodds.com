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
  frontmatter: {
    title?: string
    description?: string

    // Post meta
    date?: number
    bannerUrl?: string
    bannerCredit?: string
    bannerAlt?: string

    // Workshop meta
    tech?: string
    convertKitTag?: string
    meta?: {
      [key as string]: string
    }
  }
}

type MdxPage = MdxListItem & {
  code: string
}

type LoaderContext = {
  req: Request
  res: Response
}

type KCDLoader<Params extends Record<string, string> = Record<string, string>> =
  (
    args: Omit<Parameters<Loader>['0'], 'context' | 'params'> & {
      context: LoaderContext
      params: Params
    },
  ) => ReturnType<Loader>

type KCDAction<Params extends Record<string, string> = Record<string, string>> =
  (
    args: Omit<Parameters<Action>['0'], 'context' | 'params'> & {
      context: LoaderContext
      params: Params
    },
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
