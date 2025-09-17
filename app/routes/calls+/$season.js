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
exports.headers = exports.handle = void 0;
exports.loader = loader;
exports.default = CallsSeason;
exports.ErrorBoundary = ErrorBoundary;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var clsx_1 = require("clsx");
var framer_motion_1 = require("framer-motion");
var React = require("react");
var vite_env_only_1 = require("vite-env-only");
var errors_tsx_1 = require("#app/components/errors.tsx");
var grid_tsx_1 = require("#app/components/grid.tsx");
var icons_tsx_1 = require("#app/components/icons.tsx");
var kifs_tsx_1 = require("#app/components/kifs.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var call_kent_ts_1 = require("#app/utils/call-kent.ts");
var lodash_ts_1 = require("#app/utils/cjs/lodash.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var providers_tsx_1 = require("#app/utils/providers.tsx");
var timing_server_ts_1 = require("#app/utils/timing.server.ts");
var transistor_server_ts_1 = require("#app/utils/transistor.server.ts");
var calls_tsx_1 = require("../calls.tsx");
exports.handle = {
    getSitemapEntries: (0, vite_env_only_1.serverOnly$)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
        var episodes, seasons;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, transistor_server_ts_1.getEpisodes)({ request: request })];
                case 1:
                    episodes = _a.sent();
                    seasons = (0, calls_tsx_1.getEpisodesBySeason)(episodes);
                    return [2 /*return*/, seasons.map(function (season) {
                            return {
                                route: "/calls/".concat(season.seasonNumber.toString().padStart(2, '0')),
                                priority: 0.4,
                            };
                        })];
            }
        });
    }); }),
};
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var timings, episodes, seasons, seasonNumber, season;
        var params = _b.params, request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    timings = {};
                    return [4 /*yield*/, (0, transistor_server_ts_1.getEpisodes)({ request: request, timings: timings })];
                case 1:
                    episodes = _c.sent();
                    seasons = (0, calls_tsx_1.getEpisodesBySeason)(episodes);
                    seasonNumber = Number(params.season);
                    season = seasons.find(function (s) { return s.seasonNumber === seasonNumber; });
                    if (!season) {
                        throw new Response("No season for ".concat(params.season), { status: 404 });
                    }
                    return [2 /*return*/, (0, node_1.json)({ season: season }, {
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
function CallsSeason() {
    var season = (0, react_1.useLoaderData)().season;
    var matches = (0, react_1.useMatches)();
    var shouldReduceMotion = (0, framer_motion_1.useReducedMotion)();
    var sortOrder = (0, providers_tsx_1.useCallsEpisodeUIState)().sortOrder;
    var episodes = (0, lodash_ts_1.orderBy)(season.episodes, 'episodeNumber', sortOrder);
    var callPlayerMatch = matches.find(function (match) { var _a; return ((_a = match.handle) === null || _a === void 0 ? void 0 : _a.id) === 'call-player'; });
    var selectedEpisode;
    if (callPlayerMatch) {
        var callPlayerParams = callPlayerMatch.params;
        selectedEpisode = (0, call_kent_ts_1.getEpisodeFromParams)(episodes, callPlayerParams);
    }
    var initialSelectedEpisode = React.useRef(selectedEpisode);
    React.useEffect(function () {
        var _a;
        if (!initialSelectedEpisode.current)
            return;
        var href = (0, call_kent_ts_1.getEpisodePath)(initialSelectedEpisode.current);
        (_a = document.querySelector("[href=\"".concat(href, "\"]"))) === null || _a === void 0 ? void 0 : _a.scrollIntoView();
    }, []);
    // used to automatically prefix numbers with the correct amount of zeros
    var numberLength = episodes.length.toString().length;
    if (numberLength < 2)
        numberLength = 2;
    return episodes.map(function (episode) {
        var path = (0, call_kent_ts_1.getEpisodePath)(episode);
        return (<div className="border-b border-gray-200 dark:border-gray-600" key={path}>
				<react_1.Link preventScrollReset to={path} className="group focus:outline-none" prefetch="intent">
					<grid_tsx_1.Grid nested className="relative py-10 lg:py-5">
						<div className="bg-secondary absolute -inset-px -mx-6 hidden rounded-lg group-hover:block group-focus:block"/>
						<div className="relative col-span-1 flex-none">
							<div className="absolute inset-0 flex scale-0 transform items-center justify-center opacity-0 transition group-hover:scale-100 group-hover:opacity-100 group-focus:scale-100 group-focus:opacity-100">
								<div className="flex-none rounded-full bg-white p-4 text-gray-800">
									<icons_tsx_1.TriangleIcon size={12}/>
								</div>
							</div>
							<img className="h-16 w-full rounded-lg object-cover" src={episode.imageUrl} loading="lazy" alt="" // this is decorative only
        />
						</div>
						<div className="text-primary relative col-span-3 flex flex-col md:col-span-7 lg:col-span-11 lg:flex-row lg:items-center lg:justify-between">
							<div className="mb-3 text-xl font-medium lg:mb-0">
								{/* For most optimal display, this will needs adjustment once you'll hit 5 digits */}
								<span className={(0, clsx_1.clsx)('inline-block lg:text-lg', {
                'w-10': numberLength <= 3,
                'w-14': numberLength === 4,
                'w-auto pr-4': numberLength > 4,
            })}>
									{"".concat(episode.episodeNumber.toString().padStart(2, '0'), ".")}
								</span>

								{episode.title}
							</div>
							<div className="text-lg font-medium text-gray-400">
								{(0, misc_tsx_1.formatDuration)(episode.duration)}
							</div>
						</div>
					</grid_tsx_1.Grid>
				</react_1.Link>

				<grid_tsx_1.Grid nested>
					<framer_motion_1.AnimatePresence>
						{selectedEpisode === episode ? (<framer_motion_1.motion.div variants={{
                    collapsed: {
                        height: 0,
                        marginTop: 0,
                        marginBottom: 0,
                        opacity: 0,
                    },
                    expanded: {
                        height: 'auto',
                        marginTop: '1rem',
                        marginBottom: '3rem',
                        opacity: 1,
                    },
                }} initial="collapsed" animate="expanded" exit="collapsed" transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.15 }} className="relative col-span-full">
								<react_1.Outlet />
							</framer_motion_1.motion.div>) : null}
					</framer_motion_1.AnimatePresence>
				</grid_tsx_1.Grid>
			</div>);
    });
}
function ErrorBoundary() {
    var error = (0, misc_tsx_1.useCapturedRouteError)();
    var params = (0, react_1.useParams)();
    if ((0, react_1.isRouteErrorResponse)(error)) {
        console.error('CatchBoundary', error);
        if (error.status === 404) {
            return (<grid_tsx_1.Grid nested className="mt-3">
					<div className="col-span-full md:col-span-5">
						<typography_tsx_1.H3>{"Season not found"}</typography_tsx_1.H3>
						<typography_tsx_1.Paragraph>{"Are you sure ".concat(params.season ? "season ".concat(params.season) : 'this season', " exists?")}</typography_tsx_1.Paragraph>
					</div>
					<div className="md:col-span-start-6 col-span-full md:col-span-5">
						<kifs_tsx_1.MissingSomething className="rounded-lg" aspectRatio="3:4"/>
					</div>
				</grid_tsx_1.Grid>);
        }
        throw new Error("Unhandled error: ".concat(error.status));
    }
    console.error(error);
    return <errors_tsx_1.ServerError />;
}
