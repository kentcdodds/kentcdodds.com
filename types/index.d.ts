declare module 'sort-by'

type Post = {
  name: string
  html?: string
  attributes: {
    title: string
    description: string
    updated: number
    published: number
  }
}
export {Post}
