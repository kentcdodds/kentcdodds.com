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
exports.headers = exports.meta = exports.handle = void 0;
exports.loader = loader;
exports.default = PodcastDetail;
exports.ErrorBoundary = ErrorBoundary;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var clsx_1 = require("clsx");
var framer_motion_1 = require("framer-motion");
var react_2 = require("react");
var vite_env_only_1 = require("vite-env-only");
var arrow_button_tsx_1 = require("#app/components/arrow-button.tsx");
var errors_tsx_1 = require("#app/components/errors.tsx");
var grid_tsx_1 = require("#app/components/grid.tsx");
var icon_link_tsx_1 = require("#app/components/icon-link.tsx");
var icons_tsx_1 = require("#app/components/icons.tsx");
var featured_section_tsx_1 = require("#app/components/sections/featured-section.tsx");
var spacer_tsx_1 = require("#app/components/spacer.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var images_tsx_1 = require("#app/images.tsx");
var chats_with_kent_ts_1 = require("#app/utils/chats-with-kent.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var seo_ts_1 = require("#app/utils/seo.ts");
var simplecast_server_ts_1 = require("#app/utils/simplecast.server.ts");
var theme_tsx_1 = require("#app/utils/theme.tsx");
var timing_server_ts_1 = require("#app/utils/timing.server.ts");
var use_root_data_ts_1 = require("#app/utils/use-root-data.ts");
exports.handle = {
    getSitemapEntries: (0, vite_env_only_1.serverOnly$)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
        var seasons;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, simplecast_server_ts_1.getSeasons)({ request: request })];
                case 1:
                    seasons = _a.sent();
                    return [2 /*return*/, seasons.flatMap(function (season) {
                            return season.episodes.map(function (episode) {
                                var s = String(season.seasonNumber).padStart(2, '0');
                                var e = String(episode.episodeNumber).padStart(2, '0');
                                return {
                                    route: "/chats/".concat(s, "/").concat(e, "/").concat(episode.slug),
                                    changefreq: 'weekly',
                                    lastmod: new Date(episode.updatedAt).toISOString(),
                                    priority: 0.4,
                                };
                            });
                        })];
            }
        });
    }); }),
};
var meta = function (_a) {
    var _b, _c, _d;
    var data = _a.data, matches = _a.matches;
    var episode = data === null || data === void 0 ? void 0 : data.episode;
    var requestInfo = (_b = matches.find(function (m) { return m.id === 'root'; })) === null || _b === void 0 ? void 0 : _b.data.requestInfo;
    if (!episode) {
        return [{ title: 'Chats with Kent Episode not found' }];
    }
    var description = episode.description, image = episode.image, mediaUrl = episode.mediaUrl, simpleCastId = episode.simpleCastId, episodeNumber = episode.episodeNumber, seasonNumber = episode.seasonNumber;
    var title = "".concat(episode.title, " | Chats with Kent Podcast | ").concat(episodeNumber);
    var playerUrl = "https://player.simplecast.com/".concat(simpleCastId);
    return __spreadArray(__spreadArray([], (0, seo_ts_1.getSocialMetas)({
        title: title,
        description: description,
        keywords: "chats with kent, kent c. dodds, ".concat((_d = (_c = episode.meta) === null || _c === void 0 ? void 0 : _c.keywords) !== null && _d !== void 0 ? _d : ''),
        url: (0, misc_tsx_1.getUrl)(requestInfo),
        image: (0, images_tsx_1.getSocialImageWithPreTitle)({
            title: episode.title,
            preTitle: 'Check out this Podcast',
            featuredImage: image,
            url: (0, misc_tsx_1.getDisplayUrl)({
                origin: (0, misc_tsx_1.getOrigin)(requestInfo),
                path: (0, chats_with_kent_ts_1.getCWKEpisodePath)({ seasonNumber: seasonNumber, episodeNumber: episodeNumber }),
            }),
        }),
    }), true), [
        { 'twitter:card': 'player' },
        { 'twitter:player': playerUrl },
        { 'twitter:player:width': '436' },
        { 'twitter:player:height': '196' },
        { 'twitter:player:stream': mediaUrl },
        { 'twitter:player:stream:content_type': 'audio/mpeg' },
    ], false);
};
exports.meta = meta;
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var timings, seasonNumber, episodeNumber, seasons, season, episode;
        var _c, _d;
        var request = _b.request, params = _b.params;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    timings = {};
                    seasonNumber = Number(params.season);
                    episodeNumber = Number(params.episode);
                    return [4 /*yield*/, (0, simplecast_server_ts_1.getSeasons)({ request: request, timings: timings })];
                case 1:
                    seasons = _e.sent();
                    season = seasons.find(function (s) { return s.seasonNumber === seasonNumber; });
                    if (!season) {
                        throw new Response("Season ".concat(seasonNumber, " not found"), { status: 404 });
                    }
                    episode = season.episodes.find(function (e) { return e.episodeNumber === episodeNumber; });
                    if (!episode) {
                        throw new Response("Episode ".concat(episodeNumber, " not found"), { status: 404 });
                    }
                    // we don't actually need the slug, but we'll redirect them to the place
                    // with the slug so the URL looks correct.
                    if (episode.slug !== params.slug) {
                        return [2 /*return*/, (0, node_1.redirect)("/chats/".concat(params.season, "/").concat(params.episode, "/").concat(episode.slug))];
                    }
                    return [2 /*return*/, (0, node_1.json)({
                            prevEpisode: (_c = season.episodes.find(function (e) { return e.episodeNumber === episodeNumber - 1; })) !== null && _c !== void 0 ? _c : null,
                            nextEpisode: (_d = season.episodes.find(function (e) { return e.episodeNumber === episodeNumber + 1; })) !== null && _d !== void 0 ? _d : null,
                            featured: (0, chats_with_kent_ts_1.getFeaturedEpisode)(season.episodes.filter(function (e) { return episode !== e; })),
                            episode: episode,
                        }, {
                            headers: {
                                'Cache-Control': 'public, max-age=600',
                                Vary: 'Cookie',
                                'Server-Timing': (0, timing_server_ts_1.getServerTimeHeader)(timings),
                            },
                        })];
            }
        });
    });
}
exports.headers = misc_tsx_1.reuseUsefulLoaderHeaders;
function Homework(_a) {
    var _b = _a.homeworkHTMLs, homeworkHTMLs = _b === void 0 ? [] : _b;
    return (<div className="bg-secondary w-full rounded-lg p-10 pb-16">
			<typography_tsx_1.H6 as="h4" className="mb-8 inline-flex items-center space-x-4">
				<icons_tsx_1.ClipboardIcon />
				<span>Homework</span>
			</typography_tsx_1.H6>

			<ul className="text-primary html -mb-10 text-lg font-medium">
				{homeworkHTMLs.map(function (homeworkHTML) { return (<li key={homeworkHTML} className="border-secondary flex border-t pb-10 pt-8">
						<icons_tsx_1.CheckCircledIcon className="mr-6 flex-none text-gray-400 dark:text-gray-600" size={24}/>

						<div dangerouslySetInnerHTML={{ __html: homeworkHTML }}/>
					</li>); })}
			</ul>
		</div>);
}
function Resources(_a) {
    var _b = _a.resources, resources = _b === void 0 ? [] : _b;
    return (<div className="bg-secondary rounded-lg p-10 pb-16">
			<h4 className="text-primary mb-8 inline-flex items-center text-xl font-medium">
				Resources
			</h4>

			<ul className="text-secondary space-y-8 text-lg font-medium lg:space-y-2">
				{resources.map(function (resource) { return (<li key={resource.url}>
						<a href={resource.url} className="transition hover:text-team-current focus:text-team-current focus:outline-none">
							<span>{resource.name}</span>
							<span className="ml-4 mt-1 inline-block align-top">
								<icons_tsx_1.ArrowIcon size={26} direction="top-right"/>
							</span>
						</a>
					</li>); })}
			</ul>
		</div>);
}
function Guests(_a) {
    var episode = _a.episode;
    return (<>
			<h4 className="sr-only">Guests</h4>

			{episode.guests.map(function (guest) { return (<div key={guest.name} className="text-secondary bg-secondary flex flex-col rounded-lg p-10 pb-16 md:flex-row md:items-center md:pb-12">
					<img src={episode.image} alt={guest.name} className="mb-6 mr-8 h-20 w-20 flex-none rounded-lg object-cover md:mb-0"/>
					<div className="mb-6 w-full md:mb-0 md:flex-auto">
						<div className="text-primary mb-2 text-xl font-medium leading-none">
							{guest.name}
						</div>
						<p className="text-xl leading-none">{guest.company}</p>
					</div>
					<div className="flex flex-none space-x-4">
						{guest.x ? (<a target="_blank" rel="noreferrer noopener" href={"https://x.com/".concat(guest.x)} aria-label="𝕏 profile">
								<icons_tsx_1.XIcon size={32}/>
							</a>) : null}

						{guest.github ? (<a target="_blank" rel="noreferrer noopener" href={"https://github.com/".concat(guest.github)} aria-label="github profile">
								<icons_tsx_1.GithubIcon size={32}/>
							</a>) : null}
					</div>
				</div>); })}
		</>);
}
function Transcript(_a) {
    var transcriptHTML = _a.transcriptHTML;
    var _b = (0, react_2.useState)(true), collapsed = _b[0], setCollapsed = _b[1];
    // re-collapse the transcript when changing the episode
    var location = (0, react_1.useLocation)();
    react_2.default.useEffect(function () {
        setCollapsed(true);
    }, [location.key]);
    return (<div className="bg-secondary col-span-full rounded-lg p-10 pb-16">
			<h4 className="text-primary mb-8 inline-flex items-center text-xl font-medium">
				Transcript
			</h4>

			<div className={(0, clsx_1.clsx)('prose prose-light relative overflow-hidden dark:prose-dark', {
            'max-h-96': collapsed,
        })}>
				<div dangerouslySetInnerHTML={{ __html: transcriptHTML }}/>

				{collapsed ? (<div className="absolute bottom-0 h-48 w-full bg-gradient-to-b from-transparent to-gray-100 dark:to-gray-800"/>) : null}
			</div>
			{collapsed ? (<button onClick={function () { return setCollapsed(false); }} className="text-primary group mt-16 inline-flex items-center text-xl transition focus:outline-none">
					<span>Read the full transcript</span>
					<span className="group-hover:border-primary group-focus:border-primary ml-8 inline-flex h-14 w-14 flex-none items-center justify-center rounded-full border-2 border-gray-200 p-1 dark:border-gray-600">
						<icons_tsx_1.PlusIcon />
					</span>
				</button>) : null}
		</div>);
}
var imageVariants = {
    initial: {
        opacity: 1,
    },
    hover: {
        opacity: 0.2,
    },
};
var arrowVariants = {
    initial: {
        opacity: 0,
    },
    hover: {
        scale: 2,
        opacity: 1,
    },
    tapLeft: {
        x: -5,
        opacity: 0,
    },
    tapRight: {
        x: 5,
        opacity: 1,
    },
};
var MotionLink = (0, framer_motion_1.motion)(react_1.Link);
function PrevNextButton(_a) {
    var _b;
    var episodeListItem = _a.episodeListItem, direction = _a.direction;
    if (!episodeListItem) {
        return <div />; // return empty div for easy alignment
    }
    return (<MotionLink initial="initial" whileHover="hover" whileFocus="hover" whileTap={direction === 'next' ? 'tapRight' : 'tapLeft'} animate="initial" preventScrollReset to={(0, chats_with_kent_ts_1.getCWKEpisodePath)(episodeListItem)} className={(0, clsx_1.clsx)('flex items-start focus:outline-none', {
            'flex-row-reverse': direction === 'next',
        })}>
			<div className="relative mt-1 h-12 w-12 flex-none overflow-hidden rounded-lg">
				<framer_motion_1.motion.img variants={imageVariants} transition={{ duration: 0.2 }} className="h-full w-full object-cover" src={episodeListItem.image} alt={episodeListItem.title}/>
				<framer_motion_1.motion.div variants={arrowVariants} className="text-primary absolute inset-0 flex origin-center items-center justify-center">
					{direction === 'next' ? <icons_tsx_1.ChevronRightIcon /> : <icons_tsx_1.ChevronLeftIcon />}
				</framer_motion_1.motion.div>
			</div>
			<div className={(0, clsx_1.clsx)('flex flex-col', {
            'ml-4 items-start': direction === 'prev',
            'mr-4 items-end text-right': direction === 'next',
        })}>
				<p className="text-primary text-lg font-medium">
					{(_b = episodeListItem.guests[0]) === null || _b === void 0 ? void 0 : _b.name}
				</p>
				<h6 className="text-secondary text-lg font-medium">
					{"Episode ".concat(episodeListItem.episodeNumber)}
				</h6>
			</div>
		</MotionLink>);
}
function PodcastDetail() {
    var requestInfo = (0, use_root_data_ts_1.useRootData)().requestInfo;
    var _a = (0, react_1.useLoaderData)(), episode = _a.episode, featured = _a.featured, nextEpisode = _a.nextEpisode, prevEpisode = _a.prevEpisode;
    var permalink = "".concat(requestInfo.origin).concat((0, chats_with_kent_ts_1.getCWKEpisodePath)(episode));
    return (<>
			<grid_tsx_1.Grid className="mb-10 mt-24 lg:mb-24">
				<arrow_button_tsx_1.BackLink to="/chats" className="col-span-full lg:col-span-8 lg:col-start-3">
					Back to overview
				</arrow_button_tsx_1.BackLink>
			</grid_tsx_1.Grid>

			<grid_tsx_1.Grid as="header" className="mb-12">
				<typography_tsx_1.H2 className="col-span-full lg:col-span-8 lg:col-start-3">
					{episode.title}
				</typography_tsx_1.H2>
			</grid_tsx_1.Grid>

			<grid_tsx_1.Grid as="main" className="mb-24 lg:mb-64">
				<div className="col-span-full mb-16 lg:col-span-8 lg:col-start-3">
					<theme_tsx_1.Themed 
    // changing the theme while the player is going will cause it to
    // unload the player in the one theme and load it in the other
    // which is annoying.
    initialOnly={true} dark={<iframe className="mb-4" title="player" height="200px" width="100%" frameBorder="no" scrolling="no" seamless src={"https://player.simplecast.com/".concat(episode.simpleCastId, "?dark=true")}/>} light={<iframe className="mb-4" title="player" height="200px" width="100%" frameBorder="no" scrolling="no" seamless src={"https://player.simplecast.com/".concat(episode.simpleCastId, "?dark=false")}/>}/>

					<div className="flex justify-between">
						<PrevNextButton episodeListItem={prevEpisode} direction="prev"/>
						<PrevNextButton episodeListItem={nextEpisode} direction="next"/>
					</div>
				</div>

				<typography_tsx_1.H3 className="col-span-full lg:col-span-8 lg:col-start-3" dangerouslySetInnerHTML={{ __html: episode.descriptionHTML }}/>

				<spacer_tsx_1.Spacer size="3xs" className="col-span-full"/>

				<div className="col-span-full lg:col-span-8 lg:col-start-3">
					<icon_link_tsx_1.IconLink className="flex gap-2" target="_blank" rel="noreferrer noopener" href={"https://x.com/intent/post?".concat(new URLSearchParams({
            url: permalink,
            text: "I just listened to \"".concat(episode.title, "\" with ").concat((0, misc_tsx_1.listify)(episode.guests
                .map(function (g) { return (g.x ? "@".concat(g.x) : null); })
                .filter(misc_tsx_1.typedBoolean)), " on the Call Kent Podcast \uD83C\uDF99 by @kentcdodds"),
        }))}>
						<icons_tsx_1.XIcon title="Post this"/>
						<span>Post this episode</span>
					</icon_link_tsx_1.IconLink>
				</div>

				<spacer_tsx_1.Spacer size="2xs" className="col-span-full"/>

				<typography_tsx_1.Paragraph as="div" className="col-span-full space-y-6 lg:col-span-8 lg:col-start-3" dangerouslySetInnerHTML={{ __html: episode.summaryHTML }}/>

				<spacer_tsx_1.Spacer size="3xs" className="col-span-full"/>

				<div className="col-span-full space-y-4 lg:col-span-8 lg:col-start-3">
					{episode.homeworkHTMLs.length > 0 ? (<Homework homeworkHTMLs={episode.homeworkHTMLs}/>) : null}
					{episode.resources.length > 0 ? (<Resources resources={episode.resources}/>) : null}
					<Guests episode={episode}/>
					{episode.transcriptHTML ? (<Transcript transcriptHTML={episode.transcriptHTML}/>) : null}
				</div>
			</grid_tsx_1.Grid>

			<grid_tsx_1.Grid>
				<div className="col-span-full mb-20 flex flex-col space-y-10 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
					<div className="space-y-2 lg:space-y-0">
						<typography_tsx_1.H2>Sweet episode right?</typography_tsx_1.H2>
						<typography_tsx_1.H2 variant="secondary" as="p">
							You will love this one too.{' '}
						</typography_tsx_1.H2>
					</div>

					<arrow_button_tsx_1.ArrowLink to="/chats" direction="right">
						See all episodes
					</arrow_button_tsx_1.ArrowLink>
				</div>
			</grid_tsx_1.Grid>

			{featured ? (<featured_section_tsx_1.FeaturedSection cta="Listen to this episode" caption="Featured episode" subTitle={"Season ".concat(featured.seasonNumber, " Episode ").concat(featured.episodeNumber, " \u2014 ").concat((0, misc_tsx_1.formatDuration)(featured.duration))} title={featured.title} href={(0, chats_with_kent_ts_1.getCWKEpisodePath)(featured)} imageUrl={featured.image} imageAlt={(0, misc_tsx_1.listify)(featured.guests.map(function (g) { return g.name; }))}/>) : null}
		</>);
}
function ErrorBoundary() {
    var error = (0, misc_tsx_1.useCapturedRouteError)();
    if ((0, react_1.isRouteErrorResponse)(error)) {
        console.error('CatchBoundary', error);
        if (error.status === 404) {
            return <errors_tsx_1.FourOhFour />;
        }
        throw new Error("Unhandled error: ".concat(error.status));
    }
}
