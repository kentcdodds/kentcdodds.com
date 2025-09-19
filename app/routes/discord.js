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
exports.default = Discord;
exports.ErrorBoundary = ErrorBoundary;
var accordion_1 = require("@reach/accordion");
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var framer_motion_1 = require("framer-motion");
var button_tsx_1 = require("#app/components/button.tsx");
var feature_card_tsx_1 = require("#app/components/feature-card.tsx");
var grid_tsx_1 = require("#app/components/grid.tsx");
var icons_tsx_1 = require("#app/components/icons.tsx");
var course_section_tsx_1 = require("#app/components/sections/course-section.tsx");
var header_section_tsx_1 = require("#app/components/sections/header-section.tsx");
var hero_section_tsx_1 = require("#app/components/sections/hero-section.tsx");
var testimonial_section_tsx_1 = require("#app/components/sections/testimonial-section.tsx");
var spacer_tsx_1 = require("#app/components/spacer.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var external_links_tsx_1 = require("#app/external-links.tsx");
var images_tsx_1 = require("#app/images.tsx");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var seo_ts_1 = require("#app/utils/seo.ts");
var testimonials_server_ts_1 = require("#app/utils/testimonials.server.ts");
var timing_server_ts_1 = require("#app/utils/timing.server.ts");
var use_root_data_ts_1 = require("#app/utils/use-root-data.ts");
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var timings, testimonials;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    timings = {};
                    return [4 /*yield*/, (0, testimonials_server_ts_1.getTestimonials)({
                            request: request,
                            timings: timings,
                            subjects: ['Discord Community'],
                            categories: ['community'],
                        })];
                case 1:
                    testimonials = _c.sent();
                    return [2 /*return*/, (0, node_1.json)({ testimonials: testimonials }, {
                            headers: {
                                'Cache-Control': 'public, max-age=3600',
                                Vary: 'Cookie',
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
        title: 'The Epic Web Community on Discord',
        description: 'Make friends, share ideas, connect, network, and improve yourself in the Epic Web Community on Discord',
        url: (0, misc_tsx_1.getUrl)(requestInfo),
        image: (0, images_tsx_1.getGenericSocialImage)({
            url: (0, misc_tsx_1.getDisplayUrl)(requestInfo),
            featuredImage: images_tsx_1.images.helmet.id,
            words: "Join the Epic Web Community on Discord",
        }),
    });
};
exports.meta = meta;
function CategoryCardContent(_a) {
    var title = _a.title, description = _a.description, number = _a.number;
    var isExpanded = (0, accordion_1.useAccordionItemContext)().isExpanded;
    return (<>
			<typography_tsx_1.H5 as="div" className="text-primary w-full transition">
				<accordion_1.AccordionButton className="relative w-full text-left focus:outline-none">
					<div className="absolute -bottom-12 -left-8 -right-8 -top-12 rounded-lg lg:-left-28 lg:-right-20"/>

					<span className="absolute -left-16 top-0 hidden text-lg lg:block">
						{number.toString().padStart(2, '0')}.
					</span>

					<span>{title}</span>

					<span className="absolute right-0 top-1 lg:-right-8">
						<svg width="24" height="24" fill="none" viewBox="0 0 24 24">
							<framer_motion_1.motion.path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 5.75V18.25" animate={{ scaleY: isExpanded ? 0 : 1 }}/>
							<path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18.25 12L5.75 12"/>
						</svg>
					</span>
				</accordion_1.AccordionButton>
			</typography_tsx_1.H5>

			<accordion_1.AccordionPanel as={framer_motion_1.motion.div} className="block overflow-hidden" initial={false} animate={isExpanded
            ? { opacity: 1, height: 'auto' }
            : { opacity: 0, height: 0 }}>
				<typography_tsx_1.Paragraph className="mt-4 lg:mt-12">{description}</typography_tsx_1.Paragraph>
			</accordion_1.AccordionPanel>
		</>);
}
function CategoryCard(props) {
    return (<accordion_1.AccordionItem className="bg-secondary hover:bg-alt focus-within:bg-alt col-span-full flex w-full flex-col items-start rounded-lg px-8 py-12 transition lg:col-span-6 lg:pl-28 lg:pr-20">
			<CategoryCardContent {...props}/>
		</accordion_1.AccordionItem>);
}
function Discord() {
    var data = (0, react_1.useLoaderData)();
    var _a = (0, use_root_data_ts_1.useRootData)(), requestInfo = _a.requestInfo, user = _a.user;
    var authorizeURL = user
        ? (0, misc_tsx_1.getDiscordAuthorizeURL)(requestInfo.origin)
        : external_links_tsx_1.externalLinks.discord;
    return (<>
			<hero_section_tsx_1.HeroSection title={<>
						<icons_tsx_1.DiscordLogo />
						{"Make friends on our discord server."}
					</>} subtitle="Learn to become better developers together." imageBuilder={images_tsx_1.images.helmet} arrowUrl="#reasons-to-join" arrowLabel="Is this something for me?" action={<react_1.Outlet />}/>
			<main>
				<grid_tsx_1.Grid className="mb-24 lg:mb-64">
					<div className="col-span-full lg:col-span-6 lg:col-start-1">
						<div className="mb-12 aspect-[4/6] lg:mb-0">
							<img {...(0, images_tsx_1.getImgProps)(images_tsx_1.images.kentListeningAtReactRally, {
        className: 'rounded-lg object-cover',
        widths: [410, 650, 820, 1230, 1640, 2460],
        sizes: [
            '(max-width: 1023px) 80vw',
            '(min-width:1024px) and (max-width:1620px) 40vw',
            '630px',
        ],
        transformations: {
            resize: {
                type: 'fill',
                aspectRatio: '3:4',
            },
        },
    })}/>
						</div>
					</div>

					<div className="col-span-full lg:col-span-5 lg:col-start-8 lg:row-start-1">
						<typography_tsx_1.H2 id="reasons-to-join" className="mb-10">
							{"Here's why you should join the server."}
						</typography_tsx_1.H2>

						<button_tsx_1.ButtonLink className="mb-32" variant="primary" href={authorizeURL}>
							Join Discord
						</button_tsx_1.ButtonLink>

						<typography_tsx_1.H6 as="h3" className="mb-4">
							{"What is it?"}
						</typography_tsx_1.H6>
						<typography_tsx_1.Paragraph className="mb-12">
							{"\n                Discord is a chat application. The Epic Web Community on Discord is\n                a community of people who want to make connections, share ideas,\n                and use software to help make the world a better place.\n              "}
						</typography_tsx_1.Paragraph>
						<typography_tsx_1.H6 as="h3" className="mb-4">
							{"Make connections and friends"}
						</typography_tsx_1.H6>
						<typography_tsx_1.Paragraph className="mb-12">
							{"\n                We're better when we work together. Discord allows us to have\n                meaningful and nuanced conversations about building software.\n                If you want to ask questions or provide your own opinions, this\n                discord community is for you. We'll celebrate your successes and\n                lament your misfortunes and failures. This community is focused\n                on software development primarily, but we're humans and we\n                embrace that (we even have a channel on parenting!).\n              "}
						</typography_tsx_1.Paragraph>
						<typography_tsx_1.H6 as="h3" className="mb-4">
							{"Share ideas"}
						</typography_tsx_1.H6>
						<typography_tsx_1.Paragraph className="mb-12">
							{"\n                This community is a fantastic place to get and provide feedback\n                on fun and interesting ideas. We're all motivated to use\n                software to make the world better in a wide variety of ways.\n                Got a project you've been working on? Want to discover\n                facinating ways people are using software? This is the place to\n                be.\n              "}
						</typography_tsx_1.Paragraph>
					</div>
				</grid_tsx_1.Grid>

				<grid_tsx_1.Grid className="mb-24 lg:mb-48">
					<div className="col-span-full">
						<typography_tsx_1.H2 className="mb-3 lg:mt-6">
							{"Not sure what to expect from the discord?"}
						</typography_tsx_1.H2>
						<typography_tsx_1.H2 as="p" variant="secondary" className="mb-14">
							{"Here are some features for you at a glance."}
						</typography_tsx_1.H2>
					</div>

					<div className="col-span-full">
						<grid_tsx_1.Grid rowGap nested>
							<div className="col-span-full lg:col-span-4">
								<feature_card_tsx_1.FeatureCard title="High quality people" description="Our onboarding process, enforced code of conduct, and fantastic moderators keep it a friendly place to be." icon={<icons_tsx_1.HeartIcon size={48}/>}/>
							</div>
							<div className="col-span-full lg:col-span-4">
								<feature_card_tsx_1.FeatureCard title="Learning clubs" description="Form study groups and learn better together." icon={<icons_tsx_1.UsersIcon size={48}/>}/>
							</div>
							<div className="col-span-full lg:col-span-4">
								<feature_card_tsx_1.FeatureCard title="Meetups" description="Discord-bot facilitated feature to plan virtual events (like streams) and connect with other devs." icon={<icons_tsx_1.CodeIcon size={48}/>}/>
							</div>

							<div className="col-span-full lg:col-span-4">
								<feature_card_tsx_1.FeatureCard title="Software Channels" description="Channels on popular topics like frontend, backend, career, and more." icon={<icons_tsx_1.LaptopIcon size={48}/>}/>
							</div>
							<div className="col-span-full lg:col-span-4">
								<feature_card_tsx_1.FeatureCard title="Life Channels" description="We're not robots. We're people. And we have kids, pets, and money. Channels for those and more." icon={<icons_tsx_1.EmojiHappyIcon size={48}/>}/>
							</div>
							<div className="col-span-full lg:col-span-4">
								<feature_card_tsx_1.FeatureCard title="Jobs channel" description="Looking for work or an engineer? You wouldn't be the first to start an employment relationship here." icon={<icons_tsx_1.BriefcaseIcon size={48}/>}/>
							</div>
							<div className="col-span-full lg:col-span-4">
								<feature_card_tsx_1.FeatureCard title="EpicReact.dev Channels" description="There's a channel for each of the workshops in EpicReact.dev so you can get/give a hand when you get stuck." icon={<icons_tsx_1.RocketIcon size={48}/>}/>
							</div>
							<div className="col-span-full lg:col-span-4">
								<feature_card_tsx_1.FeatureCard title="TestingJavaScript.com Channels" description="Leveling up your testing experience? Sweet! Get and give help in these channels." icon={<icons_tsx_1.TrophyIcon size={48}/>}/>
							</div>
							<div className="col-span-full lg:col-span-4">
								<feature_card_tsx_1.FeatureCard title="Team Channels" description={user
            ? "As a member of the ".concat(user.team.toLocaleLowerCase(), " team, connect your discord account and you'll get access to the exclusive ").concat(user.team.toLocaleLowerCase(), " team channels.")
            : 'Sign up for an account on kentcdodds.com and connect your discord account to get access to the exclusive team channels.'} icon={<icons_tsx_1.MessageIcon size={48}/>}/>
							</div>
						</grid_tsx_1.Grid>
					</div>
				</grid_tsx_1.Grid>

				<grid_tsx_1.Grid className="mb-24 lg:mb-64">
					<div className="col-span-full mb-12 hidden lg:col-span-4 lg:mb-0 lg:block">
						<typography_tsx_1.H6 as="h2">{"Set up your own learning club."}</typography_tsx_1.H6>
					</div>
					<div className="col-span-full mb-20 lg:col-span-8 lg:mb-28">
						<typography_tsx_1.H2 as="p" className="mb-3">
							{"\n                KCD Learning Clubs are like study groups you put together yourself.\n              "}
						</typography_tsx_1.H2>
						<typography_tsx_1.H2 as="p" variant="secondary">
							{"\n                Having a group of people with the same challenges will help you\n                learn faster. The discord bot can help you find them.\n              "}
						</typography_tsx_1.H2>
					</div>
					<div className="col-span-full lg:col-span-4 lg:col-start-5 lg:pr-12">
						<typography_tsx_1.H6 as="h3" className="mb-4">
							{"When we learn together, we learn better, and that's the idea."}
						</typography_tsx_1.H6>
						<typography_tsx_1.Paragraph className="mb-16">
							{"\n                Research has shown that learning is more effective when you have\n                a group of people to hold you accountable. It's also more fun\n                and less frustrating when you can help each other.\n              "}
						</typography_tsx_1.Paragraph>

						<typography_tsx_1.H6 as="h3" className="mb-4">
							{"You can choose anything as your learning club topic."}
						</typography_tsx_1.H6>
						<typography_tsx_1.Paragraph className="mb-16">
							{"\n                A learning club can be about anything. All that's really\n                required is some sort of curriculum or schedule to keep everyone\n                focused on the same goal. So you can definitely choose one of\n                my courses, but you could also choose something completely\n                unrelated to software. The bot doesn't care and nobody's had\n                trouble filling their learning club with interested members yet!\n              "}
						</typography_tsx_1.Paragraph>
					</div>
					<div className="col-span-full lg:col-span-4 lg:col-start-9 lg:pr-12">
						<typography_tsx_1.H6 as="h3" className="mb-4">
							{"Develop friendships with other nice learners in the community."}
						</typography_tsx_1.H6>
						<typography_tsx_1.Paragraph className="mb-16">
							{"\n                The Epic Web Community on Discord is full of friendly people. When\n                you put together a learning club here, in addition to learning\n                better, you'll develop new friendships.\n              "}
						</typography_tsx_1.Paragraph>

						<typography_tsx_1.H6 as="h3" className="mb-4">
							{"You have access to me (Kent) during weekly office hours."}
						</typography_tsx_1.H6>
						<typography_tsx_1.Paragraph className="mb-16">
							{"\n                By joining the Epic Web Community on Discord, you can ask questions\n                that I'll answer during office hours. Often these questions come\n                from discussions you and your fellow learners have during your\n                learning club meetings. So if you all get stuck on the same\n                thing, I'm there to help you get unstuck.\n              "}
						</typography_tsx_1.Paragraph>
					</div>
				</grid_tsx_1.Grid>

				{data.testimonials.length ? <spacer_tsx_1.Spacer size="base"/> : null}

				<testimonial_section_tsx_1.TestimonialSection testimonials={data.testimonials}/>

				<spacer_tsx_1.Spacer size="base"/>

				<header_section_tsx_1.HeaderSection title="Here's a quick look at all categories." subTitle="Click on any category to get more info." className="mb-14"/>

				<grid_tsx_1.Grid className="mb-24 lg:mb-64">
					<accordion_1.Accordion collapsible multiple className="col-span-full mb-4 space-y-4 lg:col-span-6 lg:mb-0 lg:space-y-6">
						<CategoryCard number={1} title="Welcome" description="A place to introduce yourself, read the rules, talk to the bot, and get tips about the server"/>
						<CategoryCard number={2} title="KCD" description="All the stuff I'm up to goes here. You might consider adding special notification settings to the announcements channel so you don't miss anything important."/>
						<CategoryCard number={3} title="Epic Web Conf" description="This is where we discuss stuff going on with Epic Web Conference!"/>
						<CategoryCard number={4} title="Epic Stack" description="Talk with others who are buildings applications using the Epic Stack."/>
					</accordion_1.Accordion>
					<accordion_1.Accordion collapsible multiple className="col-span-full space-y-4 lg:col-span-6 lg:space-y-6">
						<CategoryCard number={5} title="Tech" description={"Need to talk software? That's what this category is for. We've got your whole tech stack covered here (and if we're missing anything, that's what \"general\" is for \uD83D\uDE05). And you've got career related topics here too."}/>
						<CategoryCard number={6} title="Life" description={"We're not automatons \"turning coffee into code\" \uD83D\uDE44. We're humans with lives, families, pets, preferences, money decisions, and joys. So we've got a channel to talk about that stuff."}/>
						<CategoryCard number={7} title="Courses" description="Exclusive channels for folks going through the Epic Web Courses. Ask and answer questions, share your progress, and get help from others."/>
						<CategoryCard number={8} title="Clubs" description="Here's where you can coordinate setting up a new KCD Learning Club. Club captains also get access to a special channel for captains to talk about how to make the most of the experience for everyone."/>
					</accordion_1.Accordion>
				</grid_tsx_1.Grid>

				<grid_tsx_1.Grid className="mb-24 lg:mb-64">
					<div className="col-span-full lg:col-span-4 lg:col-start-2">
						<img {...(0, images_tsx_1.getImgProps)(images_tsx_1.images.helmet, {
        className: 'object-contain',
        widths: [420, 512, 840, 1260, 1024, 1680, 2520],
        sizes: [
            '(max-width: 1023px) 80vw',
            '(min-width: 1024px) and (max-width: 1620px) 40vw',
            '630px',
        ],
    })}/>
					</div>

					<div className="col-span-full mt-4 lg:col-span-6 lg:col-start-7 lg:mt-0">
						<typography_tsx_1.H2 className="mb-8">
							{"Life is better with friends. Find them on discord."}
						</typography_tsx_1.H2>
						<typography_tsx_1.H2 variant="secondary" as="p" className="mb-16">
							{"\n                Click the button below and join the community. Let's get\n                better together.\n              "}
						</typography_tsx_1.H2>
						<button_tsx_1.ButtonLink variant="primary" href={authorizeURL}>
							Join Discord
						</button_tsx_1.ButtonLink>
					</div>
				</grid_tsx_1.Grid>
			</main>

			<course_section_tsx_1.CourseSection />
		</>);
}
function ErrorBoundary() {
    var error = (0, misc_tsx_1.useCapturedRouteError)();
    console.error(error);
    if (error instanceof Error) {
        return (<div>
				<h2>Error</h2>
				<pre>{error.stack}</pre>
			</div>);
    }
    else {
        return <h2>Unknown Error</h2>;
    }
}
