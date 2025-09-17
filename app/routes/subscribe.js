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
exports.meta = void 0;
exports.loader = loader;
exports.default = SubscribeScreen;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var button_tsx_1 = require("#app/components/button.tsx");
var grid_tsx_1 = require("#app/components/grid.tsx");
var icons_tsx_1 = require("#app/components/icons.tsx");
var blog_section_tsx_1 = require("#app/components/sections/blog-section.tsx");
var hero_section_tsx_1 = require("#app/components/sections/hero-section.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var images_tsx_1 = require("#app/images.tsx");
var form_tsx_1 = require("#app/kit/form.tsx");
var blog_server_ts_1 = require("#app/utils/blog.server.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var seo_ts_1 = require("#app/utils/seo.ts");
var timing_server_ts_1 = require("#app/utils/timing.server.ts");
var use_root_data_ts_1 = require("#app/utils/use-root-data.ts");
var meta = function (_a) {
    var _b;
    var matches = _a.matches;
    var requestInfo = (_b = matches.find(function (m) { return m.id === 'root'; })) === null || _b === void 0 ? void 0 : _b.data.requestInfo;
    return (0, seo_ts_1.getSocialMetas)({
        title: "Subscribe to the KCD Mailing List",
        description: "Get weekly insights, ideas, and proven coding practices from the KCD Mailing List",
        url: (0, misc_tsx_1.getUrl)(requestInfo),
        image: (0, images_tsx_1.getGenericSocialImage)({
            url: (0, misc_tsx_1.getDisplayUrl)(requestInfo),
            featuredImage: images_tsx_1.images.snowboard(),
            words: "Subscribe to the KCD Mailing List",
        }),
    });
};
exports.meta = meta;
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var timings, blogRecommendations;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    timings = {};
                    return [4 /*yield*/, (0, blog_server_ts_1.getBlogRecommendations)({ request: request, timings: timings })];
                case 1:
                    blogRecommendations = _c.sent();
                    return [2 /*return*/, (0, node_1.json)({ blogRecommendations: blogRecommendations }, {
                            headers: {
                                'Cache-Control': 'private, max-age=3600',
                                Vary: 'Cookie',
                                'Server-Timing': (0, timing_server_ts_1.getServerTimeHeader)(timings),
                            },
                        })];
            }
        });
    });
}
function SubscribeScreen() {
    var _a;
    var data = (0, react_1.useLoaderData)();
    var userInfo = (0, use_root_data_ts_1.useRootData)().userInfo;
    var subscribedToNewsletter = (_a = userInfo === null || userInfo === void 0 ? void 0 : userInfo.kit) === null || _a === void 0 ? void 0 : _a.tags.some(function (_a) {
        var name = _a.name;
        return name === 'Subscribed: general newsletter';
    });
    return (<>
			<hero_section_tsx_1.HeroSection title="Increase your knowledge" subtitle="With valuable insights emailed to you each week" imageBuilder={images_tsx_1.images.snowboard} arrowUrl="#why" arrowLabel="Why should I?" action={<button_tsx_1.ButtonLink variant="primary" href="#subscribe-form">
						<icons_tsx_1.MailIcon /> Subscribe
					</button_tsx_1.ButtonLink>}/>
			<main>
				<grid_tsx_1.Grid className="mb-24 lg:mb-64">
					<div className="col-span-full lg:col-span-6 lg:col-start-1">
						<div className="mb-12 aspect-[4/3] lg:mb-0">
							<img {...(0, images_tsx_1.getImgProps)(images_tsx_1.images.kentCodingWithSkates, {
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
						<typography_tsx_1.H2 id="why" className="mb-10">
							{"Here's what you get out of subscribing."}
						</typography_tsx_1.H2>

						<button_tsx_1.ButtonLink className="mb-32" variant="primary" href="#subscribe-form">
							<icons_tsx_1.MailIcon /> Subscribe
						</button_tsx_1.ButtonLink>

						<typography_tsx_1.H6 as="h3" className="mb-4">
							{"Stay sharp"}
						</typography_tsx_1.H6>
						<typography_tsx_1.Paragraph className="mb-12">
							{"\n                Keeping yourself up-to-date is critical in this ever-changing\n                fast-paced industry. One of the things that has helped me to\n                keep myself sharp the most is to\n              "}
							<strong>systemize regular exposure to ideas.</strong>
							{"\n                When you give me your email, you're signing up to receive\n                this kind of exposure every week. You'll read about the problems\n                and solutions that I've experienced so you know what to reach\n                for when you face similar problems in the future.\n              "}
						</typography_tsx_1.Paragraph>
						<typography_tsx_1.H6 as="h3" className="mb-4">
							{"Stay updated"}
						</typography_tsx_1.H6>
						<typography_tsx_1.Paragraph className="mb-12">
							{"\n                When you sign up for the newsletter, you'll also receive\n                valuable notifications for when I create new opportunities to\n                improve yourself. When I launch a new season of\n              "}
							<react_1.Link to="/chats">Chats with Kent</react_1.Link>
							{",\n                give a discount on my courses, or have any number of other\n                exciting announcements, you'll be the first to know.\n              "}
						</typography_tsx_1.Paragraph>
						<typography_tsx_1.H6 as="h3" className="mb-4">
							{"Reply"}
						</typography_tsx_1.H6>
						<typography_tsx_1.Paragraph className="mb-12">
							{"\n                Yes, I do get the emails you send me in return and I do try to\n                read and reply to them all. In fact, the ideas and questions you\n                have while reading the content you get delivered to your inbox\n                may be well suited for\n              "}
							<react_1.Link to="/calls">The Call Kent Podcast</react_1.Link>
							{" or "}
							<react_1.Link to="/office-hours">Office Hours</react_1.Link>
							{" so be sure to take advantage of those opportunities as well."}
						</typography_tsx_1.Paragraph>
					</div>

					{subscribedToNewsletter ? (<div className="col-span-full" id="subscribe-form">
							<typography_tsx_1.H3>{"Hey, you're already subscribed"}</typography_tsx_1.H3>
							<typography_tsx_1.Paragraph>{"Good job! There's nothing for you to do here"}</typography_tsx_1.Paragraph>
						</div>) : (<>
							<div className="col-span-full lg:col-span-5">
								<typography_tsx_1.H3>{"Sign up here"}</typography_tsx_1.H3>
								<typography_tsx_1.Paragraph>{"And get your first email this week!"}</typography_tsx_1.Paragraph>
							</div>
							<div id="subscribe-form" className="col-span-full mt-8 lg:col-span-7">
								<form_tsx_1.KitForm formId="newsletter" kitFormId="827139"/>
							</div>
						</>)}
				</grid_tsx_1.Grid>
				<blog_section_tsx_1.BlogSection articles={data.blogRecommendations} title="Want a taste of what to expect?" description="Checkout these articles."/>
			</main>
		</>);
}
