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
			<Grid className="!grid-cols-12 gap-6 @container/grid md:gap-6 xl:gap-8">
				<div className="col-span-full @container">
					<CourseCard
						title="Epic AI"
						description="Learn to build AI-powered applications."
						label="AI development course"
						lightImageBuilder={images.courseEpicAILight}
						darkImageBuilder={images.courseEpicAIDark}
						courseUrl="https://www.epicai.pro"
						horizontal
					/>
				</div>

				<div className="col-span-full @container @2xl:col-span-6">
					<CourseCard
						title="Epic Web"
						description="Become a full stack web dev."
						label="Full stack course"
						lightImageBuilder={images.courseEpicWebLight}
						darkImageBuilder={images.courseEpicWebDark}
						courseUrl="https://www.epicweb.dev"
					/>
				</div>

				<div className="col-span-full @container @2xl:col-span-6">
					<CourseCard
						title="Epic React"
						description="The most comprehensive guide for pros."
						label="React course"
						lightImageBuilder={images.courseEpicReact}
						darkImageBuilder={images.courseEpicReactDark}
						courseUrl="https://epicreact.dev"
					/>
				</div>

				<div className="col-span-full @container @2xl:col-span-6">
					<CourseCard
						title="Testing JavaScript"
						description="Learn smart, efficient testing methods."
						label="Testing course"
						lightImageBuilder={images.courseTestingJS}
						darkImageBuilder={images.courseTestingJSDark}
						courseUrl="https://testingjavascript.com"
					/>
				</div>
			</Grid>
		</>
	)
}

export { CourseSection }
