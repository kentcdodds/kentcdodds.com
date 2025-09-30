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
exports.default = Screen;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var vite_env_only_1 = require("vite-env-only");
var icon_link_tsx_1 = require("#app/components/icon-link.tsx");
var icons_tsx_1 = require("#app/components/icons.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var call_kent_ts_1 = require("#app/utils/call-kent.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var seo_ts_1 = require("#app/utils/seo.ts");
var theme_tsx_1 = require("#app/utils/theme.tsx");
var timing_server_ts_1 = require("#app/utils/timing.server.ts");
var transistor_server_ts_1 = require("#app/utils/transistor.server.ts");
var use_root_data_ts_1 = require("#app/utils/use-root-data.ts");
var calls_tsx_1 = require("../calls.tsx");
exports.handle = {
    id: 'call-player',
    getSitemapEntries: (0, vite_env_only_1.serverOnly$)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
        var episodes;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, transistor_server_ts_1.getEpisodes)({ request: request })];
                case 1:
                    episodes = _a.sent();
                    return [2 /*return*/, episodes.map(function (episode) {
                            return {
                                route: (0, call_kent_ts_1.getEpisodePath)(episode),
                                changefreq: 'weekly',
                                lastmod: new Date(episode.updatedAt).toISOString(),
                                priority: 0.3,
                            };
                        })];
            }
        });
    }); }),
};
var meta = function (_a) {
    var _b, _c, _d, _e;
    var matches = _a.matches, params = _a.params;
    var requestInfo = ((_b = matches.find(function (m) { return m.id === 'root'; })) === null || _b === void 0 ? void 0 : _b.data).requestInfo;
    var callsData = (_c = matches.find(function (m) { return m.id === 'routes/calls'; })) === null || _c === void 0 ? void 0 : _c.data;
    if (!callsData) {
        console.error("A call was unable to retrieve the parent's data by routes/calls");
        return [{ title: 'Call not found' }];
    }
    var episode = (0, call_kent_ts_1.getEpisodeFromParams)(callsData.episodes, params);
    if (!episode) {
        console.error("A call was unable to retrieve the parent's data by routes/calls");
        return [{ title: 'Call not found' }];
    }
    var title = "".concat(episode.title, " | Call Kent Podcast | ").concat(episode.episodeNumber);
    var playerUrl = (_e = (_d = episode.embedHtml.match(/src="(?<src>.+)"/)) === null || _d === void 0 ? void 0 : _d.groups) === null || _e === void 0 ? void 0 : _e.src;
    return __spreadArray(__spreadArray([], (0, seo_ts_1.getSocialMetas)({
        title: title,
        description: episode.description,
        keywords: "call kent, kent c. dodds, ".concat(episode.keywords),
        url: (0, misc_tsx_1.getUrl)(requestInfo),
        image: episode.imageUrl,
    }), true), [
        { 'twitter:card': 'player' },
        { 'twitter:player': playerUrl !== null && playerUrl !== void 0 ? playerUrl : '' },
        { 'twitter:player:width': '500' },
        { 'twitter:player:height': '180' },
        { 'twitter:player:stream': episode.mediaUrl },
        { 'twitter:player:stream:content_type': 'audio/mpeg' },
    ], false);
};
exports.meta = meta;
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var timings, season, episodeParam, slug, episodes, episode;
        var params = _b.params, request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    timings = {};
                    season = params.season, episodeParam = params.episode, slug = params.slug;
                    if (!season || !episodeParam || !slug) {
                        throw new Error('params.season or params.episode or params.slug is not defined');
                    }
                    return [4 /*yield*/, (0, transistor_server_ts_1.getEpisodes)({ request: request, timings: timings })];
                case 1:
                    episodes = _c.sent();
                    episode = (0, call_kent_ts_1.getEpisodeFromParams)(episodes, {
                        season: season,
                        episode: episodeParam,
                        slug: slug,
                    });
                    if (!episode) {
                        return [2 /*return*/, (0, node_1.redirect)('/calls')];
                    }
                    // the slug doesn't really matter.
                    // The unique identifier is the season and episode numbers.
                    // But we'll redirect to the correct slug to make the URL nice.
                    if (episode.slug !== params.slug) {
                        return [2 /*return*/, (0, node_1.redirect)((0, call_kent_ts_1.getEpisodePath)(episode))];
                    }
                    // we already load all the episodes in the parent route so it would be
                    // wasteful to send it here. The parent sticks all the episodes in context
                    // so we just use it in the component.
                    // This loader is only here for the 404 case we need to handle.
                    return [2 /*return*/, (0, node_1.json)({}, {
                            headers: {
                                'Server-Timing': (0, timing_server_ts_1.getServerTimeHeader)(timings),
                            },
                        })];
            }
        });
    });
}
exports.headers = misc_tsx_1.reuseUsefulLoaderHeaders;
function Screen() {
    var params = (0, react_1.useParams)();
    var episodes = (0, calls_tsx_1.useCallsData)().episodes;
    var requestInfo = (0, use_root_data_ts_1.useRootData)().requestInfo;
    var episode = (0, call_kent_ts_1.getEpisodeFromParams)(episodes, params);
    if (!episode) {
        return <div>Oh no... No episode found with this slug: {params.slug}</div>;
    }
    var path = (0, call_kent_ts_1.getEpisodePath)(episode);
    var keywords = Array.from(new Set(episode.keywords
        .split(/[,;\s]/g) // split into words
        .map(function (x) { return x.trim(); }) // trim white spaces
        .filter(Boolean))).slice(0, 3); // keep first 3 only
    return (<>
			<div className="flex justify-between gap-4">
				<div>
					<typography_tsx_1.H6 as="div" className="flex-auto">
						Keywords
					</typography_tsx_1.H6>
					<typography_tsx_1.Paragraph className="mb-8 flex">{keywords.join(', ')}</typography_tsx_1.Paragraph>
				</div>
				<div>
					<icon_link_tsx_1.IconLink target="_blank" rel="noreferrer noopener" href={"https://x.com/intent/tweet?".concat(new URLSearchParams({
            url: "".concat(requestInfo.origin).concat(path),
            text: "I just listened to \"".concat(episode.title, "\" on the Chats with Kent Podcast \uD83C\uDF99 by @kentcdodds"),
        }))}>
						<icons_tsx_1.XIcon title="Post this"/>
					</icon_link_tsx_1.IconLink>
				</div>
			</div>

			<typography_tsx_1.H6 as="div">Description</typography_tsx_1.H6>
			<typography_tsx_1.Paragraph as="div" className="mb-8" dangerouslySetInnerHTML={{
            __html: episode.descriptionHTML,
        }}/>
			<theme_tsx_1.Themed 
    // changing the theme while the player is going will cause it to
    // unload the player in the one theme and load it in the other
    // which is annoying.
    initialOnly={true} dark={<div dangerouslySetInnerHTML={{
                __html: episode.embedHtmlDark,
            }}/>} light={<div dangerouslySetInnerHTML={{
                __html: episode.embedHtml,
            }}/>}/>
		</>);
}
