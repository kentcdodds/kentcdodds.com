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

export {Post, PostListing}
