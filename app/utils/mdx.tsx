import { type MetaFunction, type TypedResponse } from '@remix-run/node'
import { LRUCache } from 'lru-cache'
import * as mdxBundler from 'mdx-bundler/client/index.js'
import * as React from 'react'
import { getSocialMetas } from './seo.ts'
import { Themed } from './theme.tsx'
import { useOptionalUser } from './use-root-data.ts'
import { CloudinaryVideo } from '~/components/cloudinary-video.tsx'
import { ConvertKitForm } from '~/convertkit/form.tsx'
import {
	getImageBuilder,
	getImgProps,
	getSocialImageWithPreTitle,
} from '~/images.tsx'
import { type RootLoaderType } from '~/root.tsx'
import { type MdxPage } from '~/types.ts'
import {
	AnchorOrLink,
	getDisplayUrl,
	getUrl,
	typedBoolean,
} from '~/utils/misc.tsx'

function getBannerAltProp(frontmatter: MdxPage['frontmatter']) {
	return (
		frontmatter.bannerAlt ??
		frontmatter.bannerTitle ??
		frontmatter.bannerCredit ??
		frontmatter.title ??
		'Post banner'
	)
}

function getBannerTitleProp(frontmatter: MdxPage['frontmatter']) {
	return (
		frontmatter.bannerTitle ?? frontmatter.bannerAlt ?? frontmatter.bannerCredit
	)
}

type ExtraMeta = Array<{ [key: string]: string }>

type MetaLoader = () => Promise<
	TypedResponse<{
		page: MdxPage
	}>
>

const mdxPageMeta: MetaFunction<MetaLoader, { root: RootLoaderType }> = ({
	data,
	matches,
}) => {
	const requestInfo = matches.find((m) => m.id === 'root')?.data.requestInfo
	if (data?.page) {
		// NOTE: keyword metadata is not used because it was used and abused by
		// spammers. We use them for sorting on our own site, but we don't list
		// it in the meta tags because it's possible to be penalized for doing so.
		const { keywords, ...extraMetaInfo } = data.page.frontmatter.meta ?? {}
		const extraMeta: ExtraMeta = Object.entries(extraMetaInfo).reduce(
			(acc: ExtraMeta, [key, val]) => [...acc, { [key]: String(val) }],
			[],
		)

		let title = data.page.frontmatter.title
		const isDraft = data.page.frontmatter.draft
		const isUnlisted = data.page.frontmatter.unlisted
		if (isDraft) title = `(DRAFT) ${title ?? ''}`

		return [
			isDraft || isUnlisted ? { robots: 'noindex' } : null,
			...getSocialMetas({
				title,
				description: data.page.frontmatter.description,
				url: getUrl(requestInfo),
				image: getSocialImageWithPreTitle({
					url: getDisplayUrl(requestInfo),
					featuredImage:
						data.page.frontmatter.bannerCloudinaryId ??
						'kentcdodds.com/illustrations/kody-flying_blue',
					title:
						data.page.frontmatter.socialImageTitle ??
						data.page.frontmatter.title ??
						'Untitled',
					preTitle:
						data.page.frontmatter.socialImagePreTitle ??
						`Check out this article`,
				}),
			}),
			...extraMeta,
		].filter(typedBoolean)
	} else {
		return [
			{ title: 'Not found' },
			{
				description:
					'You landed on a page that Kody the Coding Koala could not find 🐨😢',
			},
		]
	}
}

function OptionalUser({
	children,
}: {
	children: (user: ReturnType<typeof useOptionalUser>) => React.ReactElement
}) {
	const user = useOptionalUser()
	return children(user)
}

const mdxComponents = {
	a: AnchorOrLink,
	Themed,
	CloudinaryVideo,
	ThemedBlogImage,
	BlogImage,
	SubscribeForm,
	OptionalUser,
}

declare global {
	type MDXProvidedComponents = typeof mdxComponents
}

interface CalloutProps {
	children: React.ReactNode
	class?: string
}

declare module 'react' {
	namespace JSX {
		interface IntrinsicElements {
			'callout-danger': CalloutProps
			'callout-info': CalloutProps
			'callout-muted': CalloutProps
			'callout-success': CalloutProps
			'callout-warning': CalloutProps
		}
	}
}

/**
 * This should be rendered within a useMemo
 * @param code the code to get the component from
 * @returns the component
 */
function getMdxComponent(code: string) {
	const Component = mdxBundler.getMDXComponent(code)
	function KCDMdxComponent({
		components,
		...rest
	}: Parameters<typeof Component>['0']) {
		return (
			<Component components={{ ...mdxComponents, ...components }} {...rest} />
		)
	}
	return KCDMdxComponent
}

function BlogImage({
	cloudinaryId,
	imgProps,
	transparentBackground,
}: {
	cloudinaryId: string
	imgProps: React.ComponentProps<'img'>
	transparentBackground?: boolean
}) {
	return (
		<img
			// @ts-expect-error classname is overridden by getImgProps
			className="w-full rounded-lg object-cover py-8"
			{...getImgProps(getImageBuilder(cloudinaryId, imgProps.alt), {
				widths: [350, 550, 700, 845, 1250, 1700, 2550],
				sizes: [
					'(max-width:1023px) 80vw',
					'(min-width:1024px) and (max-width:1620px) 50vw',
					'850px',
				],
				transformations: {
					background: transparentBackground ? undefined : 'rgb:e6e9ee',
				},
			})}
			{...imgProps}
		/>
	)
}

function ThemedBlogImage({
	darkCloudinaryId,
	lightCloudinaryId,
	imgProps,
	transparentBackground,
}: {
	darkCloudinaryId: string
	lightCloudinaryId: string
	imgProps: React.ComponentProps<'img'>
	transparentBackground?: boolean
}) {
	return (
		<Themed
			light={
				<BlogImage
					cloudinaryId={lightCloudinaryId}
					imgProps={imgProps}
					transparentBackground={transparentBackground}
				/>
			}
			dark={
				<BlogImage
					cloudinaryId={darkCloudinaryId}
					imgProps={imgProps}
					transparentBackground={transparentBackground}
				/>
			}
		/>
	)
}

function SubscribeForm(props: Record<string, unknown>) {
	const { formId, convertKitTagId, convertKitFormId } = props

	if (
		typeof formId !== 'string' ||
		typeof convertKitFormId !== 'string' ||
		typeof convertKitTagId !== 'string'
	) {
		console.error(
			`SubscribeForm improperly used. Must have a formId, convertKitFormId, and convertKitTagId`,
			props,
		)
		return null
	}

	return (
		<div className="mb-12 border-b-2 border-t-2 border-team-current p-5">
			<ConvertKitForm
				formId={formId}
				convertKitFormId={convertKitFormId}
				convertKitTagId={convertKitTagId}
			/>
		</div>
	)
}

// This exists so we don't have to call new Function for the given code
// for every request for a given blog post/mdx file.
const mdxComponentCache = new LRUCache<
	string,
	ReturnType<typeof getMdxComponent>
>({
	max: 1000,
})

function useMdxComponent(code: string) {
	return React.useMemo(() => {
		if (mdxComponentCache.has(code)) {
			return mdxComponentCache.get(code)!
		}
		const component = getMdxComponent(code)
		mdxComponentCache.set(code, component)
		return component
	}, [code])
}

export { getBannerAltProp, getBannerTitleProp, mdxPageMeta, useMdxComponent }
