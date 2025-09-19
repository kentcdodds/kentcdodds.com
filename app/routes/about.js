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
exports.links = exports.meta = exports.headers = void 0;
exports.loader = loader;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var arrow_button_tsx_1 = require("#app/components/arrow-button.tsx");
var feature_card_tsx_1 = require("#app/components/feature-card.tsx");
var fullscreen_yt_embed_tsx_1 = require("#app/components/fullscreen-yt-embed.tsx");
var grid_tsx_1 = require("#app/components/grid.tsx");
var icons_tsx_1 = require("#app/components/icons.tsx");
var blog_section_tsx_1 = require("#app/components/sections/blog-section.tsx");
var header_section_tsx_1 = require("#app/components/sections/header-section.tsx");
var hero_section_tsx_1 = require("#app/components/sections/hero-section.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var images_tsx_1 = require("#app/images.tsx");
var blog_server_ts_1 = require("#app/utils/blog.server.ts");
var lodash_ts_1 = require("#app/utils/cjs/lodash.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var seo_ts_1 = require("#app/utils/seo.ts");
var talks_server_ts_1 = require("#app/utils/talks.server.ts");
var timing_server_ts_1 = require("#app/utils/timing.server.ts");
var use_root_data_ts_1 = require("#app/utils/use-root-data.ts");
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var timings, talks, _c;
        var _d;
        var request = _b.request;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    timings = {};
                    return [4 /*yield*/, (0, talks_server_ts_1.getTalksAndTags)({ request: request, timings: timings })];
                case 1:
                    talks = (_e.sent()).talks;
                    _c = node_1.json;
                    _d = {};
                    return [4 /*yield*/, (0, blog_server_ts_1.getBlogRecommendations)({ request: request, timings: timings })];
                case 2: return [2 /*return*/, _c.apply(void 0, [(_d.blogRecommendations = _e.sent(),
                            // they're ordered by date, so we'll grab two random of the first 10.
                            _d.talkRecommendations = (0, lodash_ts_1.shuffle)(talks.slice(0, 14)).slice(0, 4),
                            _d), {
                            headers: {
                                'Cache-Control': 'private, max-age=3600',
                                Vary: 'Cookie',
                                'Server-Timing': (0, timing_server_ts_1.getServerTimeHeader)(timings),
                            },
                        }])];
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
        title: 'About Kent C. Dodds',
        description: 'Get to know Kent C. Dodds',
        keywords: 'about, kent, kent c. dodds, kent dodds',
        url: (0, misc_tsx_1.getUrl)(requestInfo),
        image: (0, images_tsx_1.getSocialImageWithPreTitle)({
            url: (0, misc_tsx_1.getDisplayUrl)(requestInfo),
            featuredImage: 'kent/video-stills/snowboard-butter',
            preTitle: 'Get to know',
            title: "Kent C. Dodds",
        }),
    });
};
exports.meta = meta;
var links = function () {
    return (0, fullscreen_yt_embed_tsx_1.links)();
};
exports.links = links;
function AboutIndex() {
    var _a = (0, react_1.useLoaderData)(), blogRecommendations = _a.blogRecommendations, talkRecommendations = _a.talkRecommendations;
    var searchParams = (0, react_1.useSearchParams)()[0];
    var requestInfo = (0, use_root_data_ts_1.useRootData)().requestInfo;
    var permalinkAutoplay = "".concat(requestInfo.origin, "/about?autoplay");
    return (<>
			<hero_section_tsx_1.HeroSection title="Hi, I'm Kent C. Dodds, I'm a full time educator." subtitle="I make the world a better place by teaching people like you how to make quality software." imageBuilder={images_tsx_1.images.snowboard} arrowUrl="#about-me" arrowLabel="Get to know more about me"/>

			<grid_tsx_1.Grid as="main" className="mb-24 mt-16 lg:mb-48">
				<div className="col-span-full">
					<fullscreen_yt_embed_tsx_1.FullScreenYouTubeEmbed autoplay={searchParams.has('autoplay')} img={<img id="about-me" {...(0, images_tsx_1.getImgProps)(images_tsx_1.images.getToKnowKentVideoThumbnail, {
            className: 'rounded-lg object-cover w-full',
            widths: [280, 560, 840, 1100, 1300, 2600, 3900],
            sizes: ['(min-width:1620px) 1280px', '80vw'],
        })}/>} ytLiteEmbed={<fullscreen_yt_embed_tsx_1.LiteYouTubeEmbed id="sxcRxZpUJWo" announce="Watch" title="Get to know Kent C. Dodds" 
        // We don't show the poster, so we use the lowest-res version
        poster="default" params={new URLSearchParams({
                color: 'white',
                playsinline: '0',
                rel: '0',
            }).toString()}/>}/>
					<p className="text-xl text-slate-500">{"Get to know me in this full introduction video (8:05)"}</p>
					<a className="underlined" target="_blank" rel="noreferrer noopener" href={"https://x.com/intent/tweet?".concat(new URLSearchParams({
            url: permalinkAutoplay,
            text: "I just watched @kentcdodds' life flash before my eyes.",
        }))}>
						{"Share this video."}
					</a>
				</div>
			</grid_tsx_1.Grid>

			<grid_tsx_1.Grid className="mb-24 mt-16 lg:mb-48">
				<div className="col-span-full mb-12 lg:col-span-4 lg:mb-0">
					<typography_tsx_1.H6 as="h2">{"How I got where we are now."}</typography_tsx_1.H6>
				</div>
				<div className="col-span-full mb-8 lg:col-span-8 lg:mb-20">
					<typography_tsx_1.H2 as="p" className="mb-8">
						{"I was born in 1988 in Twin Falls, Idaho."}
					</typography_tsx_1.H2>
					<typography_tsx_1.H2 className="mb-12" variant="secondary" as="p">
						{"\n              After graduating High School and serving a 2 year mission in the\n              Missouri Independence Mission for The Church of Jesus Christ of\n              Latter-day Saints, I went to BYU where I graduated with a Master\n              of Science in Information Systems degree in 2014.\n            "}
					</typography_tsx_1.H2>

					<arrow_button_tsx_1.ArrowLink className="mb-16" to="/blog/2010s-decade-in-review">
						{"Read my full story"}
					</arrow_button_tsx_1.ArrowLink>

					<div className="w-full lg:pr-12">
						<img {...(0, images_tsx_1.getImgProps)(images_tsx_1.images.kentWorkingInNature, {
        className: 'w-full rounded-lg object-cover',
        widths: [512, 840, 1024, 1680, 2520],
        sizes: [
            '(max-width: 1023px) 80vw',
            '(min-width: 1024px) and (max-width: 1620px) 50vw',
            '800px',
        ],
    })}/>
					</div>
				</div>

				<typography_tsx_1.Paragraph className="lg:mb:0 col-span-full mb-4 lg:col-span-4 lg:col-start-5 lg:mr-12">
					{"\n            Early on in my career I decided I wanted to be an expert in\n            JavaScript. So I set my mind on mastering the world's most popular\n            programming language. I spent countless hours writing JavaScript\n            for the companies I worked for as well as in the evenings for open\n            source and other side projects. Eventually I even represented PayPal\n            on the TC-39 (the committee responsible for standardizing the\n            JavaScript language). I feel like I achieved my goal of becoming an\n            expert in JavaScript, but I do need to keep up just like everyone\n            else, which is an enjoyable challenge.\n          "}
				</typography_tsx_1.Paragraph>
				<typography_tsx_1.Paragraph className="col-span-full lg:col-span-4 lg:col-start-9 lg:mr-12">
					{"\n            I've also always been excited about sharing what I know with others.\n            When I was in school, I signed up to be a tutor for my classmates\n            and once I even got Firebase to sponsor pizza for me to give an\n            informal workshop about Angular.js to my fellow students. I was a\n            speaker at the first meetup I ever attended, and I've now delivered\n            over a hundred talks on topics including JavaScript, React, Testing,\n            Careers, and more. One of my talks got noticed by egghead and I was\n            invited to turn that talk into an egghead course. The rest is\n            history!\n          "}
				</typography_tsx_1.Paragraph>
			</grid_tsx_1.Grid>

			<grid_tsx_1.Grid className="mb-24 lg:mb-64">
				<div className="col-span-full lg:col-span-6 lg:col-start-7">
					<div className="mb-12 lg:mb-0">
						<img {...(0, images_tsx_1.getImgProps)(images_tsx_1.images.happySnowboarder, {
        className: 'rounded-lg object-cover',
        widths: [512, 650, 840, 1024, 1300, 1680, 2000, 2520],
        sizes: [
            '(max-width: 1023px) 80vw',
            '(min-width: 1024px) and (max-width: 1620px) 40vw',
            '650px',
        ],
        transformations: {
            gravity: 'faces',
            resize: {
                type: 'fill',
                aspectRatio: '3:4',
            },
        },
    })}/>
					</div>
				</div>

				<div className="col-span-full lg:col-span-5 lg:col-start-1 lg:row-start-1">
					<typography_tsx_1.H2 className="mb-10">Here are some of the values I live by.</typography_tsx_1.H2>

					<typography_tsx_1.H6 as="h3" className="mb-4">
						{"Kindness"}
					</typography_tsx_1.H6>
					<typography_tsx_1.Paragraph className="mb-12">
						{"\n              You can be the smartest and most skilled software engineer in the\n              world, but if you're not kind to those with whom you interact,\n              you'll never reach your full potential and you'll always be\n              chasing the next thing to bring you happiness in life. Be kind.\n            "}
					</typography_tsx_1.Paragraph>
					<typography_tsx_1.H6 as="h3" className="mb-4">
						{"Share knowledge"}
					</typography_tsx_1.H6>
					<typography_tsx_1.Paragraph className="mb-12">
						{"\n              One of the biggest things that has helped me learn is by\n              committing myself to sharing what I know with others. Between\n              podcasts, blog posts, talks, and workshops, I force myself into\n              situations where I have to be accountable to those I'm teaching\n              to really know my stuff. And as a result, a lot of people have\n              learned from me as well.\n            "}
					</typography_tsx_1.Paragraph>
					<typography_tsx_1.H6 as="h3" className="mb-4">
						{"Collaborate with others"}
					</typography_tsx_1.H6>
					<typography_tsx_1.Paragraph className="mb-12">
						{"\n              I've worked with a ton of developers in my role as a team member\n              at companies I've worked at as well as in the open source\n              community. I've found it to be invaluable to collaborate well with\n              others. I value giving credit where it is due and celebrating\n              the successes of others with them. We can accomplish much more\n              together than separately.\n            "}
					</typography_tsx_1.Paragraph>
				</div>
			</grid_tsx_1.Grid>

			<header_section_tsx_1.HeaderSection className="mb-16" ctaUrl="/talks" cta="See all talks" title="I do talks all over the world." subTitle="Here are a couple recent ones."/>

			<grid_tsx_1.Grid className="mb-24 gap-5 lg:mb-64">
				<div className="col-span-full mb-12 lg:mb-20">
					<img id="about-me" {...(0, images_tsx_1.getImgProps)(images_tsx_1.images.kentSpeakingAllThingsOpen, {
        className: 'rounded-lg object-cover',
        widths: [280, 560, 840, 1100, 1300, 2600, 3900],
        sizes: ['(min-width:1620px) 1280px', '80vw'],
    })}/>
				</div>
				{talkRecommendations.map(function (talk) {
            var _a;
            return (<div key={talk.slug} className="col-span-full lg:col-span-6">
						<TalkCard tags={talk.tags} dateDisplay={(_a = talk.deliveries[0]) === null || _a === void 0 ? void 0 : _a.dateDisplay} title={talk.title} talkUrl={"/talks/".concat(talk.slug)}/>
					</div>);
        })}
			</grid_tsx_1.Grid>

			<grid_tsx_1.Grid className="mb-24 lg:mb-64">
				<div className="col-span-full lg:col-span-6 lg:col-start-1">
					<div className="mb-12 lg:mb-0">
						<img {...(0, images_tsx_1.getImgProps)(images_tsx_1.images.microphoneWithHands, {
        className: 'rounded-lg object-cover',
        widths: [512, 650, 840, 1024, 1300, 1680, 2000, 2520],
        sizes: [
            '(max-width: 1023px) 80vw',
            '(min-width: 1024px) and (max-width: 1620px) 40vw',
            '650px',
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

				<div className="col-span-full lg:col-span-4 lg:col-start-8 lg:row-start-1">
					<typography_tsx_1.H2 className="mb-10 lg:mt-24">
						{"I have had the privilege to do a lot of cool interviews and chats."}
					</typography_tsx_1.H2>
					<typography_tsx_1.H2 variant="secondary" as="p" className="mb-14">
						{"Check out my appearances on podcasts, blog and other cool stuff."}
					</typography_tsx_1.H2>
					<arrow_button_tsx_1.ArrowLink to="/appearances">See all appearances</arrow_button_tsx_1.ArrowLink>
				</div>
			</grid_tsx_1.Grid>

			<header_section_tsx_1.HeaderSection title="I've been recognized for my contributions." subTitle="Here are some of the honors and awards I've received." className="mb-16"/>

			<grid_tsx_1.Grid className="mb-24 lg:mb-64" rowGap>
				<div className="col-span-full lg:col-span-6">
					<feature_card_tsx_1.FeatureCard title="Google Developer Expert (GDE)" description="Recognized by Google as an expert in web technologies, particularly React and testing. I help developers build better applications through education and open source contributions." icon={<icons_tsx_1.TrophyIcon size={48}/>}/>
				</div>
				<div className="col-span-full lg:col-span-6">
					<feature_card_tsx_1.FeatureCard title="Microsoft MVP" description="Awarded Microsoft MVP status for exceptional contributions to the developer community. I'm recognized for my work in JavaScript, React, and developer education." icon={<icons_tsx_1.CodeIcon size={48}/>}/>
				</div>
				<div className="col-span-full lg:col-span-6">
					<feature_card_tsx_1.FeatureCard title="GitHub Star" description="Selected as a GitHub Star for my open source contributions and community leadership. I help developers learn and grow through my projects and educational content." icon={<icons_tsx_1.StarIcon size={48}/>}/>
				</div>
				<div className="col-span-full lg:col-span-6">
					<feature_card_tsx_1.FeatureCard title="TC-39 Committee Member" description="Represented PayPal on the TC-39 committee, which is responsible for standardizing the JavaScript language. Helped shape the future of JavaScript." icon={<icons_tsx_1.BadgeIcon size={48}/>}/>
				</div>
				<div className="col-span-full lg:col-span-6">
					<feature_card_tsx_1.FeatureCard title="GitNation OS Awards" description="The Most Impactful Contribution to the community awarded for my work on Testing Library." icon={<icons_tsx_1.AwardIcon size={48}/>}/>
				</div>
				<div className="col-span-full lg:col-span-6">
					<feature_card_tsx_1.FeatureCard title="Owen Cherrington Scholarship" description="Given to students who exemplify characteristics such as scholarship, hard work, and selfless service in making the Information Systems Jr. Core a better experience for classmates." icon={<icons_tsx_1.TrophyIcon size={48}/>}/>
				</div>
			</grid_tsx_1.Grid>

			<header_section_tsx_1.HeaderSection title="Here are some random fun facts." subTitle="Some unique things about me." className="mb-16"/>

			<grid_tsx_1.Grid className="mb-24 lg:mb-64" rowGap>
				<div className="col-span-full lg:col-span-6">
					<feature_card_tsx_1.FeatureCard title="I have 11 brothers and sisters" description="Yup! There are 6 boys and 6 girls in my family. I'm second to last. No twins. We all have the same mom and dad. Yes my parents are super heroes 🦸‍♀️ 🦸" icon={<icons_tsx_1.UsersIcon size={48}/>}/>
				</div>
				<div className="col-span-full lg:col-span-6">
					<feature_card_tsx_1.FeatureCard title="I can still do a backflip" description="When I was a kid, I competed in various gymnastics events. As of 2021, I can still do a backflip 🤸‍♂️" icon={<icons_tsx_1.AwardIcon size={48}/>}/>
				</div>
				<div className="col-span-full lg:col-span-6">
					<feature_card_tsx_1.FeatureCard title="I've never had a sip of alcohol or coffee" description="It's a religious thing. That said, I do appreciate offers to go out for drinks! I'll just have a Hawaiian Punch thank you 🧃" icon={<icons_tsx_1.MugIcon size={48}/>}/>
				</div>
				<div className="col-span-full lg:col-span-6">
					<feature_card_tsx_1.FeatureCard title="I'm an Eagle Scout" description="When I was 14, I got my friends and scout leaders to plant 15 trees in a new park in town for my eagle scout project 🦅" icon={<icons_tsx_1.BadgeIcon size={48}/>}/>
				</div>
				<div className="col-span-full lg:col-span-6">
					<feature_card_tsx_1.FeatureCard title="I've written a novel" description="In 2018, I wanted to get good at telling stories, so I participated in National Novel Writing Month and wrote a 50k word novel in one month 📘" icon={<icons_tsx_1.BookIcon size={48}/>}/>
				</div>
				<div className="col-span-full lg:col-span-6">
					<feature_card_tsx_1.FeatureCard title="I listen to books and podcasts at 3x" description="I've worked my way up to 3x listening so I could listen to more. So far I've saved ~300 days of listening by doing this 🎧" icon={<icons_tsx_1.FastForwardIcon size={48}/>}/>
				</div>
			</grid_tsx_1.Grid>

			<grid_tsx_1.Grid className="mb-24 lg:mb-64">
				<div className="col-span-full mb-10 lg:col-span-6 lg:col-start-1 lg:mb-0">
					<img {...(0, images_tsx_1.getImgProps)(images_tsx_1.images.teslaY, {
        className: 'rounded-lg object-contain',
        widths: [420, 512, 840, 1260, 1024, 1680, 2520],
        sizes: [
            '(max-width: 1023px) 80vw',
            '(min-width: 1024px) and (max-width: 1620px) 40vw',
            '630px',
        ],
    })}/>
				</div>

				<div className="col-span-full lg:col-span-4 lg:col-start-8 lg:row-start-1">
					<typography_tsx_1.H2 className="mb-10">{"Curious to know the stuff I use?"}</typography_tsx_1.H2>
					<typography_tsx_1.H2 variant="secondary" as="p" className="mb-14">
						{"I keep a \"uses\" page updated with the stuff I use."}
					</typography_tsx_1.H2>
					<arrow_button_tsx_1.ArrowLink to="/uses">{"Check out the uses page"}</arrow_button_tsx_1.ArrowLink>
				</div>
			</grid_tsx_1.Grid>

			<blog_section_tsx_1.BlogSection articles={blogRecommendations} title="Have a look at my writing." description="These are the most popular."/>
		</>);
}
function TalkCard(_a) {
    var tags = _a.tags, dateDisplay = _a.dateDisplay, title = _a.title, talkUrl = _a.talkUrl;
    return (<div className="bg-secondary text-primary flex h-full w-full flex-col justify-between rounded-lg p-16 pt-20">
			<div>
				<div className="-mr-4 mb-12 flex flex-wrap">
					{tags.map(function (tag) { return (<div className="text-primary mb-4 mr-4 rounded-full bg-gray-300 px-6 py-1 dark:bg-gray-700" key={tag}>
							{tag}
						</div>); })}
				</div>

				<typography_tsx_1.Paragraph as="span" className="mb-5">
					{dateDisplay !== null && dateDisplay !== void 0 ? dateDisplay : 'TBA'}
				</typography_tsx_1.Paragraph>

				<typography_tsx_1.H3 className="mb-5">{title}</typography_tsx_1.H3>
			</div>
			<arrow_button_tsx_1.ArrowLink to={talkUrl}>
				<span className="hidden md:inline">Have a look at this talk</span>
				<span className="md:hidden">Read more</span>
			</arrow_button_tsx_1.ArrowLink>
		</div>);
}
exports.default = AboutIndex;
