"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseSection = CourseSection;
var images_tsx_1 = require("#app/images.tsx");
var course_card_tsx_1 = require("../course-card.tsx");
var grid_tsx_1 = require("../grid.tsx");
var header_section_tsx_1 = require("./header-section.tsx");
function CourseSection() {
    return (<>
			<header_section_tsx_1.HeaderSection title="Are you ready to level up?" subTitle="Checkout some of my courses" cta="See all courses" ctaUrl="/courses" className="mb-16"/>
			<grid_tsx_1.Grid className="!grid-cols-12 gap-6 @container/grid md:gap-6 xl:gap-8">
				<div className="col-span-full @container">
					<course_card_tsx_1.CourseCard title="Epic Web" description="Become a full stack web dev." label="Full stack course" lightImageBuilder={images_tsx_1.images.courseEpicWebLight} darkImageBuilder={images_tsx_1.images.courseEpicWebDark} courseUrl="https://www.epicweb.dev" horizontal/>
				</div>

				<div className="col-span-full @container @2xl:col-span-6">
					<course_card_tsx_1.CourseCard title="Epic React" description="The most comprehensive guide for pros." label="React course" lightImageBuilder={images_tsx_1.images.courseEpicReact} darkImageBuilder={images_tsx_1.images.courseEpicReactDark} courseUrl="https://epicreact.dev"/>
				</div>

				<div className="col-span-full @container @2xl:col-span-6">
					<course_card_tsx_1.CourseCard title="Testing JavaScript" description="Learn smart, efficient testing methods." label="Testing course" lightImageBuilder={images_tsx_1.images.courseTestingJS} darkImageBuilder={images_tsx_1.images.courseTestingJSDark} courseUrl="https://testingjavascript.com"/>
				</div>
			</grid_tsx_1.Grid>
		</>);
}
