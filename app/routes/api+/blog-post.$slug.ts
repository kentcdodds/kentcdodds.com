import { json } from '@remix-run/node'
import { downloadMdxFilesCached } from '#app/utils/mdx.server.js'

export async function loader({ params }: { params: { slug: string } }) {
	const { slug } = params
	const { files } = await downloadMdxFilesCached('blog', slug, {})

	if (!files.length) {
		throw new Response(`No blog post found with slug: ${slug}`, { status: 404 })
	}

	return json(files)
}
