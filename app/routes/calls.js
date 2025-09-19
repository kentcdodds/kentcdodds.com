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
exports.useCallsData = exports.meta = exports.headers = exports.getEpisodesBySeason = exports.handle = void 0;
exports.loader = loader;
exports.default = CallHomeScreen;
var tabs_1 = require("@reach/tabs");
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var clsx_1 = require("clsx");
var React = require("react");
var button_tsx_1 = require("#app/components/button.tsx");
var grid_tsx_1 = require("#app/components/grid.tsx");
var icons_tsx_1 = require("#app/components/icons.tsx");
var podcast_subs_tsx_1 = require("#app/components/podcast-subs.tsx");
var blog_section_tsx_1 = require("#app/components/sections/blog-section.tsx");
var hero_section_tsx_1 = require("#app/components/sections/hero-section.tsx");
var spacer_tsx_1 = require("#app/components/spacer.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var external_links_tsx_1 = require("#app/external-links.tsx");
var images_tsx_1 = require("#app/images.tsx");
var blog_server_ts_1 = require("#app/utils/blog.server.ts");
var lodash_ts_1 = require("#app/utils/cjs/lodash.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var providers_tsx_1 = require("#app/utils/providers.tsx");
var seo_ts_1 = require("#app/utils/seo.ts");
var timing_server_ts_1 = require("#app/utils/timing.server.ts");
var transistor_server_ts_1 = require("#app/utils/transistor.server.ts");
exports.handle = {
    id: 'calls',
};
var getEpisodesBySeason = function (episodes) {
    var groupedEpisodeBySeasons = (0, lodash_ts_1.groupBy)(episodes, 'seasonNumber');
    var seasons = [];
    Object.entries(groupedEpisodeBySeasons).forEach(function (_a) {
        var key = _a[0], value = _a[1];
        seasons.push({
            seasonNumber: +key,
            episodes: value,
        });
    });
    return seasons;
};
exports.getEpisodesBySeason = getEpisodesBySeason;
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var timings, _c, blogRecommendations, episodes, seasons, seasonNumber, season;
        var _d, _e;
        var request = _b.request;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    timings = {};
                    return [4 /*yield*/, Promise.all([
                            (0, blog_server_ts_1.getBlogRecommendations)({ request: request, timings: timings }),
                            (0, transistor_server_ts_1.getEpisodes)({ request: request, timings: timings }),
                        ])];
                case 1:
                    _c = _f.sent(), blogRecommendations = _c[0], episodes = _c[1];
                    seasons = (0, exports.getEpisodesBySeason)(episodes);
                    seasonNumber = (_e = (_d = seasons[seasons.length - 1]) === null || _d === void 0 ? void 0 : _d.seasonNumber) !== null && _e !== void 0 ? _e : 1;
                    season = seasons.find(function (s) { return s.seasonNumber === seasonNumber; });
                    if (!season) {
                        throw new Error("oh no. season for ".concat(seasonNumber));
                    }
                    return [2 /*return*/, (0, node_1.json)({ blogRecommendations: blogRecommendations, episodes: episodes }, {
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
    var matches = _a.matches;
    var requestInfo = (_b = matches.find(function (m) { return m.id === 'root'; })) === null || _b === void 0 ? void 0 : _b.data.requestInfo;
    return (0, seo_ts_1.getSocialMetas)({
        title: 'Call Kent Podcast',
        description: "Leave Kent an audio message here, then your message and Kent's response are published in the podcast.",
        keywords: 'podcast, call kent, call kent c. dodds, the call kent podcast',
        url: (0, misc_tsx_1.getUrl)(requestInfo),
        image: (0, images_tsx_1.getGenericSocialImage)({
            words: 'Listen to the Call Kent Podcast and make your own call.',
            featuredImage: images_tsx_1.images.microphone({
                // if we don't do this resize, the narrow microphone appears on the
                // far right of the social image
                resize: {
                    type: 'pad',
                    width: 1200,
                    height: 1200,
                },
            }),
            url: (0, misc_tsx_1.getDisplayUrl)({
                origin: (0, misc_tsx_1.getOrigin)(requestInfo),
                path: '/calls',
            }),
        }),
    });
};
exports.meta = meta;
function CallHomeScreen() {
    var _a, _b;
    var _c = React.useState('desc'), sortOrder = _c[0], setSortOrder = _c[1];
    var data = (0, react_1.useLoaderData)();
    var navigate = (0, react_1.useNavigate)();
    var groupedEpisodeBySeasons = (0, lodash_ts_1.groupBy)(data.episodes, 'seasonNumber');
    var seasons = [];
    Object.entries(groupedEpisodeBySeasons).forEach(function (_a) {
        var key = _a[0], value = _a[1];
        seasons.push({
            seasonNumber: +key,
            episodes: value,
        });
    });
    //show latest season first.
    seasons.reverse();
    var matches = (0, react_1.useMatches)();
    var last = matches[matches.length - 1];
    var seasonNumber = (last === null || last === void 0 ? void 0 : last.params.season)
        ? Number(last.params.season)
        : // we use the first one because the seasons are in reverse order
            // oh, and this should never happen anyway because we redirect
            // in the event there's no season param. But it's just to be safe.
            ((_b = (_a = seasons[0]) === null || _a === void 0 ? void 0 : _a.seasonNumber) !== null && _b !== void 0 ? _b : 1);
    var currentSeason = seasons.find(function (s) { return s.seasonNumber === seasonNumber; });
    var tabIndex = currentSeason ? seasons.indexOf(currentSeason) : 0;
    function handleTabChange(index) {
        var chosenSeason = seasons[index];
        if (chosenSeason) {
            navigate(String(chosenSeason.seasonNumber).padStart(2, '0'), {
                preventScrollReset: true,
            });
        }
    }
    return (<>
			<hero_section_tsx_1.HeroSection title="Calls with Kent C. Dodds." subtitle="You call, I'll answer." imageBuilder={images_tsx_1.images.microphone} arrowUrl="#episodes" arrowLabel="Take a listen" action={<button_tsx_1.ButtonLink variant="primary" to="./record" className="mr-auto">
						Record your call
					</button_tsx_1.ButtonLink>}/>

			<grid_tsx_1.Grid>
				<typography_tsx_1.H6 as="div" className="col-span-full mb-6">
					Listen to the podcasts here
				</typography_tsx_1.H6>

				<podcast_subs_tsx_1.PodcastSubs apple={external_links_tsx_1.externalLinks.callKentApple} pocketCasts={external_links_tsx_1.externalLinks.callKentPocketCasts} spotify={external_links_tsx_1.externalLinks.callKentSpotify} rss={external_links_tsx_1.externalLinks.callKentRSS}/>
			</grid_tsx_1.Grid>

			<spacer_tsx_1.Spacer size="base"/>

			<grid_tsx_1.Grid>
				<div className="col-span-full lg:col-span-6">
					<img title="Photo by Luke Southern" {...(0, images_tsx_1.getImgProps)((0, images_tsx_1.getImageBuilder)('unsplash/photo-1571079570759-8b8800f7c412', 'Phone sitting on a stool'), {
        className: 'w-full rounded-lg object-cover',
        widths: [512, 650, 840, 1024, 1300, 1680, 2000, 2520],
        sizes: [
            '(max-width: 1023px) 80vw',
            '(min-width: 1024px) and (max-width: 1620px) 40vw',
            '630px',
        ],
        transformations: {
            resize: {
                type: 'fill',
                aspectRatio: '4:3',
            },
        },
    })}/>
				</div>
				<spacer_tsx_1.Spacer size="xs" className="col-span-full block lg:hidden"/>
				<div className="col-span-full lg:col-span-5 lg:col-start-8">
					<typography_tsx_1.H4 as="p">{"What's this all about?"}</typography_tsx_1.H4>
					<div className="flex flex-col gap-3">
						<typography_tsx_1.Paragraph>
							{"The goal of the Call Kent Podcast is to "}
							<strong>get my answers to your questions.</strong>
							{"\n              You record your brief question (120 seconds or less) right from\n              your browser. Then I listen to it later and give my response,\n              and through the magic of technology (ffmpeg), our question\n              and answer are stitched together and published to the podcast\n              feed.\n            "}
						</typography_tsx_1.Paragraph>
						<typography_tsx_1.Paragraph>{"I look forward to hearing from you!"}</typography_tsx_1.Paragraph>
						<spacer_tsx_1.Spacer size="2xs"/>
						<button_tsx_1.ButtonLink variant="primary" to="./record">
							Record your call
						</button_tsx_1.ButtonLink>
					</div>
				</div>
			</grid_tsx_1.Grid>

			<spacer_tsx_1.Spacer size="base"/>

			<tabs_1.Tabs as={grid_tsx_1.Grid} className="mb-24 lg:mb-64" index={tabIndex} onChange={handleTabChange}>
				<tabs_1.TabList className="col-span-full mb-20 flex flex-col items-start bg-transparent lg:flex-row lg:space-x-12">
					{seasons.map(function (season) { return (<tabs_1.Tab key={season.seasonNumber} tabIndex={-1} className="border-none p-0 text-4xl leading-tight focus:bg-transparent focus:outline-none">
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
						<typography_tsx_1.H6 id="episodes" as="h2" className="col-span-full mb-10 flex flex-col lg:mb-0 lg:flex-row">
							<span>Calls with Kent C. Dodds</span>
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
					{seasons.map(function (season) { return (<tabs_1.TabPanel key={season.seasonNumber} className="border-t border-gray-200 focus:outline-none dark:border-gray-600">
							<providers_tsx_1.CallsEpisodeUIStateProvider value={{ sortOrder: sortOrder }}>
								<react_1.Outlet />
							</providers_tsx_1.CallsEpisodeUIStateProvider>
						</tabs_1.TabPanel>); })}
				</tabs_1.TabPanels>
			</tabs_1.Tabs>

			<blog_section_tsx_1.BlogSection articles={data.blogRecommendations} title="Looking for more content?" description="Have a look at these articles."/>
		</>);
}
var useCallsData = function () {
    return (0, providers_tsx_1.useMatchLoaderData)(exports.handle.id);
};
exports.useCallsData = useCallsData;
