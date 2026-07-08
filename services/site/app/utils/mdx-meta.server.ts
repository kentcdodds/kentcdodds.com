import { type MetaFunction } from 'react-router'
import { buildPageSocialMetas } from '#app/og/page-meta.server.ts'
import { type MdxPage } from '#app/types.ts'
import { typedBoolean } from '#app/utils/misc.ts'

type ExtraMeta = Array<{ [key: string]: string }>

type RequestInfo = { origin: string; path: string } | undefined

export function buildMdxPageSocialMetas(
	page: MdxPage,
	requestInfo: RequestInfo,
) {
	const { keywords: _keywords, ...extraMetaInfo } = page.frontmatter.meta ?? {}
	const extraMeta: ExtraMeta = Object.entries(extraMetaInfo).reduce(
		(acc: ExtraMeta, [key, val]) => [...acc, { [key]: String(val) }],
		[],
	)

	let title = page.frontmatter.title
	const isDraft = page.frontmatter.draft
	const isUnlisted = page.frontmatter.unlisted
	if (isDraft) title = `(DRAFT) ${title ?? ''}`

	return [
		isDraft || isUnlisted ? { robots: 'noindex' } : null,
		...buildPageSocialMetas(requestInfo, {
			title: title ?? 'Untitled',
			description: page.frontmatter.description ?? '',
			ogType: requestInfo?.path.includes('/blog/') ? 'article' : 'website',
			socialImage: {
				kind: 'social-preview',
				featuredImage:
					page.frontmatter.bannerCloudinaryId ??
					'kentcdodds.com/illustrations/kody-flying_blue',
				title:
					page.frontmatter.socialImageTitle ??
					page.frontmatter.title ??
					'Untitled',
				preTitle:
					page.frontmatter.socialImagePreTitle ?? `Check out this article`,
			},
		}),
		...extraMeta,
	].filter(typedBoolean)
}

export const mdxPageMeta: MetaFunction = ({ data }) => {
	if (
		data != null &&
		typeof data === 'object' &&
		'socialMetas' in data &&
		Array.isArray(data.socialMetas)
	) {
		return data.socialMetas
	}

	return [
		{ title: 'Not found' },
		{
			description:
				'You landed on a page that Kody the Coding Koala could not find 🐨😢',
		},
	]
}
