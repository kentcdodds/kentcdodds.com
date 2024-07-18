import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { Grid } from '#app/components/grid.tsx'
import { RssIcon } from '#app/components/icons.tsx'
import { HeroSection } from '#app/components/sections/hero-section.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { H3 } from '#app/components/typography.tsx'
import { images } from '#app/images.tsx'
import { markdownToHtmlUnwrapped } from '#app/utils/markdown.server.ts'
import { getBlogMdxListItems } from '#app/utils/mdx.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const posts = await getBlogMdxListItems({ request }).then((allPosts) =>
		Promise.all(
			allPosts
				.filter((p) => !p.frontmatter.draft)
				.map(async (p) => ({
					title: p.frontmatter.title ?? 'Untitled',
					descriptionHTML: await markdownToHtmlUnwrapped(
						p.frontmatter.description ?? 'No description',
					),
					slug: p.slug,
				})),
		),
	)

	return json(
		{ posts },
		{
			headers: {
				'Cache-Control': 'private, max-age=3600',
				Vary: 'Cookie',
			},
		},
	)
}

export default function BlogList() {
	const data = useLoaderData<typeof loader>()

	return (
		<div>
			<HeroSection
				title="Blog post list"
				subtitle={
					<>
						<span>{`For folks wanting something a bit more scrollable.`}</span>
						<Link
							reloadDocument
							to="/blog/rss.xml"
							className="text-secondary underlined ml-2 inline-block hover:text-team-current focus:text-team-current"
						>
							<RssIcon title="Get my blog as RSS" />
						</Link>
					</>
				}
				arrowUrl="#posts"
				arrowLabel={`${data.posts.length} Total Posts`}
				imageBuilder={images.skis}
			/>
			<Grid as="main">
				<div className="col-span-full" id="posts">
					<H3>Posts</H3>
					<Spacer size="2xs" />
					<div>
						<ul className="list-inside list-disc">
							{data.posts.map((post) => (
								<li key={post.slug} className="leading-loose">
									<Link to={`/blog/${post.slug}`} className="text-xl">
										{post.title}
									</Link>{' '}
									<span
										className="text-secondary"
										dangerouslySetInnerHTML={{ __html: post.descriptionHTML }}
									/>
								</li>
							))}
						</ul>
						<Spacer size="3xs" />
					</div>
				</div>
			</Grid>
		</div>
	)
}
