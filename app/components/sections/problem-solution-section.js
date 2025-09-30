"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProblemSolutionSection = ProblemSolutionSection;
var tabs_1 = require("@reach/tabs");
var react_1 = require("@remix-run/react");
var clsx_1 = require("clsx");
var date_fns_1 = require("date-fns");
var framer_motion_1 = require("framer-motion");
var React = require("react");
var images_tsx_1 = require("#app/images.tsx");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var arrow_button_tsx_1 = require("../arrow-button.tsx");
var grid_tsx_1 = require("../grid.tsx");
var icons_tsx_1 = require("../icons.tsx");
var typography_tsx_1 = require("../typography.tsx");
function Tab(_a) {
    var isSelected = _a.isSelected, children = _a.children;
    return (<tabs_1.Tab className={(0, clsx_1.clsx)('hover:text-primary inline-flex w-full items-center border-none p-0 transition focus:bg-transparent', {
            'text-primary': isSelected,
            'text-gray-600 dark:text-slate-500': !isSelected,
        })}>
			<span>{children}</span>
			<framer_motion_1.AnimatePresence>
				{isSelected ? (<framer_motion_1.motion.span className="ml-8 mt-4 hidden h-12 items-center lg:flex" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1, transition: { duration: 0.15 } }} exit={{ x: 20, opacity: 0, transition: { duration: 0.15 } }}>
						<icons_tsx_1.ArrowIcon size={76} direction="right"/>
					</framer_motion_1.motion.span>) : null}
			</framer_motion_1.AnimatePresence>
		</tabs_1.Tab>);
}
function ContentPanel(_a) {
    var children = _a.children, active = _a.active, imageBuilder = _a.imageBuilder;
    return (<tabs_1.TabPanel className="col-start-1 row-start-1 block">
			<framer_motion_1.AnimatePresence>
				{active ? (<>
						<framer_motion_1.motion.img initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ damping: 0, duration: 0.25 }} {...(0, images_tsx_1.getImgProps)(imageBuilder, {
            className: 'mb-6 h-44 lg:mb-14',
            widths: [180, 360, 540],
            sizes: ['11rem'],
        })}/>

						<framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
							{children}
						</framer_motion_1.motion.div>
					</>) : null}
			</framer_motion_1.AnimatePresence>
		</tabs_1.TabPanel>);
}
function ProblemSolutionSection(_a) {
    var blogPostCount = _a.blogPostCount, totalBlogReaders = _a.totalBlogReaders, totalBlogReads = _a.totalBlogReads, currentBlogLeaderTeam = _a.currentBlogLeaderTeam;
    var _b = React.useState(0), activeTabIndex = _b[0], setActiveTabIndex = _b[1];
    return (<tabs_1.Tabs as={grid_tsx_1.Grid} featured onChange={function (index) { return setActiveTabIndex(index); }}>
			<div className="col-span-full lg:col-span-5">
				<typography_tsx_1.H2 className="mb-4 lg:mb-0">
					Having a hard time keeping up with JavaScript?
				</typography_tsx_1.H2>
			</div>
			<div className="col-span-full lg:col-span-5 lg:col-start-7">
				<typography_tsx_1.H2 variant="secondary" as="p">
					{"\n            Well, you're in the right place. My website is your one stop shop\n            for everything you need to build JavaScript apps.\n          "}
				</typography_tsx_1.H2>
			</div>

			<hr className="col-span-full mb-10 mt-16 border-gray-200 dark:border-gray-600 lg:mb-20 lg:mt-24"/>

			<div className="order-1 col-span-full col-start-1 lg:order-3 lg:col-span-5 lg:mt-52 lg:pt-2">
				<tabs_1.TabList className="inline-flex flex-row space-x-8 bg-transparent text-xl leading-snug text-white lg:flex-col lg:space-x-0 lg:text-7xl">
					<Tab>blog</Tab>
					<Tab>courses</Tab>
					<Tab>podcasts</Tab>
				</tabs_1.TabList>
			</div>

			<tabs_1.TabPanels className="order-4 col-span-full mt-16 grid lg:col-span-5 lg:col-start-7 lg:mt-0">
				<ContentPanel active={activeTabIndex === 0} imageBuilder={images_tsx_1.images.skis}>
					<typography_tsx_1.H3>Educational blog</typography_tsx_1.H3>

					<typography_tsx_1.Paragraph className="mt-8">
						{"My "}
						<strong>{blogPostCount}</strong>
						{" blog posts (and counting) have been "}
						<react_1.Link prefetch="intent" to="/teams#read-rankings">
							read
						</react_1.Link>
						{" ".concat(totalBlogReads, " times by ").concat(totalBlogReaders, " people. There you'll find blogs about ")}
						<react_1.Link prefetch="intent" to="/blog?q=javascript">
							JavaScript
						</react_1.Link>
						{", "}
						<react_1.Link prefetch="intent" to="/blog?q=typescript">
							TypeScript
						</react_1.Link>
						{", "}
						<react_1.Link prefetch="intent" to="/blog?q=react">
							React
						</react_1.Link>
						{", "}
						<react_1.Link prefetch="intent" to="/blog?q=testing">
							Testing
						</react_1.Link>
						{", "}
						<react_1.Link prefetch="intent" to="/blog?q=career">
							your career
						</react_1.Link>
						{", "}
						<react_1.Link prefetch="intent" to="/blog">
							and more
						</react_1.Link>
						.
					</typography_tsx_1.Paragraph>
					{currentBlogLeaderTeam ? (<typography_tsx_1.Paragraph prose={false} textColorClassName={misc_tsx_1.teamTextColorClasses[currentBlogLeaderTeam]}>
							{"The "}
							<react_1.Link to="/teams" className={"".concat(misc_tsx_1.teamTextColorClasses[currentBlogLeaderTeam], " underlined")}>
								<strong>{currentBlogLeaderTeam.toLowerCase()}</strong>
							</react_1.Link>
							{" team is winning."}
						</typography_tsx_1.Paragraph>) : null}

					<arrow_button_tsx_1.ArrowLink to="/blog" className="mt-14">
						Start reading the blog
					</arrow_button_tsx_1.ArrowLink>
				</ContentPanel>

				<ContentPanel active={activeTabIndex === 1} imageBuilder={images_tsx_1.images.onewheel}>
					<typography_tsx_1.H3>Courses</typography_tsx_1.H3>

					<typography_tsx_1.Paragraph className="mt-8">
						{"\n              I've been teaching people just like you how to build better\n              software for over ".concat((0, date_fns_1.differenceInYears)(Date.now(), new Date(2014, 0, 0)), "\n              years. Tens of thousands of people have increased their confidence\n              in shipping software with\n            ")}
						<a href="https://testingjavascript.com" className="!text-yellow-500">
							TestingJavaScript.com
						</a>
						{"\n              and even more have improved the performance and maintainability\n              of their React applications from what they've learned from\n            "}
						<a href="https://epicreact.dev" className="!text-blue-500">
							EpicReact.dev
						</a>
						{". My latest efforts are pushing things to the whole stack with "}
						<a href="https://www.epicstack.dev" className="!text-red-500">
							EpicWeb.dev
						</a>
						.
					</typography_tsx_1.Paragraph>

					<arrow_button_tsx_1.ArrowLink to="/courses" className="mt-14">
						Explore the courses
					</arrow_button_tsx_1.ArrowLink>
				</ContentPanel>

				<ContentPanel active={activeTabIndex === 2} imageBuilder={images_tsx_1.images.kayak}>
					<typography_tsx_1.H3>Podcast</typography_tsx_1.H3>

					<typography_tsx_1.Paragraph className="mt-8">
						{"\n              I really enjoy chatting with people about software development and\n              life as a software developer. So I have several podcasts for you\n              to enjoy like\n            "}
						<react_1.Link prefetch="intent" to="/chats">
							Chats with Kent
						</react_1.Link>
						{", "}
						<react_1.Link prefetch="intent" to="/calls">
							Call Kent
						</react_1.Link>
						{", and "}
						<a href="https://epicreact.dev/podcast">
							the EpicReact.dev podcast
						</a>
						.
					</typography_tsx_1.Paragraph>

					<typography_tsx_1.Paragraph>
						{"\n              I've also had the pleasure to be a guest on many other podcasts\n              where I've been able to share my thoughts on webdev. You can find\n              those on my\n            "}
						<react_1.Link prefetch="intent" to="/appearances">
							appearances
						</react_1.Link>
						{" page."}
					</typography_tsx_1.Paragraph>

					<arrow_button_tsx_1.ArrowLink to="/chats" className="mt-14">
						Start listening to chats with Kent
					</arrow_button_tsx_1.ArrowLink>
				</ContentPanel>
			</tabs_1.TabPanels>
		</tabs_1.Tabs>);
}
