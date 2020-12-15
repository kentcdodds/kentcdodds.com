declare module '@mdx-js/mdx' {}
declare module '@mdx-js/react' {}

declare global {
  interface Window {
    twttr: {
      widgets: {
        load: (node?: Element) => Promise<void>
      }
    }
  }
}

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
