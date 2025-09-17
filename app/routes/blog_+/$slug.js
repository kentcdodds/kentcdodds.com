"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.meta = exports.headers = exports.handle = void 0;
exports.loader = loader;
exports.default = MdxScreen;
exports.ErrorBoundary = ErrorBoundary;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var clsx_1 = require("clsx");
var React = require("react");
var vite_env_only_1 = require("vite-env-only");
var arrow_button_tsx_1 = require("#app/components/arrow-button.tsx");
var blurrable_image_tsx_1 = require("#app/components/blurrable-image.tsx");
var course_card_tsx_1 = require("#app/components/course-card.tsx");
var error_boundary_tsx_1 = require("#app/components/error-boundary.tsx");
var errors_tsx_1 = require("#app/components/errors.tsx");
var grid_tsx_1 = require("#app/components/grid.tsx");
var blog_section_tsx_1 = require("#app/components/sections/blog-section.tsx");
var header_section_tsx_1 = require("#app/components/sections/header-section.tsx");
var spacer_tsx_1 = require("#app/components/spacer.tsx");
var team_stats_tsx_1 = require("#app/components/team-stats.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var workshop_card_tsx_1 = require("#app/components/workshop-card.tsx");
var external_links_tsx_1 = require("#app/external-links.tsx");
var images_tsx_1 = require("#app/images.tsx");
var blog_server_ts_1 = require("#app/utils/blog.server.ts");
var blog_ts_1 = require("#app/utils/blog.ts");
var mdx_server_ts_1 = require("#app/utils/mdx.server.ts");
var mdx_tsx_1 = require("#app/utils/mdx.tsx");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var team_provider_tsx_1 = require("#app/utils/team-provider.tsx");
var timing_server_ts_1 = require("#app/utils/timing.server.ts");
var use_root_data_ts_1 = require("#app/utils/use-root-data.ts");
var workshop_tickets_server_ts_1 = require("#app/utils/workshop-tickets.server.ts");
var workshops_server_ts_1 = require("#app/utils/workshops.server.ts");
var mark_as_read_tsx_1 = require("../action+/mark-as-read.tsx");
var handleId = 'blog-post';
exports.handle = {
    id: handleId,
    getSitemapEntries: (0, vite_env_only_1.serverOnly$)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
        var pages;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, mdx_server_ts_1.getBlogMdxListItems)({ request: request })];
                case 1:
                    pages = _a.sent();
                    return [2 /*return*/, pages
                            .filter(function (page) { return !page.frontmatter.draft; })
                            .map(function (page) {
                            return { route: "/blog/".concat(page.slug), priority: 0.7 };
                        })];
            }
        });
    }); }),
};
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var timings, page, _c, recommendations, readRankings, totalReads, workshops, workshopEvents, catchData, headers, topics, relevantWorkshops;
        var _d, _e, _f, _g, _h, _j, _k, _l;
        var request = _b.request, params = _b.params;
        return __generator(this, function (_m) {
            switch (_m.label) {
                case 0:
                    (0, misc_tsx_1.requireValidSlug)(params.slug);
                    timings = {};
                    return [4 /*yield*/, (0, mdx_server_ts_1.getMdxPage)({ contentDir: 'blog', slug: params.slug }, { request: request, timings: timings })];
                case 1:
                    page = _m.sent();
                    return [4 /*yield*/, Promise.all([
                            (0, blog_server_ts_1.getBlogRecommendations)({
                                request: request,
                                timings: timings,
                                limit: 3,
                                keywords: __spreadArray(__spreadArray([], ((_d = page === null || page === void 0 ? void 0 : page.frontmatter.categories) !== null && _d !== void 0 ? _d : []), true), ((_f = (_e = page === null || page === void 0 ? void 0 : page.frontmatter.meta) === null || _e === void 0 ? void 0 : _e.keywords) !== null && _f !== void 0 ? _f : []), true),
                                exclude: [params.slug],
                            }),
                            (0, blog_server_ts_1.getBlogReadRankings)({ request: request, slug: params.slug, timings: timings }),
                            (0, blog_server_ts_1.getTotalPostReads)({ request: request, slug: params.slug, timings: timings }),
                            (0, workshops_server_ts_1.getWorkshops)({ request: request, timings: timings }),
                            (0, workshop_tickets_server_ts_1.getScheduledEvents)({ request: request, timings: timings }),
                        ])];
                case 2:
                    _c = _m.sent(), recommendations = _c[0], readRankings = _c[1], totalReads = _c[2], workshops = _c[3], workshopEvents = _c[4];
                    catchData = {
                        recommendations: recommendations,
                        readRankings: readRankings,
                        totalReads: (0, misc_tsx_1.formatNumber)(totalReads),
                        leadingTeam: (_h = (_g = (0, blog_ts_1.getRankingLeader)(readRankings)) === null || _g === void 0 ? void 0 : _g.team) !== null && _h !== void 0 ? _h : null,
                    };
                    headers = {
                        'Cache-Control': 'private, max-age=3600',
                        Vary: 'Cookie',
                        'Server-Timing': (0, timing_server_ts_1.getServerTimeHeader)(timings),
                    };
                    if (!page) {
                        throw (0, node_1.json)(catchData, { status: 404, headers: headers });
                    }
                    topics = __spreadArray(__spreadArray([], ((_j = page.frontmatter.categories) !== null && _j !== void 0 ? _j : []), true), ((_l = (_k = page.frontmatter.meta) === null || _k === void 0 ? void 0 : _k.keywords) !== null && _l !== void 0 ? _l : []), true);
                    relevantWorkshops = workshops.filter(function (workshop) {
                        var _a;
                        var workshopTopics = __spreadArray(__spreadArray([], workshop.categories, true), ((_a = workshop.meta.keywords) !== null && _a !== void 0 ? _a : []), true);
                        return (workshopTopics.some(function (t) { return topics.includes(t); }) &&
                            (workshop.events.length ||
                                workshopEvents.some(function (event) { return event.metadata.workshopSlug === workshop.slug; })));
                    });
                    return [2 /*return*/, (0, node_1.json)(__assign({ page: page, workshops: relevantWorkshops, workshopEvents: workshopEvents.filter(misc_tsx_1.typedBoolean) }, catchData), { status: 200, headers: headers })];
            }
        });
    });
}
exports.headers = misc_tsx_1.reuseUsefulLoaderHeaders;
exports.meta = mdx_tsx_1.mdxPageMeta;
function useOnRead(_a) {
    var parentElRef = _a.parentElRef, time = _a.time, onRead = _a.onRead;
    React.useEffect(function () {
        var parentEl = parentElRef.current;
        if (!parentEl || !time)
            return;
        var visibilityEl = document.createElement('div');
        var scrolledTheMain = false;
        var observer = new IntersectionObserver(function (entries) {
            var isVisible = entries.some(function (entry) {
                return entry.target === visibilityEl && entry.isIntersecting;
            });
            if (isVisible) {
                scrolledTheMain = true;
                maybeMarkAsRead();
                observer.disconnect();
                visibilityEl.remove();
            }
        });
        var startTime = new Date().getTime();
        var timeoutTime = time * 0.6;
        var timerId;
        var timerFinished = false;
        function startTimer() {
            timerId = setTimeout(function () {
                timerFinished = true;
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                maybeMarkAsRead();
            }, timeoutTime);
        }
        function handleVisibilityChange() {
            if (document.hidden) {
                clearTimeout(timerId);
                var timeElapsedSoFar = new Date().getTime() - startTime;
                timeoutTime = timeoutTime - timeElapsedSoFar;
            }
            else {
                startTime = new Date().getTime();
                startTimer();
            }
        }
        function maybeMarkAsRead() {
            if (timerFinished && scrolledTheMain) {
                cleanup();
                onRead();
            }
        }
        // dirty-up
        parentEl.appendChild(visibilityEl);
        observer.observe(visibilityEl);
        startTimer();
        document.addEventListener('visibilitychange', handleVisibilityChange);
        function cleanup() {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearTimeout(timerId);
            observer.disconnect();
            visibilityEl.remove();
        }
        return cleanup;
    }, [time, onRead, parentElRef]);
}
function ArticleFooter(_a) {
    var editLink = _a.editLink, permalink = _a.permalink, _b = _a.title, title = _b === void 0 ? 'an awesome post' : _b, isDraft = _a.isDraft;
    var team = (0, team_provider_tsx_1.useTeam)()[0];
    var tweetMessage = team === 'UNKNOWN'
        ? "I just read \"".concat(title, "\" by @kentcdodds\n\n")
        : "I just scored a point for the ".concat(team.toLowerCase(), " team ").concat(team_provider_tsx_1.teamEmoji[team], " by reading \"").concat(title, "\" by @kentcdodds\n\n");
    return (<grid_tsx_1.Grid>
			<div className="col-span-full mb-12 flex flex-col flex-wrap justify-between gap-2 border-b border-gray-600 pb-12 text-lg font-medium text-slate-500 lg:col-span-8 lg:col-start-3 lg:flex-row lg:pb-6">
				<div className="flex space-x-5">
					<a className={(0, clsx_1.clsx)('underlined hover:text-black focus:text-black focus:outline-none dark:hover:text-white dark:focus:text-white', { hidden: isDraft })} target="_blank" rel="noreferrer noopener" href={"https://x.com/intent/tweet?".concat(new URLSearchParams({
            url: permalink,
            text: tweetMessage,
        }))}>
						Post this article
					</a>
				</div>

				<div className="flex">
					<a className={(0, clsx_1.clsx)('underlined hover:text-black focus:text-black focus:outline-none dark:hover:text-white dark:focus:text-white', { hidden: isDraft })} target="_blank" rel="noreferrer noopener" href={"https://x.com/search?".concat(new URLSearchParams({
            q: permalink,
        }))}>
						Discuss on 𝕏
					</a>
					<span className={(0, clsx_1.clsx)('mx-3 self-center text-xs', { hidden: isDraft })}>
						•
					</span>
					<a className="underlined hover:text-black focus:text-black focus:outline-none dark:hover:text-white dark:focus:text-white" target="_blank" rel="noreferrer noopener" href={editLink}>
						Edit on GitHub
					</a>
				</div>
			</div>
			<div className="col-span-full lg:col-span-2 lg:col-start-3">
				<img loading="lazy" {...(0, images_tsx_1.getImgProps)(images_tsx_1.images.kentTransparentProfile, {
        className: 'mb-8 w-32',
        widths: [128, 256, 512],
        sizes: ['8rem'],
    })}/>
			</div>
			<div className="lg:col-start:5 col-span-full lg:col-span-6">
				<typography_tsx_1.H6 as="div">Written by Kent C. Dodds</typography_tsx_1.H6>
				<typography_tsx_1.Paragraph className="mb-12 mt-3">
					{"\nKent C. Dodds is a JavaScript software engineer and teacher. Kent's taught hundreds\nof thousands of people how to make the world a better place with quality software\ndevelopment tools and practices. He lives with his wife and four kids in Utah.\n          ".trim()}
				</typography_tsx_1.Paragraph>
				<arrow_button_tsx_1.ArrowLink to="/about">Learn more about Kent</arrow_button_tsx_1.ArrowLink>
			</div>
		</grid_tsx_1.Grid>);
}
function MdxScreen() {
    var _a, _b, _c, _d, _e, _f, _g;
    var data = (0, react_1.useLoaderData)();
    var requestInfo = (0, use_root_data_ts_1.useRootData)().requestInfo;
    var _h = data.page, code = _h.code, dateDisplay = _h.dateDisplay, frontmatter = _h.frontmatter;
    var params = (0, react_1.useParams)();
    var slug = params.slug;
    var Component = (0, mdx_tsx_1.useMdxComponent)(code);
    var permalink = "".concat(requestInfo.origin, "/blog/").concat(slug);
    var readMarker = React.useRef(null);
    var isDraft = Boolean(data.page.frontmatter.draft);
    var isArchived = Boolean(data.page.frontmatter.archived);
    var categoriesAndKeywords = __spreadArray(__spreadArray([], ((_a = data.page.frontmatter.categories) !== null && _a !== void 0 ? _a : []), true), ((_c = (_b = data.page.frontmatter.meta) === null || _b === void 0 ? void 0 : _b.keywords) !== null && _c !== void 0 ? _c : []), true);
    useOnRead({
        parentElRef: readMarker,
        time: (_d = data.page.readTime) === null || _d === void 0 ? void 0 : _d.time,
        onRead: React.useCallback(function () {
            if (isDraft)
                return;
            if (slug)
                void (0, mark_as_read_tsx_1.markAsRead)({ slug: slug });
        }, [isDraft, slug]),
    });
    return (<div key={slug} className={data.leadingTeam
            ? "set-color-team-current-".concat(data.leadingTeam.toLowerCase())
            : ''}>
			<grid_tsx_1.Grid className="mb-10 mt-24 lg:mb-24">
				<div className="col-span-full flex justify-between lg:col-span-8 lg:col-start-3">
					<arrow_button_tsx_1.BackLink to="/blog">Back to overview</arrow_button_tsx_1.BackLink>
					<team_stats_tsx_1.TeamStats totalReads={data.totalReads} rankings={data.readRankings} direction="down" pull="right"/>
				</div>
			</grid_tsx_1.Grid>

			<grid_tsx_1.Grid as="header" className="mb-12">
				<div className="col-span-full lg:col-span-8 lg:col-start-3">
					{isDraft ? (<div className="prose prose-light mb-6 max-w-full dark:prose-dark">
							{React.createElement('callout-warning', {}, "This blog post is a draft. Please don't share it in its current state.")}
						</div>) : null}
					{isArchived ? (<div className="prose prose-light mb-6 max-w-full dark:prose-dark">
							{React.createElement('callout-warning', {}, "This blog post is archived. It's no longer maintained and may contain outdated information.")}
						</div>) : null}
					<typography_tsx_1.H2>{frontmatter.title}</typography_tsx_1.H2>
					<typography_tsx_1.H6 as="p" variant="secondary" className="mt-2">
						{[dateDisplay, (_f = (_e = data.page.readTime) === null || _e === void 0 ? void 0 : _e.text) !== null && _f !== void 0 ? _f : 'quick read']
            .filter(Boolean)
            .join(' — ')}
					</typography_tsx_1.H6>
				</div>
				{frontmatter.bannerCloudinaryId ? (<div className="col-span-full mt-10 lg:col-span-10 lg:col-start-2 lg:mt-16">
						<blurrable_image_tsx_1.BlurrableImage key={frontmatter.bannerCloudinaryId} blurDataUrl={frontmatter.bannerBlurDataUrl} className="aspect-[3/4] md:aspect-[3/2]" img={<img key={frontmatter.bannerCloudinaryId} title={(0, mdx_tsx_1.getBannerTitleProp)(frontmatter)} {...(0, images_tsx_1.getImgProps)((0, images_tsx_1.getImageBuilder)(frontmatter.bannerCloudinaryId, (0, mdx_tsx_1.getBannerAltProp)(frontmatter)), {
                className: 'rounded-lg object-cover object-center',
                widths: [280, 560, 840, 1100, 1650, 2500, 2100, 3100],
                sizes: [
                    '(max-width:1023px) 80vw',
                    '(min-width:1024px) and (max-width:1620px) 67vw',
                    '1100px',
                ],
                transformations: {
                    background: 'rgb:e6e9ee',
                },
            })}/>}/>
					</div>) : null}
			</grid_tsx_1.Grid>

			<main ref={readMarker}>
				<grid_tsx_1.Grid className="mb-24">
					<div className="col-span-full lg:col-start-3 lg:col-end-11">
						<div className="flex flex-wrap">
							{((_g = frontmatter.translations) === null || _g === void 0 ? void 0 : _g.length) ? (<>
									<ul className="col-span-full -mb-4 -mr-4 flex flex-wrap lg:col-span-10 lg:col-start-3">
										{frontmatter.translations.map(function (_a) {
                var language = _a.language, link = _a.link;
                return (<li key={"".concat(language, ":").concat(link)}>
												<a href={link} className="focus-ring bg-secondary text-primary relative mb-4 mr-4 block h-auto w-auto whitespace-nowrap rounded-full px-6 py-3">
													{language}
												</a>
											</li>);
            })}
									</ul>
									<a href={external_links_tsx_1.externalLinks.translationContributions} className="text-secondary underlined my-3 mb-6 ml-5 block text-lg font-medium hover:text-team-current focus:text-team-current focus:outline-none" target="_blank" rel="noreferrer noopener">
										Add translation
									</a>
								</>) : (<>
									<span className="text-secondary text-lg italic">
										No translations available.
									</span>

									<a href={external_links_tsx_1.externalLinks.translationContributions} className="text-secondary underlined ml-5 block text-lg font-medium hover:text-team-current focus:text-team-current focus:outline-none" target="_blank" rel="noreferrer noopener">
										Add translation
									</a>
								</>)}
						</div>
					</div>
				</grid_tsx_1.Grid>

				<grid_tsx_1.Grid className="prose prose-light mb-24 break-words dark:prose-dark">
					<Component />
				</grid_tsx_1.Grid>
			</main>

			{categoriesAndKeywords.includes('react') ||
            categoriesAndKeywords.includes('testing') ? (<div className="mx-auto mb-24 flex max-w-lg flex-col items-center justify-center gap-8 px-10vw md:max-w-none md:flex-row">
					{categoriesAndKeywords.includes('react') ? (<div className="w-full max-w-lg @container">
							<course_card_tsx_1.CourseCard title="Epic React" description="Get Really Good at React" label="React course" lightImageBuilder={images_tsx_1.images.courseEpicReact} darkImageBuilder={images_tsx_1.images.courseEpicReactDark} courseUrl="https://epicreact.dev"/>
						</div>) : null}
					{categoriesAndKeywords.includes('testing') ? (<div className="w-full max-w-lg @container">
							<course_card_tsx_1.CourseCard title="Testing JavaScript" description="Ship Apps with Confidence" label="Testing course" lightImageBuilder={images_tsx_1.images.courseTestingJS} darkImageBuilder={images_tsx_1.images.courseTestingJSDark} courseUrl="https://testingjavascript.com"/>
						</div>) : null}
				</div>) : null}

			<grid_tsx_1.Grid className="mb-24">
				<div className="col-span-full flex justify-end lg:col-span-8 lg:col-start-3">
					<team_stats_tsx_1.TeamStats totalReads={data.totalReads} rankings={data.readRankings} direction="up" pull="right"/>
				</div>
			</grid_tsx_1.Grid>

			<ArticleFooter editLink={data.page.editLink} permalink={permalink} title={data.page.frontmatter.title} isDraft={isDraft}/>

			<spacer_tsx_1.Spacer size="base"/>

			{data.workshops.length > 0 ? (<>
					<header_section_tsx_1.HeaderSection title="Want to learn more?" subTitle="Join Kent in a live workshop"/>
					<spacer_tsx_1.Spacer size="2xs"/>

					<grid_tsx_1.Grid>
						<div className="col-span-full">
							<grid_tsx_1.Grid nested rowGap>
								{data.workshops.map(function (workshop, idx) { return (<div key={idx} className={(0, clsx_1.clsx)('col-span-4', {
                    'hidden lg:block': idx >= 2,
                })}>
										<workshop_card_tsx_1.WorkshopCard workshop={workshop} titoEvents={data.workshopEvents.filter(function (e) { return e.metadata.workshopSlug === workshop.slug; })}/>
									</div>); })}
							</grid_tsx_1.Grid>
						</div>
					</grid_tsx_1.Grid>

					<spacer_tsx_1.Spacer size="base"/>
				</>) : null}

			<blog_section_tsx_1.BlogSection articles={data.recommendations} title="If you found this article helpful." description="You will love these ones as well." showArrowButton={false}/>
		</div>);
}
function ErrorBoundary() {
    return (<error_boundary_tsx_1.GeneralErrorBoundary statusHandlers={{
            400: function (_a) {
                var error = _a.error;
                return <errors_tsx_1.FourHundred error={error.statusText}/>;
            },
            404: function (_a) {
                var error = _a.error;
                return (<errors_tsx_1.FourOhFour articles={error.data.recommendations}/>);
            },
        }}/>);
}
