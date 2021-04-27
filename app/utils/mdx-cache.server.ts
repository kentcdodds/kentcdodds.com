import path from 'path'
import Cache from '@remark-embedder/cache'

const cache = new Cache(
  path.join(process.cwd(), 'node_modules/.cache/kentcdodds.com/mdx-cache'),
)

export default cache
