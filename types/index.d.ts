import {Request, Response} from 'node-fetch'
import type {Action, Loader} from 'remix'
import type {User, Call, Session, Team} from '@prisma/client'

declare global {
  interface Window {
    ENV: {
      firebase: Object
    }
    twttr?: {
      widgets: {
        load: (node?: Element) => Promise<void>
      }
    }
  }
}

type NonNullProperties<Type> = {[Key in keyof Type]: Exclude<Type[Key], null>}

type MdxListItem = {
  slug: string
  frontmatter: {
    meta: {
      title: string
      description: string
      [key as string]: string
    }
  }
}

type MdxPage = MdxListItem & {
  code: string
}

type PostListItem = MdxListItem & {
  frontmatter: {published: number}
}

type Post = PostListItem & {code: string}

type WorkshopListItem = MdxListItem & {
  frontmatter: {tech: string; convertKitTag: string}
}

type WorkshopPage = WorkshopListItem & {code: string}

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
  NonNullProperties,
  User,
  Call,
  Session,
  Team,
  MdxListItem,
  MdxPage,
  PostListItem,
  Post,
  WroskhopListItem,
  WorkshopPage,
  KCDLoader,
  KCDAction,
  GitHubFile,
}
