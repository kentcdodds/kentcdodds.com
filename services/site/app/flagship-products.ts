import { type CourseCardProps } from '#app/components/course-card.tsx'
import { images } from '#app/images.tsx'
import epicProductEngineerLogo from './assets/epic-product-engineer.svg?url'

type FlagshipProduct = {
	id: string
	promoKeywords: Array<string>
	homeCard: CourseCardProps
	coursesCard: CourseCardProps
	blogCard: CourseCardProps
}

const epicProductImage = {
	imageSrc: epicProductEngineerLogo,
	imageAlt: 'The EpicProduct.engineer logo',
	imageClassName: 'h-[82%] w-auto',
}

const flagshipProducts = [
	{
		id: 'epic-product',
		promoKeywords: ['product', 'product-engineering', 'judgment'],
		homeCard: {
			title: 'Epic Product',
			description:
				'Learn product engineering: judgment, constraints, and what should be built.',
			label: 'Current focus: product engineering',
			courseUrl: 'https://www.epicproduct.engineer',
			horizontal: true,
			...epicProductImage,
		},
		coursesCard: {
			title: 'Epic Product',
			description:
				'Learn product engineering: how to surface constraints, sharpen judgment, and decide what should be built before implementation.',
			label: 'Current focus: product engineering',
			courseUrl: 'https://www.epicproduct.engineer',
			horizontal: true,
			...epicProductImage,
		},
		blogCard: {
			title: 'Epic Product',
			description:
				'Learn product engineering: what should be built, why, and under what constraints.',
			label: 'Product engineering training',
			courseUrl: 'https://www.epicproduct.engineer',
			...epicProductImage,
		},
	},
	{
		id: 'epic-ai',
		promoKeywords: ['ai', 'mcp'],
		homeCard: {
			title: 'Epic AI',
			description: 'Learn to build AI-powered applications.',
			label: 'AI development course',
			lightImageBuilder: images.courseEpicAILight,
			darkImageBuilder: images.courseEpicAIDark,
			courseUrl: 'https://www.epicai.pro',
		},
		coursesCard: {
			title: 'Epic AI',
			description:
				'Learn to architect next-generation, AI-powered applications that are adaptive, context-aware, and deeply personalized using the Model Context Protocol (MCP).',
			label: 'AI development course',
			lightImageBuilder: images.courseEpicAILight,
			darkImageBuilder: images.courseEpicAIDark,
			courseUrl: 'https://www.epicai.pro',
			horizontal: true,
		},
		blogCard: {
			title: 'Epic AI',
			description: 'Learn to build AI-powered applications.',
			label: 'AI development course',
			lightImageBuilder: images.courseEpicAILight,
			darkImageBuilder: images.courseEpicAIDark,
			courseUrl: 'https://www.epicai.pro',
		},
	},
	{
		id: 'epic-web',
		promoKeywords: ['remix'],
		homeCard: {
			title: 'Epic Web',
			description: 'Become a full stack web dev.',
			label: 'Full stack course',
			lightImageBuilder: images.courseEpicWebLight,
			darkImageBuilder: images.courseEpicWebDark,
			courseUrl: 'https://www.epicweb.dev',
		},
		coursesCard: {
			title: 'Epic Web',
			description:
				"The best way to learn how to build Epic, full stack web applications you'll love to work on and your users will love to use.",
			label: 'Full stack course',
			lightImageBuilder: images.courseEpicWebLight,
			darkImageBuilder: images.courseEpicWebDark,
			courseUrl: 'https://www.epicweb.dev',
			horizontal: true,
		},
		blogCard: {
			title: 'Epic Web',
			description: 'Become a full stack web dev.',
			label: 'Full stack course',
			lightImageBuilder: images.courseEpicWebLight,
			darkImageBuilder: images.courseEpicWebDark,
			courseUrl: 'https://www.epicweb.dev',
		},
	},
	{
		id: 'epic-react',
		promoKeywords: ['react'],
		homeCard: {
			title: 'Epic React',
			description: 'The most comprehensive guide for pros.',
			label: 'React course',
			lightImageBuilder: images.courseEpicReact,
			darkImageBuilder: images.courseEpicReactDark,
			courseUrl: 'https://epicreact.dev',
		},
		coursesCard: {
			title: 'Epic React',
			description: 'The most comprehensive guide for pros.',
			label: 'React course',
			lightImageBuilder: images.courseEpicReact,
			darkImageBuilder: images.courseEpicReactDark,
			courseUrl: 'https://epicreact.dev',
		},
		blogCard: {
			title: 'Epic React',
			description: 'Get Really Good at React',
			label: 'React course',
			lightImageBuilder: images.courseEpicReact,
			darkImageBuilder: images.courseEpicReactDark,
			courseUrl: 'https://epicreact.dev',
		},
	},
	{
		id: 'testing-javascript',
		promoKeywords: ['testing'],
		homeCard: {
			title: 'Testing JavaScript',
			description: 'Learn smart, efficient testing methods.',
			label: 'Testing course',
			lightImageBuilder: images.courseTestingJS,
			darkImageBuilder: images.courseTestingJSDark,
			courseUrl: 'https://testingjavascript.com',
		},
		coursesCard: {
			title: 'Testing JavaScript',
			description: 'Learn smart, efficient testing methods.',
			label: 'Testing course',
			lightImageBuilder: images.courseTestingJS,
			darkImageBuilder: images.courseTestingJSDark,
			courseUrl: 'https://testingjavascript.com',
		},
		blogCard: {
			title: 'Testing JavaScript',
			description: 'Ship Apps with Confidence',
			label: 'Testing course',
			lightImageBuilder: images.courseTestingJS,
			darkImageBuilder: images.courseTestingJSDark,
			courseUrl: 'https://testingjavascript.com',
		},
	},
] satisfies Array<FlagshipProduct>

function getMatchingFlagshipProducts(keywords: Array<string>) {
	const normalizedKeywords = new Set(
		keywords.map((keyword) => keyword.toLowerCase()),
	)

	return flagshipProducts.filter((product) =>
		product.promoKeywords.some((keyword) =>
			normalizedKeywords.has(keyword.toLowerCase()),
		),
	)
}

export { flagshipProducts, getMatchingFlagshipProducts }
export type { FlagshipProduct }
