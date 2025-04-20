import { images } from '#app/images.tsx'
import { CourseCard } from '../course-card.tsx'
import { Grid } from '../grid.tsx'
import { HeaderSection } from './header-section.tsx'

function CourseSection() {
	return (
		<>
			<HeaderSection
				title="Are you ready to level up?"
				subTitle="Checkout some of my courses"
				cta="See all courses"
				ctaUrl="/courses"
				className="mb-16"
			/>
			<Grid className="gap-6">
				<div className="col-span-full">
					<CourseCard
						title="Epic Web"
						description="Become a full stack web dev."
						label="Full stack course"
						// this swap is intentional. The dark looks nicer on light and vice versa
						darkImageBuilder={images.courseEpicWebLight}
						lightImageBuilder={images.courseEpicWebDark}
						courseUrl="https://www.epicweb.dev"
						horizontal
					/>
				</div>

				<div className="col-span-full lg:col-span-6">
					<CourseCard
						title="Epic React"
						description="The most comprehensive guide for pros."
						label="React course"
						imageBuilder={images.courseEpicReact}
						imageClassName="h-[82%]"
						courseUrl="https://epicreact.dev"
					/>
				</div>

				<div className="col-span-full lg:col-span-6">
					<CourseCard
						title="Testing JavaScript"
						description="Learn smart, efficient testing methods."
						label="Testing course"
						imageBuilder={images.courseTestingJS}
						imageClassName="h-[86%] -translate-y-[13%]"
						courseUrl="https://testingjavascript.com"
					/>
				</div>
			</Grid>
		</>
	)
}

export { CourseSection }
