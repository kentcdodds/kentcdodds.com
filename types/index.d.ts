declare module '@mdx-js/mdx'

type PostListing = {
  name: string
  frontmatter: {
    title: string
    description: string
    published: number
  }
}

type Post = PostListing & {
  js: string
}

export {Post, PostListing}
