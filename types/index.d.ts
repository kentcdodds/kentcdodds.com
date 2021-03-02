import {Request, Response} from 'node-fetch'
import type {Octokit} from '@octokit/rest'
import type {Action, Loader} from '@remix-run/data'

declare global {
  interface Window {
    twttr?: {
      widgets: {
        load: (node?: Element) => Promise<void>
      }
    }
  }
}

type PostListing = {
  slug: string
  frontmatter: {
    title: string
    description: string
    published: number
  }
}

type Post = PostListing & {
  code: string
}

type LoaderContext = {
  req: Request
  res: Response
  octokit: Octokit
}

type lp = Parameters<Loader>

type KCDLoader = (
  args: Omit<Parameters<Loader>['0'], 'context'> & {context: LoaderContext},
) => ReturnType<Loader>
type KCDLoader = (
  args: Omit<Parameters<Action>['0'], 'context'> & {context: LoaderContext},
) => ReturnType<Action>

type PostFile = {path: string; content: string}
type PostIndexFile = PostFile & {slug: string}

export {Post, PostListing, KCDLoader, KCDAction, PostFile, PostIndexFile}
