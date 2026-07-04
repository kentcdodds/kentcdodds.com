import { LRUCache } from 'lru-cache'
import * as mdxBundler from 'mdx-bundler/client/index.js'
import * as React from 'react'
import { type ComponentType } from 'react'
import { CloudinaryVideo } from '#app/components/cloudinary-video.tsx'
import { MermaidDiagram } from '#app/components/mermaid.tsx'
import {
	getImageBuilder,
	getImgProps,
} from '#app/images.tsx'
import { KitForm } from '#app/kit/form.tsx'
import { type MdxPage } from '#app/types.ts'
import {
	AnchorOrLink,
	getDisplayUrl,
	getUrl,
	typedBoolean,
} from '#app/utils/misc-react.tsx'
import { getRegisteredMdxComponent } from './mdx-component-registry.ts'
import { Themed } from './theme.tsx'
import { useOptionalUser } from './use-root-data.ts'

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

function OptionalUser({
	children,
}: {
	children: (user: ReturnType<typeof useOptionalUser>) => React.ReactElement
}) {
	const user = useOptionalUser()
	return children(user)
}

function MdxTable(props: React.ComponentPropsWithoutRef<'table'>) {
	return (
		<div className="mdx-table-wrapper">
			<table {...props} />
		</div>
	)
}

const mdxComponents = {
	a: AnchorOrLink,
	table: MdxTable,
	Themed,
	CloudinaryVideo,
	MermaidDiagram,
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
	const Registered = getRegisteredMdxComponent(code)
	if (Registered) {
		function KCDRegisteredMdxComponent({
			components,
			...rest
		}: {
			components?: Record<string, ComponentType<unknown>>
			[key: string]: unknown
		}) {
			if (!Registered) throw new Error('registered MDX component went away')
			return (
				<Registered
					components={{ ...mdxComponents, ...components }}
					{...rest}
				/>
			)
		}
		return KCDRegisteredMdxComponent
	}

	const Component = mdxBundler.getMDXComponent(code)
	function KCDMdxComponent({
		components,
		...rest
	}: Parameters<typeof Component>[0]) {
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
	const { formId, kitTagId, kitFormId } = props

	if (
		typeof formId !== 'string' ||
		typeof kitFormId !== 'string' ||
		typeof kitTagId !== 'string'
	) {
		console.error(
			`SubscribeForm improperly used. Must have a formId, kitFormId, and kitTagId`,
			props,
		)
		return null
	}

	return (
		<div className="border-team-current mb-12 border-t-2 border-b-2 p-5">
			<KitForm formId={formId} kitFormId={kitFormId} kitTagId={kitTagId} />
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

export { getBannerAltProp, getBannerTitleProp, useMdxComponent }
