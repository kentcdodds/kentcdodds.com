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
exports.meta = exports.headers = exports.links = exports.handle = void 0;
exports.loader = loader;
exports.ErrorBoundary = ErrorBoundary;
var checkbox_1 = require("@reach/checkbox");
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var clsx_1 = require("clsx");
var React = require("react");
var arrow_button_tsx_1 = require("#app/components/arrow-button.tsx");
var article_card_tsx_1 = require("#app/components/article-card.tsx");
var button_tsx_1 = require("#app/components/button.tsx");
var errors_tsx_1 = require("#app/components/errors.tsx");
var grid_tsx_1 = require("#app/components/grid.tsx");
var icons_tsx_1 = require("#app/components/icons.tsx");
var featured_section_tsx_1 = require("#app/components/sections/featured-section.tsx");
var hero_section_tsx_1 = require("#app/components/sections/hero-section.tsx");
var spacer_tsx_1 = require("#app/components/spacer.tsx");
var tag_tsx_1 = require("#app/components/tag.tsx");
var team_stats_tsx_1 = require("#app/components/team-stats.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var images_tsx_1 = require("#app/images.tsx");
var blog_server_ts_1 = require("#app/utils/blog.server.ts");
var blog_ts_1 = require("#app/utils/blog.ts");
var mdx_server_ts_1 = require("#app/utils/mdx.server.ts");
var mdx_tsx_1 = require("#app/utils/mdx.tsx");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var seo_ts_1 = require("#app/utils/seo.ts");
var team_provider_tsx_1 = require("#app/utils/team-provider.tsx");
var timing_server_ts_1 = require("#app/utils/timing.server.ts");
var use_root_data_ts_1 = require("#app/utils/use-root-data.ts");
var handleId = 'blog';
exports.handle = {
    id: handleId,
    getSitemapEntries: function () { return [{ route: "/blog", priority: 0.7 }]; },
};
var links = function () {
    return [
        {
            rel: 'alternate',
            type: 'application/rss+xml',
            title: 'Kent C. Dodds Blog',
            href: '/blog/rss.xml',
        },
    ];
};
exports.links = links;
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var timings, _c, posts, recommended, readRankings, totalReads, totalBlogReaders, allPostReadRankings, userReads, tags, _i, posts_1, post, _d, _e, category, data;
        var _f, _g, _h;
        var request = _b.request;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    timings = {};
                    return [4 /*yield*/, Promise.all([
                            (0, mdx_server_ts_1.getBlogMdxListItems)({ request: request }).then(function (allPosts) {
                                return allPosts.filter(function (p) { return !p.frontmatter.draft; });
                            }),
                            (0, blog_server_ts_1.getBlogRecommendations)({ request: request, limit: 1, timings: timings }),
                            (0, blog_server_ts_1.getBlogReadRankings)({ request: request, timings: timings }),
                            (0, blog_server_ts_1.getTotalPostReads)({ request: request, timings: timings }),
                            (0, blog_server_ts_1.getReaderCount)({ request: request, timings: timings }),
                            (0, blog_server_ts_1.getAllBlogPostReadRankings)({ request: request, timings: timings }),
                            (0, blog_server_ts_1.getSlugReadsByUser)({ request: request, timings: timings }),
                        ])];
                case 1:
                    _c = _j.sent(), posts = _c[0], recommended = _c[1][0], readRankings = _c[2], totalReads = _c[3], totalBlogReaders = _c[4], allPostReadRankings = _c[5], userReads = _c[6];
                    tags = new Set();
                    for (_i = 0, posts_1 = posts; _i < posts_1.length; _i++) {
                        post = posts_1[_i];
                        for (_d = 0, _e = (_f = post.frontmatter.categories) !== null && _f !== void 0 ? _f : []; _d < _e.length; _d++) {
                            category = _e[_d];
                            tags.add(category);
                        }
                    }
                    data = {
                        posts: posts,
                        recommended: recommended,
                        readRankings: readRankings,
                        allPostReadRankings: allPostReadRankings,
                        totalReads: (0, misc_tsx_1.formatAbbreviatedNumber)(totalReads),
                        totalBlogReaders: (0, misc_tsx_1.formatAbbreviatedNumber)(totalBlogReaders),
                        userReads: userReads,
                        tags: Array.from(tags),
                        overallLeadingTeam: (_h = (_g = (0, blog_ts_1.getRankingLeader)(readRankings)) === null || _g === void 0 ? void 0 : _g.team) !== null && _h !== void 0 ? _h : null,
                    };
                    return [2 /*return*/, (0, node_1.json)(data, {
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
var meta = function (_a) {
    var _b;
    var data = _a.data, matches = _a.matches;
    var requestInfo = (_b = matches.find(function (m) { return m.id === 'root'; })) === null || _b === void 0 ? void 0 : _b.data.requestInfo;
    var _c = data, totalBlogReaders = _c.totalBlogReaders, posts = _c.posts;
    return (0, seo_ts_1.getSocialMetas)({
        title: 'The Kent C. Dodds Blog',
        description: "Join ".concat(totalBlogReaders, " people who have read Kent's ").concat((0, misc_tsx_1.formatNumber)(posts.length), " articles on JavaScript, TypeScript, React, Testing, Career, and more."),
        keywords: 'JavaScript, TypeScript, React, Testing, Career, Software Development, Kent C. Dodds Blog',
        url: (0, misc_tsx_1.getUrl)(requestInfo),
        image: (0, images_tsx_1.getSocialImageWithPreTitle)({
            url: (0, misc_tsx_1.getDisplayUrl)(requestInfo),
            featuredImage: images_tsx_1.images.skis.id,
            preTitle: 'Check out this Blog',
            title: "Priceless insights, ideas, and experiences for your dev work",
        }),
        ogType: 'website',
    });
};
exports.meta = meta;
// should be divisible by 3 and 2 (large screen, and medium screen).
var PAGE_SIZE = 12;
var initialIndexToShow = PAGE_SIZE;
var specialQueryRegex = /(?<not>!)?leader:(?<team>\w+)(\s|$)?/g;
function BlogHome() {
    var _a, _b;
    var requestInfo = (0, use_root_data_ts_1.useRootData)().requestInfo;
    var searchParams = (0, react_1.useSearchParams)()[0];
    var _c = React.useState('unset'), userReadsState = _c[0], setUserReadsState = _c[1];
    var searchInputRef = React.useRef(null);
    var userTeam = (0, team_provider_tsx_1.useTeam)()[0];
    var resultsRef = React.useRef(null);
    /**
     * This is here to make sure that a user doesn't hit "enter" on the search
     * button, which focuses the input and then keyup the enter on the input
     * which will trigger the scroll down. We should *only* scroll when the
     * "enter" keypress and keyup happen on the input.
     */
    var ignoreInputKeyUp = React.useRef(false);
    var _d = React.useState(function () {
        var _a;
        return (_a = searchParams.get('q')) !== null && _a !== void 0 ? _a : '';
    }), queryValue = _d[0], setQuery = _d[1];
    var query = queryValue.trim();
    (0, misc_tsx_1.useUpdateQueryStringValueWithoutNavigation)('q', query);
    var data = (0, react_1.useLoaderData)();
    var allPosts = data.posts, userReads = data.userReads;
    var getLeadingTeamForSlug = React.useCallback(function (slug) {
        var _a;
        return (_a = (0, blog_ts_1.getRankingLeader)(data.allPostReadRankings[slug])) === null || _a === void 0 ? void 0 : _a.team;
    }, [data.allPostReadRankings]);
    var regularQuery = query.replace(specialQueryRegex, '').trim();
    var matchingPosts = React.useMemo(function () {
        var _a;
        var r = new RegExp(specialQueryRegex);
        var match = r.exec(query);
        var leaders = [];
        var nonLeaders = [];
        while (match) {
            var _b = (_a = match.groups) !== null && _a !== void 0 ? _a : {}, team = _b.team, not = _b.not;
            var upperTeam = team === null || team === void 0 ? void 0 : team.toUpperCase();
            if ((0, misc_tsx_1.isTeam)(upperTeam)) {
                if (not) {
                    nonLeaders.push(upperTeam);
                }
                else {
                    leaders.push(upperTeam);
                }
            }
            match = r.exec(query);
        }
        var filteredPosts = allPosts;
        filteredPosts =
            userReadsState === 'unset'
                ? filteredPosts
                : filteredPosts.filter(function (post) {
                    var isRead = userReads.includes(post.slug);
                    if (userReadsState === 'read' && !isRead)
                        return false;
                    if (userReadsState === 'unread' && isRead)
                        return false;
                    return true;
                });
        filteredPosts =
            leaders.length || nonLeaders.length
                ? filteredPosts.filter(function (post) {
                    var leader = getLeadingTeamForSlug(post.slug);
                    if (leaders.length && leader && leaders.includes(leader)) {
                        return true;
                    }
                    if (nonLeaders.length &&
                        (!leader || !nonLeaders.includes(leader))) {
                        return true;
                    }
                    return false;
                })
                : filteredPosts;
        return (0, blog_ts_1.filterPosts)(filteredPosts, regularQuery);
    }, [
        allPosts,
        query,
        regularQuery,
        getLeadingTeamForSlug,
        userReadsState,
        userReads,
    ]);
    var _e = React.useState(initialIndexToShow), indexToShow = _e[0], setIndexToShow = _e[1];
    // when the query changes, we want to reset the index
    React.useEffect(function () {
        setIndexToShow(initialIndexToShow);
    }, [query]);
    // this bit is very similar to what's on the blogs page.
    // Next time we need to do work in here, let's make an abstraction for them
    function toggleTag(tag) {
        setQuery(function (q) {
            // create a regexp so that we can replace multiple occurrences (`react node react`)
            var expression = new RegExp(tag, 'ig');
            var newQuery = expression.test(q)
                ? q.replace(expression, '')
                : "".concat(q, " ").concat(tag);
            // trim and remove subsequent spaces (`react   node ` => `react node`)
            return newQuery.replace(/\s+/g, ' ').trim();
        });
    }
    function toggleTeam(team) {
        team = team.toLowerCase();
        var newSpecialQuery = '';
        if (query.includes("!leader:".concat(team))) {
            newSpecialQuery = '';
        }
        else if (query.includes("leader:".concat(team))) {
            newSpecialQuery = "!leader:".concat(team);
        }
        else {
            newSpecialQuery = "leader:".concat(team);
        }
        setQuery("".concat(newSpecialQuery, " ").concat(regularQuery).trim());
    }
    var isSearching = query.length > 0 || userReadsState !== 'unset';
    var posts = isSearching
        ? matchingPosts.slice(0, indexToShow)
        : matchingPosts
            .filter(function (p) { var _a; return p.slug !== ((_a = data.recommended) === null || _a === void 0 ? void 0 : _a.slug); })
            .slice(0, indexToShow);
    var hasMorePosts = isSearching
        ? indexToShow < matchingPosts.length
        : indexToShow < matchingPosts.length - 1;
    var visibleTags = isSearching
        ? new Set(matchingPosts
            .flatMap(function (post) { return post.frontmatter.categories; })
            .filter(Boolean))
        : new Set(data.tags);
    // this is a remix bug
    var recommendedPermalink = data.recommended
        ? "".concat(requestInfo.origin, "/blog/").concat(data.recommended.slug)
        : undefined;
    var checkboxLabel = userReadsState === 'read'
        ? 'Showing only posts you have not read'
        : userReadsState === 'unread'
            ? "Showing only posts you have read"
            : "Showing all posts";
    var searchInputPlaceholder = userReadsState === 'read'
        ? 'Search posts you have read'
        : userReadsState === 'unread'
            ? 'Search posts you have not read'
            : 'Search posts';
    return (<div className={data.overallLeadingTeam
            ? "set-color-team-current-".concat(data.overallLeadingTeam.toLowerCase())
            : ''}>
			<hero_section_tsx_1.HeroSection title="Learn development with great articles." subtitle={<>
						<span>{"Find the latest of my writing here."}</span>
						<react_1.Link reloadDocument to="rss.xml" className="text-secondary underlined ml-2 inline-block hover:text-team-current focus:text-team-current">
							<icons_tsx_1.RssIcon title="Get my blog as RSS"/>
						</react_1.Link>
					</>} imageBuilder={images_tsx_1.images.skis} action={<div className="w-full">
						<form action="/blog" method="GET" onSubmit={function (e) { return e.preventDefault(); }}>
							<div className="relative">
								<button title={query === '' ? 'Search' : 'Clear search'} type="button" onClick={function () {
                var _a;
                setQuery('');
                ignoreInputKeyUp.current = true;
                (_a = searchInputRef.current) === null || _a === void 0 ? void 0 : _a.focus();
            }} onKeyDown={function () {
                ignoreInputKeyUp.current = true;
            }} onKeyUp={function () {
                ignoreInputKeyUp.current = false;
            }} className={(0, clsx_1.clsx)('absolute left-6 top-0 flex h-full items-center justify-center border-none bg-transparent p-0 text-slate-500', {
                'cursor-pointer': query !== '',
                'cursor-default': query === '',
            })}>
									<icons_tsx_1.SearchIcon />
								</button>
								<input ref={searchInputRef} type="search" value={queryValue} onChange={function (event) {
                return setQuery(event.currentTarget.value.toLowerCase());
            }} onKeyUp={function (e) {
                var _a, _b, _c;
                if (!ignoreInputKeyUp.current && e.key === 'Enter') {
                    (_b = (_a = resultsRef.current) === null || _a === void 0 ? void 0 : _a.querySelector('a')) === null || _b === void 0 ? void 0 : _b.focus({ preventScroll: true });
                    (_c = resultsRef.current) === null || _c === void 0 ? void 0 : _c.scrollIntoView({ behavior: 'smooth' });
                }
                ignoreInputKeyUp.current = false;
            }} name="q" placeholder={searchInputPlaceholder} className="text-primary bg-primary border-secondary focus:bg-secondary w-full appearance-none rounded-full border py-6 pl-14 pr-6 text-lg font-medium hover:border-team-current focus:border-team-current focus:outline-none md:pr-24"/>
								<div className="absolute right-6 top-0 hidden h-full w-14 items-center justify-between text-lg font-medium text-slate-500 md:flex">
									<checkbox_1.MixedCheckbox title={checkboxLabel} aria-label={checkboxLabel} onChange={function () {
                setUserReadsState(function (s) {
                    if (s === 'unset')
                        return 'unread';
                    if (s === 'unread')
                        return 'read';
                    return 'unset';
                });
            }} checked={userReadsState === 'unset'
                ? 'mixed'
                : userReadsState === 'read'}/>
									<div className="flex-1"/>
									{matchingPosts.length}
								</div>
							</div>
						</form>
					</div>}/>

			<grid_tsx_1.Grid className="mb-14">
				<div className="relative col-span-full h-20">
					<div className="absolute">
						<team_stats_tsx_1.TeamStats totalReads={data.totalReads} rankings={data.readRankings} pull="left" direction="down" onStatClick={toggleTeam}/>
					</div>
				</div>

				<spacer_tsx_1.Spacer size="2xs" className="col-span-full"/>

				<typography_tsx_1.Paragraph className="col-span-full" prose={false}>
					{data.overallLeadingTeam ? (<>
							{"The "}
							<strong className={"text-team-current set-color-team-current-".concat(data.overallLeadingTeam.toLowerCase())}>
								{data.overallLeadingTeam.toLowerCase()}
							</strong>
							{" team is in the lead. "}
							{userTeam === 'UNKNOWN' ? (<>
									<react_1.Link to="/login" className="underlined">
										Login or sign up
									</react_1.Link>
									{" to choose your team!"}
								</>) : userTeam === data.overallLeadingTeam ? ("That's your team! Keep your lead!") : (<>
									{"Keep reading to get the "}
									<strong className={"text-team-current set-color-team-current-".concat(userTeam.toLowerCase())}>
										{userTeam.toLowerCase()}
									</strong>{' '}
									{" team on top!"}
								</>)}
						</>) : ("No team is in the lead! Read read read!")}
				</typography_tsx_1.Paragraph>

				<spacer_tsx_1.Spacer size="xs" className="col-span-full"/>

				{data.tags.length > 0 ? (<>
						<typography_tsx_1.H6 as="div" className="col-span-full mb-6">
							Search blog by topics
						</typography_tsx_1.H6>
						<div className="col-span-full -mb-4 -mr-4 flex flex-wrap lg:col-span-10">
							{data.tags.map(function (tag) {
                var selected = regularQuery.includes(tag);
                return (<tag_tsx_1.Tag key={tag} tag={tag} selected={selected} onClick={function () { return toggleTag(tag); }} disabled={Boolean(!visibleTags.has(tag)) ? !selected : false}/>);
            })}
						</div>
					</>) : null}
			</grid_tsx_1.Grid>

			{/* this is a remix bug */}
			
			{!isSearching && data.recommended ? (<div className="mb-10">
					<featured_section_tsx_1.FeaturedSection subTitle={[
                data.recommended.dateDisplay,
                (_b = (_a = data.recommended.readTime) === null || _a === void 0 ? void 0 : _a.text) !== null && _b !== void 0 ? _b : 'quick read',
            ]
                .filter(Boolean)
                .join(' — ')} title={data.recommended.frontmatter.title} blurDataUrl={data.recommended.frontmatter.bannerBlurDataUrl} imageBuilder={data.recommended.frontmatter.bannerCloudinaryId
                ? (0, images_tsx_1.getImageBuilder)(data.recommended.frontmatter.bannerCloudinaryId, (0, mdx_tsx_1.getBannerAltProp)(data.recommended.frontmatter))
                : undefined} caption="Featured article" cta="Read full article" slug={data.recommended.slug} permalink={recommendedPermalink} leadingTeam={getLeadingTeamForSlug(data.recommended.slug)}/>
				</div>) : null}

			<grid_tsx_1.Grid className="mb-64" ref={resultsRef}>
				{posts.length === 0 ? (<div className="col-span-full flex flex-col items-center">
						<img {...(0, images_tsx_1.getImgProps)(images_tsx_1.images.bustedOnewheel, {
            className: 'mt-24 h-auto w-full max-w-lg',
            widths: [350, 512, 1024, 1536],
            sizes: ['(max-width: 639px) 80vw', '512px'],
        })}/>
						<typography_tsx_1.H3 as="p" variant="secondary" className="mt-24 max-w-lg">
							{"Couldn't find anything to match your criteria. Sorry."}
						</typography_tsx_1.H3>
					</div>) : (posts.map(function (article) { return (<div key={article.slug} className="col-span-4 mb-10">
							<article_card_tsx_1.ArticleCard article={article} leadingTeam={getLeadingTeamForSlug(article.slug)}/>
						</div>); }))}
			</grid_tsx_1.Grid>

			{hasMorePosts ? (<div className="mb-64 flex w-full justify-center">
					<button_tsx_1.Button variant="secondary" onClick={function () { return setIndexToShow(function (i) { return i + PAGE_SIZE; }); }}>
						<span>Load more articles</span> <icons_tsx_1.PlusIcon />
					</button_tsx_1.Button>
				</div>) : null}

			<grid_tsx_1.Grid>
				<div className="col-span-full lg:col-span-5">
					<img {...(0, images_tsx_1.getImgProps)(images_tsx_1.images.kayak, {
        widths: [350, 512, 1024, 1536],
        sizes: [
            '80vw',
            '(min-width: 1024px) 30vw',
            '(min-width:1620px) 530px',
        ],
    })}/>
				</div>

				<div className="col-span-full mt-4 lg:col-span-6 lg:col-start-7 lg:mt-0">
					<typography_tsx_1.H2 className="mb-8">{"More of a listener?"}</typography_tsx_1.H2>
					<typography_tsx_1.H2 className="mb-16" variant="secondary" as="p">
						{"\n              Check out my podcast Chats with Kent and learn about software\n              development, career, life, and more.\n            "}
					</typography_tsx_1.H2>
					<arrow_button_tsx_1.ArrowLink to="/chats">{"Check out the podcast"}</arrow_button_tsx_1.ArrowLink>
				</div>
			</grid_tsx_1.Grid>
		</div>);
}
exports.default = BlogHome;
function ErrorBoundary() {
    var error = (0, misc_tsx_1.useCapturedRouteError)();
    console.error(error);
    return <errors_tsx_1.ServerError />;
}
/*
eslint
  complexity: "off",
*/
