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
exports.headers = void 0;
exports.loader = loader;
exports.default = IndexRoute;
exports.ErrorBoundary = ErrorBoundary;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var button_tsx_1 = require("#app/components/button.tsx");
var errors_tsx_1 = require("#app/components/errors.tsx");
var about_section_tsx_1 = require("#app/components/sections/about-section.tsx");
var blog_section_tsx_1 = require("#app/components/sections/blog-section.tsx");
var course_section_tsx_1 = require("#app/components/sections/course-section.tsx");
var discord_section_tsx_1 = require("#app/components/sections/discord-section.tsx");
var hero_section_tsx_1 = require("#app/components/sections/hero-section.tsx");
var introduction_section_tsx_1 = require("#app/components/sections/introduction-section.tsx");
var problem_solution_section_tsx_1 = require("#app/components/sections/problem-solution-section.tsx");
var spacer_tsx_1 = require("#app/components/spacer.tsx");
var images_tsx_1 = require("#app/images.tsx");
var blog_server_ts_1 = require("#app/utils/blog.server.ts");
var blog_ts_1 = require("#app/utils/blog.ts");
var mdx_server_ts_1 = require("#app/utils/mdx.server.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var session_server_ts_1 = require("#app/utils/session.server.ts");
var timing_server_ts_1 = require("#app/utils/timing.server.ts");
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var timings, _c, user, posts, totalBlogReads, blogRankings, totalBlogReaders, blogRecommendations;
        var _d, _e;
        var request = _b.request;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    timings = {};
                    return [4 /*yield*/, Promise.all([
                            (0, session_server_ts_1.getUser)(request),
                            (0, mdx_server_ts_1.getBlogMdxListItems)({ request: request, timings: timings }),
                            (0, blog_server_ts_1.getTotalPostReads)({ request: request, timings: timings }),
                            (0, blog_server_ts_1.getBlogReadRankings)({ request: request, timings: timings }),
                            (0, blog_server_ts_1.getReaderCount)({ request: request, timings: timings }),
                            (0, blog_server_ts_1.getBlogRecommendations)({ request: request, timings: timings }),
                        ])];
                case 1:
                    _c = _f.sent(), user = _c[0], posts = _c[1], totalBlogReads = _c[2], blogRankings = _c[3], totalBlogReaders = _c[4], blogRecommendations = _c[5];
                    return [2 /*return*/, (0, node_1.json)({
                            blogRecommendations: blogRecommendations,
                            blogPostCount: (0, misc_tsx_1.formatNumber)(posts.length),
                            totalBlogReaders: totalBlogReaders < 10000
                                ? 'hundreds of thousands of'
                                : (0, misc_tsx_1.formatNumber)(totalBlogReaders),
                            totalBlogReads: totalBlogReads < 100000
                                ? 'hundreds of thousands of'
                                : (0, misc_tsx_1.formatNumber)(totalBlogReads),
                            currentBlogLeaderTeam: (_d = (0, blog_ts_1.getRankingLeader)(blogRankings)) === null || _d === void 0 ? void 0 : _d.team,
                            kodyTeam: (0, misc_tsx_1.getOptionalTeam)((_e = user === null || user === void 0 ? void 0 : user.team) !== null && _e !== void 0 ? _e : misc_tsx_1.teams[Math.floor(Math.random() * misc_tsx_1.teams.length)]),
                            randomImageNo: Math.random(),
                        }, {
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
exports.headers = misc_tsx_1.reuseUsefulLoaderHeaders;
function IndexRoute() {
    var data = (0, react_1.useLoaderData)();
    var kodyFlying = (0, images_tsx_1.getRandomFlyingKody)(data.kodyTeam, data.randomImageNo);
    return (<div>
			<hero_section_tsx_1.HeroSection title="Helping people make the world a better place through quality software." imageBuilder={kodyFlying} imageSize="giant" arrowUrl="#intro" arrowLabel="Learn more about Kent" action={<div className="mr-auto flex flex-col gap-4">
						<button_tsx_1.ButtonLink to="/blog" variant="primary" prefetch="intent">
							Read the blog
						</button_tsx_1.ButtonLink>
						<button_tsx_1.ButtonLink to="/courses" variant="secondary" prefetch="intent">
							Take a course
						</button_tsx_1.ButtonLink>
					</div>}/>

			<main>
				<introduction_section_tsx_1.IntroductionSection />
				<spacer_tsx_1.Spacer size="lg"/>
				<problem_solution_section_tsx_1.ProblemSolutionSection blogPostCount={data.blogPostCount} totalBlogReads={data.totalBlogReads} currentBlogLeaderTeam={data.currentBlogLeaderTeam} totalBlogReaders={data.totalBlogReaders}/>
				<spacer_tsx_1.Spacer size="base"/>
				<blog_section_tsx_1.BlogSection articles={data.blogRecommendations} title="Blog recommendations" description="Prepared especially for you."/>
				<spacer_tsx_1.Spacer size="lg"/>
				<course_section_tsx_1.CourseSection />
				<spacer_tsx_1.Spacer size="lg"/>
				<discord_section_tsx_1.DiscordSection />
				<spacer_tsx_1.Spacer size="lg"/>
				<about_section_tsx_1.AboutSection />
			</main>
		</div>);
}
function ErrorBoundary() {
    var error = (0, misc_tsx_1.useCapturedRouteError)();
    console.error(error);
    return <errors_tsx_1.ServerError />;
}
