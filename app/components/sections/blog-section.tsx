import { clsx } from 'clsx'
import { ArticleCard } from '../article-card.tsx'
import { Grid } from '../grid.tsx'
import { Spacer } from '../spacer.tsx'
import { HeaderSection } from './header-section.tsx'
import { type MdxListItem } from '~/types.ts'

interface BlogSectionProps {
	articles: Array<MdxListItem>
	title: string
	description: string
	showArrowButton?: boolean
}

function BlogSection({
	articles,
	title,
	description,
	showArrowButton = true,
}: BlogSectionProps) {
	if (!articles.length) return null

	return (
		<>
			<HeaderSection
				title={title}
				subTitle={description}
				cta={showArrowButton ? 'See the full blog' : undefined}
				ctaUrl="/blog"
			/>
			<Spacer size="2xs" />
			<Grid className="gap-y-16">
				{articles.slice(0, 3).map((article, idx) => (
					<div
						key={article.slug}
						className={clsx('col-span-4', {
							'hidden lg:block': idx >= 2,
						})}
					>
						<ArticleCard article={article} />
					</div>
				))}
			</Grid>
		</>
	)
}

export { BlogSection }
