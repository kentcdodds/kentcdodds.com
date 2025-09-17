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
var tabs_1 = require("@reach/tabs");
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var clsx_1 = require("clsx");
var React = require("react");
var grid_tsx_1 = require("#app/components/grid.tsx");
var icons_tsx_1 = require("#app/components/icons.tsx");
var podcast_subs_tsx_1 = require("#app/components/podcast-subs.tsx");
var blog_section_tsx_1 = require("#app/components/sections/blog-section.tsx");
var featured_section_tsx_1 = require("#app/components/sections/featured-section.tsx");
var hero_section_tsx_1 = require("#app/components/sections/hero-section.tsx");
var spacer_tsx_1 = require("#app/components/spacer.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var external_links_tsx_1 = require("#app/external-links.tsx");
var images_tsx_1 = require("#app/images.tsx");
var blog_server_ts_1 = require("#app/utils/blog.server.ts");
var chats_with_kent_ts_1 = require("#app/utils/chats-with-kent.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var providers_tsx_1 = require("#app/utils/providers.tsx");
var seo_ts_1 = require("#app/utils/seo.ts");
var simplecast_server_ts_1 = require("#app/utils/simplecast.server.ts");
var timing_server_ts_1 = require("#app/utils/timing.server.ts");
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var timings, blogRecommendations, _c;
        var _d;
        var request = _b.request;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    timings = {};
                    return [4 /*yield*/, (0, blog_server_ts_1.getBlogRecommendations)({ request: request, timings: timings })];
                case 1:
                    blogRecommendations = _e.sent();
                    _c = node_1.json;
                    _d = {};
                    return [4 /*yield*/, (0, simplecast_server_ts_1.getSeasonListItems)({ request: request })];
                case 2: return [2 /*return*/, _c.apply(void 0, [(
                        // we show the seasons in reverse order
                        _d.seasons = (_e.sent()).reverse(),
                            _d.blogRecommendations = blogRecommendations,
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
    var data = _a.data, matches = _a.matches;
    var seasons = (data !== null && data !== void 0 ? data : {}).seasons;
    if (!seasons) {
        return [{ title: 'Chats with Kent Seasons not found' }];
    }
    var episodeCount = seasons.reduce(function (acc, season) { return acc + season.episodes.length; }, 0);
    var requestInfo = (_b = matches.find(function (m) { return m.id === 'root'; })) === null || _b === void 0 ? void 0 : _b.data.requestInfo;
    return (0, seo_ts_1.getSocialMetas)({
        title: 'Chats with Kent C. Dodds Podcast',
        description: "Become a better person with ".concat(episodeCount, " interesting and actionable conversations with interesting people."),
        keywords: "chats with kent, kent c. dodds",
        url: (0, misc_tsx_1.getUrl)(requestInfo),
        image: (0, images_tsx_1.getGenericSocialImage)({
            words: 'Listen to the Chats with Kent Podcast',
            featuredImage: images_tsx_1.images.kayak.id,
            url: (0, misc_tsx_1.getDisplayUrl)({
                origin: (0, misc_tsx_1.getOrigin)(requestInfo),
                path: '/chats',
            }),
        }),
    });
};
exports.meta = meta;
function PodcastHome() {
    var _a, _b;
    var _c = React.useState('asc'), sortOrder = _c[0], setSortOrder = _c[1];
    var navigate = (0, react_1.useNavigate)();
    var data = (0, react_1.useLoaderData)();
    var matches = (0, react_1.useMatches)();
    var last = matches[matches.length - 1];
    var seasonNumber = (last === null || last === void 0 ? void 0 : last.params.season)
        ? Number(last.params.season)
        : // we use the first one because the seasons are in reverse order
            // oh, and this should never happen anyway because we redirect
            // in the event there's no season param. But it's just to be safe.
            ((_b = (_a = data.seasons[0]) === null || _a === void 0 ? void 0 : _a.seasonNumber) !== null && _b !== void 0 ? _b : 1);
    var currentSeason = data.seasons.find(function (s) { return s.seasonNumber === seasonNumber; });
    var tabIndex = currentSeason ? data.seasons.indexOf(currentSeason) : 0;
    function handleTabChange(index) {
        var chosenSeason = data.seasons[index];
        if (chosenSeason) {
            navigate(String(chosenSeason.seasonNumber).padStart(2, '0'), {
                preventScrollReset: true,
            });
        }
    }
    var allEpisodes = data.seasons.flatMap(function (s) { return s.episodes; });
    var featured = (0, chats_with_kent_ts_1.getFeaturedEpisode)(allEpisodes);
    return (<>
			<hero_section_tsx_1.HeroSection title="Listen to chats with Kent C. Dodds here." subtitle="Find all episodes of my podcast below." imageBuilder={images_tsx_1.images.kayak} imageSize="large"/>

			<grid_tsx_1.Grid>
				<typography_tsx_1.H6 as="div" className="col-span-full mb-6">
					Listen to the podcasts here
				</typography_tsx_1.H6>

				<podcast_subs_tsx_1.PodcastSubs apple={external_links_tsx_1.externalLinks.applePodcast} pocketCasts={external_links_tsx_1.externalLinks.pocketCasts} spotify={external_links_tsx_1.externalLinks.spotify} rss={external_links_tsx_1.externalLinks.simpleCast}/>
			</grid_tsx_1.Grid>

			{featured ? (<>
					<spacer_tsx_1.Spacer size="xs"/>
					<featured_section_tsx_1.FeaturedSection cta="Listen to this episode" caption="Featured episode" subTitle={"Season ".concat(featured.seasonNumber, " Episode ").concat(featured.episodeNumber, " \u2014 ").concat((0, misc_tsx_1.formatDuration)(featured.duration))} title={featured.title} href={(0, chats_with_kent_ts_1.getCWKEpisodePath)(featured)} imageUrl={featured.image} imageAlt={(0, misc_tsx_1.listify)(featured.guests.map(function (g) { return g.name; }))}/>
				</>) : null}

			<spacer_tsx_1.Spacer size="base"/>

			<grid_tsx_1.Grid>
				<div className="col-span-full lg:col-span-6">
					<img title="Photo by Jukka Aalho / Kertojan ääni: https://kertojanaani.fi" {...(0, images_tsx_1.getImgProps)((0, images_tsx_1.getImageBuilder)('unsplash/photo-1590602847861-f357a9332bbc', 'A SM7B Microphone'), {
        className: 'rounded-lg object-cover',
        widths: [512, 650, 840, 1024, 1300, 1680, 2000, 2520],
        sizes: [
            '(max-width: 1023px) 80vw',
            '(min-width: 1024px) and (max-width: 1620px) 40vw',
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
				<spacer_tsx_1.Spacer size="xs" className="col-span-full block lg:hidden"/>
				<div className="col-span-full lg:col-span-5 lg:col-start-8">
					<typography_tsx_1.H4 as="p">{"What's this all about?"}</typography_tsx_1.H4>
					<div className="flex flex-col gap-3">
						<typography_tsx_1.Paragraph>
							{"The goal of the Chats with Kent Podcast is to "}
							<strong>help you become a better person.</strong>
							{"\n                With each episode, there's a key takeaway and a specific action\n                item to help you on your path to becoming the best person you\n                can be.\n              "}
						</typography_tsx_1.Paragraph>
						<typography_tsx_1.Paragraph>
							{"\n                Before each show, I ask the guest to share with me the change\n                they would like to see in the world. Any change at all. Whether\n                it's related to software development or not. And then we\n                brainstorm a specific thing we can invite you to do at the end\n                of the show to help push that change in the world along.\n                Something small, but meaningful.\n              "}
						</typography_tsx_1.Paragraph>
						<typography_tsx_1.Paragraph>
							{"\n                Once we know what we want to commit you to, I kick things off\n                and try to steer the conversation in a direction that will\n                prepare you to accept that invitation and hopefully help you\n                make that change in your life. I hope you take advantage of this\n                opportunity.\n              "}
						</typography_tsx_1.Paragraph>
						<typography_tsx_1.Paragraph>{"Enjoy the show."}</typography_tsx_1.Paragraph>
					</div>
				</div>
			</grid_tsx_1.Grid>

			<spacer_tsx_1.Spacer size="base"/>

			<tabs_1.Tabs as={grid_tsx_1.Grid} className="mb-24 lg:mb-64" index={tabIndex} onChange={handleTabChange}>
				<tabs_1.TabList className="col-span-full mb-20 flex flex-col items-start bg-transparent lg:flex-row lg:space-x-12">
					{data.seasons.map(function (season) { return (<tabs_1.Tab key={season.seasonNumber} 
        // Because we have a link right under the tab, we'll keep this off
        // the tab "tree" and rely on focusing/activating the link.
        tabIndex={-1} className="border-none p-0 text-4xl leading-tight focus:bg-transparent focus:outline-none">
							{/*
The link is here for progressive enhancement. Even though this
is a tab, it's actually navigating to a route, so semantically
it should be a link. By making it a link, it'll work with JS
off, but more importantly it'll allow people to meta-click it.
*/}
							<react_1.Link preventScrollReset className={(0, clsx_1.clsx)('hover:text-primary focus:text-primary focus:outline-none', {
                'text-primary': season.seasonNumber === seasonNumber,
                'text-slate-500': season.seasonNumber !== seasonNumber,
            })} to={String(season.seasonNumber).padStart(2, '0')} onClick={function (e) {
                if (e.metaKey) {
                    e.stopPropagation();
                }
                else {
                    e.preventDefault();
                }
            }}>
								{"Season ".concat(season.seasonNumber)}
							</react_1.Link>
						</tabs_1.Tab>); })}
				</tabs_1.TabList>

				{currentSeason ? (<div className="col-span-full mb-6 flex flex-col lg:mb-12 lg:flex-row lg:justify-between">
						<typography_tsx_1.H6 as="h2" className="col-span-full mb-10 flex flex-col lg:mb-0 lg:flex-row">
							<span>Chats with Kent C. Dodds</span>
							&nbsp;
							<span>{"Season ".concat(currentSeason.seasonNumber, " \u2014 ").concat(currentSeason.episodes.length, " episodes")}</span>
						</typography_tsx_1.H6>

						<button className="text-primary group relative text-lg font-medium focus:outline-none" onClick={function () {
                return setSortOrder(function (o) { return (o === 'asc' ? 'desc' : 'asc'); });
            }}>
							<div className="bg-secondary absolute -bottom-2 -left-4 -right-4 -top-2 rounded-lg opacity-0 transition group-hover:opacity-100 group-focus:opacity-100"/>
							<span className="relative inline-flex items-center">
								{sortOrder === 'asc' ? (<>
										Showing oldest first
										<icons_tsx_1.ChevronUpIcon className="ml-2 text-gray-400"/>
									</>) : (<>
										Showing newest first
										<icons_tsx_1.ChevronDownIcon className="ml-2 text-gray-400"/>
									</>)}
							</span>
						</button>
					</div>) : null}

				<tabs_1.TabPanels className="col-span-full">
					{data.seasons.map(function (season) { return (<tabs_1.TabPanel key={season.seasonNumber} className="border-t border-gray-200 focus:outline-none dark:border-gray-600">
							<providers_tsx_1.ChatsEpisodeUIStateProvider value={{ sortOrder: sortOrder }}>
								<react_1.Outlet />
							</providers_tsx_1.ChatsEpisodeUIStateProvider>
						</tabs_1.TabPanel>); })}
				</tabs_1.TabPanels>
			</tabs_1.Tabs>

			<blog_section_tsx_1.BlogSection articles={data.blogRecommendations} title="Looking for more content?" description="Have a look at these articles."/>
		</>);
}
exports.default = PodcastHome;
