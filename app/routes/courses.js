"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.meta = exports.headers = void 0;
exports.loader = loader;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var arrow_button_tsx_1 = require("#app/components/arrow-button.tsx");
var course_card_tsx_1 = require("#app/components/course-card.tsx");
var grid_tsx_1 = require("#app/components/grid.tsx");
var hero_section_tsx_1 = require("#app/components/sections/hero-section.tsx");
var testimonial_section_tsx_1 = require("#app/components/sections/testimonial-section.tsx");
var spacer_tsx_1 = require("#app/components/spacer.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var images_tsx_1 = require("#app/images.tsx");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var seo_ts_1 = require("#app/utils/seo.ts");
var testimonials_server_ts_1 = require("#app/utils/testimonials.server.ts");
var timing_server_ts_1 = require("#app/utils/timing.server.ts");
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var timings, testimonials;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    timings = {};
                    return [4 /*yield*/, (0, testimonials_server_ts_1.getTestimonials)({
                            timings: timings,
                            request: request,
                            categories: ['courses', 'teaching'],
                        })];
                case 1:
                    testimonials = _c.sent();
                    return [2 /*return*/, (0, node_1.json)({ testimonials: testimonials }, {
                            headers: {
                                'Cache-Control': 'public, max-age=3600',
                                'Server-Timing': (0, timing_server_ts_1.getServerTimeHeader)(timings),
                            },
                        })];
            }
        });
    });
}
exports.headers = misc_tsx_1.reuseUsefulLoaderHeaders;
var meta = function (_a) {
    var _b;
    var matches = _a.matches;
    var requestInfo = (_b = matches.find(function (m) { return m.id === 'root'; })) === null || _b === void 0 ? void 0 : _b.data.requestInfo;
    return (0, seo_ts_1.getSocialMetas)({
        title: 'Courses by Kent C. Dodds',
        description: 'Get really good at making software with Kent C. Dodds',
        url: (0, misc_tsx_1.getUrl)(requestInfo),
        image: (0, images_tsx_1.getGenericSocialImage)({
            url: (0, misc_tsx_1.getDisplayUrl)(requestInfo),
            featuredImage: images_tsx_1.images.onewheel.id,
            words: "Level up your skills with self-paced courses from Kent C. Dodds",
        }),
    });
};
exports.meta = meta;
function CoursesHome() {
    var data = (0, react_1.useLoaderData)();
    return (<>
			<hero_section_tsx_1.HeroSection title="Level up as a developer." subtitle="Invest in yourself with a premium dev course." imageBuilder={images_tsx_1.images.onewheel}/>

			<grid_tsx_1.Grid as="main" className="mb-48">
				<div className="col-span-full mb-12 hidden lg:col-span-4 lg:mb-0 lg:block">
					<typography_tsx_1.H6 as="h2">{"Reasons to invest in yourself"}</typography_tsx_1.H6>
				</div>
				<div className="col-span-full mb-8 lg:col-span-4 lg:mb-20">
					<typography_tsx_1.H6 as="h3" className="mb-4">
						{"Become a more confident developer"}
					</typography_tsx_1.H6>
					<typography_tsx_1.Paragraph className="mb-20">
						{"\n              All of us are familiar with the feeling of stumbling around\n              between YouTube videos, blog posts, and documentation just\n              copy/pasting code and hoping it'll work. It's frustrating and\n              unproductive. With these courses, you'll have the confidence you\n              need to skip all that stumbling and start shipping. Coding is\n            "}
						<strong>more fun</strong>
						{" this way, trust me \uD83E\uDD73"}
					</typography_tsx_1.Paragraph>
					<typography_tsx_1.H6 as="h3" className="mb-4">
						{"Earn more money as a developer"}
					</typography_tsx_1.H6>
					<typography_tsx_1.Paragraph>
						{"\n              The more skilled you are, the more you can get done and the more\n              value you can provide to your employer and clients. If you don't\n              think that comes with a bump in pay, ask the thousands of other\n              devs who have experienced exactly this as a result of what they\n              learned in these courses. Get that money \uD83E\uDD11\n            "}
					</typography_tsx_1.Paragraph>
				</div>
				<div className="col-span-2 col-start-11 hidden items-start justify-end lg:flex">
					<arrow_button_tsx_1.ArrowLink to="#courses" direction="down"/>
				</div>
			</grid_tsx_1.Grid>

			<h2 className="sr-only" id="courses">
				Courses
			</h2>

			<grid_tsx_1.Grid className="!grid-cols-12 gap-6 @container/grid md:gap-6 xl:gap-8">
				<div className="col-span-full @container @2xl:col-span-6">
					<course_card_tsx_1.CourseCard title="Epic AI" description="Learn to architect next-generation, AI-powered applications that are adaptive, context-aware, and deeply personalized using the Model Context Protocol (MCP)." label="AI development course" lightImageBuilder={images_tsx_1.images.courseEpicAILight} darkImageBuilder={images_tsx_1.images.courseEpicAIDark} courseUrl="https://www.epicai.pro" horizontal/>
				</div>
				<div className="col-span-full @container @2xl:col-span-6">
					<course_card_tsx_1.CourseCard title="Epic Web" description="The best way to learn how to build Epic, full stack web applications you'll love to work on and your users will love to use." label="Full stack course" lightImageBuilder={images_tsx_1.images.courseEpicWebLight} darkImageBuilder={images_tsx_1.images.courseEpicWebDark} courseUrl="https://www.epicweb.dev" horizontal/>
				</div>
				<div className="col-span-full @container @2xl:col-span-6">
					<course_card_tsx_1.CourseCard title="Epic React" description="The most comprehensive guide for pros." label="React course" lightImageBuilder={images_tsx_1.images.courseEpicReact} darkImageBuilder={images_tsx_1.images.courseEpicReactDark} courseUrl="https://epicreact.dev"/>
				</div>

				<div className="col-span-full @container @2xl:col-span-6 lg:mt-0">
					<course_card_tsx_1.CourseCard title="Testing JavaScript" description="Learn smart, efficient testing methods." label="Testing course" lightImageBuilder={images_tsx_1.images.courseTestingJS} darkImageBuilder={images_tsx_1.images.courseTestingJSDark} courseUrl="https://testingjavascript.com"/>
				</div>

				<course_card_tsx_1.SmallCourseCard title="Advanced Remix" description="Remix is a terrific tool for building simple websites and even better for building complex web applications. Remix solves many problems in modern web development. You don't even think about server cache management or global CSS namespace clashes. It's not that Remix has APIs to avoid these problems; they simply don't exist when you're using Remix!" imageBuilder={images_tsx_1.images.courseFEMAdvancedRemix} courseUrl="https://frontendmasters.com/courses/advanced-remix/"/>
				<course_card_tsx_1.SmallCourseCard title="Remix Fundamentals" description="Remix is a fullstack web framework that enables you to deliver a fast, slick, and resilient user experience. With Remix, you can build both static websites and dynamic web apps (requiring user data) while embracing the web platform's standard APIs along the way! Ready to build web apps faster?" imageBuilder={images_tsx_1.images.courseFEMRemixFundamentals} courseUrl="https://frontendmasters.com/courses/remix/"/>
				<course_card_tsx_1.SmallCourseCard title="Up and Running with Remix" description="Jump in feet first and learn the most productive way to build a web application with the web framework that offers the best UX and DX the web has to offer." imageBuilder={images_tsx_1.images.courseUpAndRunningWithRemix} courseUrl="https://egghead.io/courses/up-and-running-with-remix-b82b6bb6?af=5236ad"/>
				<course_card_tsx_1.SmallCourseCard title="The Beginner's Guide to React" description="This course is for React newbies and anyone looking to build a solid foundation. It's designed to teach you everything you need to start building web applications in React right away." imageBuilder={images_tsx_1.images.courseTheBeginnersGuideToReact} courseUrl="https://egghead.io/courses/the-beginner-s-guide-to-react?af=5236ad"/>
				<course_card_tsx_1.SmallCourseCard title="Use Suspense to Simplify Your Async UI" description="In this course, I teach how Suspense works under the hood, preparing you for the future of asynchronous state management in React." imageBuilder={images_tsx_1.images.courseUseSuspenseToSimplifyYourAsyncUI} courseUrl="https://egghead.io/courses/use-suspense-to-simplify-your-async-ui?af=5236ad"/>
				<course_card_tsx_1.SmallCourseCard title="Simplify React Apps with React Hooks" description="In this course, I will take a modern React codebase that uses classes and refactor the entire thing to use function components as much as possible. We'll look at state, side effects, async code, caching, and more!" imageBuilder={images_tsx_1.images.courseSimplifyReactAppsWithReactHooks} courseUrl="https://egghead.io/courses/simplify-react-apps-with-react-hooks?af=5236ad"/>
				<course_card_tsx_1.SmallCourseCard title="Advanced React Component Patterns" description="Once you've nailed the fundamentals of React, that's when things get really fun. This course teaches you advanced patterns in React that you can use to make components that are simple, flexible, and enjoyable to work with." imageBuilder={images_tsx_1.images.courseAdvancedReactComponentPatterns} courseUrl="https://egghead.io/courses/advanced-react-component-patterns?af=5236ad"/>
				<course_card_tsx_1.SmallCourseCard title="JavaScript Testing Practices and Principles" description="Learn the principles and best practices for writing maintainable test applications to catch errors before your product reaches the end user!" imageBuilder={images_tsx_1.images.courseTestingPrinciples} courseUrl="https://frontendmasters.com/courses/testing-practices-principles/"/>
				<course_card_tsx_1.SmallCourseCard title="Testing React Applications" description="Fix errors before your app reaches the end user by writing maintainable unit test & integration tests for your React applications!" imageBuilder={images_tsx_1.images.courseTestingReact} courseUrl="https://frontendmasters.com/courses/testing-react/"/>
				<course_card_tsx_1.SmallCourseCard title="Code Transformation & Linting with ASTs" description="Learn to use Abstract Syntax Trees (ASTs) to make stylistic code changes, reveal logical problems, and prevent bugs from entering your codebase." imageBuilder={images_tsx_1.images.courseAsts} courseUrl="https://frontendmasters.com/courses/linting-asts/"/>
				<course_card_tsx_1.SmallCourseCard title="How to Write an Open Source JavaScript Library" description="From Github and npm, to releasing beta versions, semantic versioning, code coverage, continuous integration, and providing your library with a solid set of unit tests, there are a ton of things to learn. This series will guide you through a set of steps to publish a JavaScript open source library." imageBuilder={images_tsx_1.images.courseHowToWriteAnOpenSourceJavaScriptLibrary} courseUrl="https://egghead.io/courses/how-to-write-an-open-source-javascript-library?af=5236ad"/>
				<course_card_tsx_1.SmallCourseCard title="How to Contribute to an Open Source Project on GitHub" imageBuilder={images_tsx_1.images.courseHowToContributeToAnOpenSourceProjectOnGitHub} courseUrl="https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github?af=5236ad" description="“Feel free to submit a PR!” - words often found in GitHub issues, but met with confusion and fear by many. Getting started with contributing open source is not always straightforward and can be tricky. With this series, you'll be equipped with the the tools, knowledge, and understanding you need to be productive and contribute to the wonderful world of open source projects."/>
			</grid_tsx_1.Grid>

			{data.testimonials.length ? <spacer_tsx_1.Spacer size="base"/> : null}

			<testimonial_section_tsx_1.TestimonialSection testimonials={data.testimonials}/>

			<spacer_tsx_1.Spacer size="base"/>

			<grid_tsx_1.Grid>
				<div className="col-span-full lg:col-span-5">
					<div className="col-span-full mb-12 px-10 lg:col-span-5 lg:col-start-1 lg:mb-0">
						<img loading="lazy" {...(0, images_tsx_1.getImgProps)(images_tsx_1.images.helmet, {
        className: 'object-contain',
        widths: [420, 512, 840, 1260, 1024, 1680, 2520],
        sizes: [
            '(max-width: 1023px) 80vw',
            '(min-width: 1024px) and (max-width: 1620px) 40vw',
            '630px',
        ],
    })}/>
					</div>
				</div>

				<div className="col-span-full mt-4 lg:col-span-6 lg:col-start-7 lg:mt-0">
					<typography_tsx_1.H2 as="p" className="mb-8">
						{"Do you want to work through one of these courses with peers?"}
					</typography_tsx_1.H2>
					<typography_tsx_1.H2 variant="secondary" as="p" className="mb-16">
						{"Check out our discord where we have "}
						<react_1.Link className="underline" to="/clubs">
							learning clubs
						</react_1.Link>
						{"."}
					</typography_tsx_1.H2>
					<arrow_button_tsx_1.ArrowLink to="/discord">{"Learn more about the discord"}</arrow_button_tsx_1.ArrowLink>
				</div>
			</grid_tsx_1.Grid>
		</>);
}
exports.default = CoursesHome;
