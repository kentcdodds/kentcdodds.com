import { CourseCard } from '#app/components/course-card.tsx'
import { flagshipProducts } from '#app/flagship-products.ts'
import { Grid } from '../grid.tsx'
import { HeaderSection } from './header-section.tsx'

function CourseSection() {
	const featuredProduct = flagshipProducts[0]!
	const supportingProducts = flagshipProducts.slice(1)

	return (
		<>
			<HeaderSection
				title="My flagship training"
				subTitle="Start with Epic Product Engineer, then explore the rest of my courses."
				cta="See all courses"
				ctaUrl="/courses"
				className="mb-16"
			/>
			<Grid className="@container/grid grid-cols-12! gap-6 md:gap-6 xl:gap-8">
				<div className="@container col-span-full">
					<CourseCard {...featuredProduct.homeCard} />
				</div>
				{supportingProducts.map((product) => (
					<div
						key={product.id}
						className="@container col-span-full @2xl:col-span-6"
					>
						<CourseCard {...product.homeCard} />
					</div>
				))}
			</Grid>
		</>
	)
}

export { CourseSection }
