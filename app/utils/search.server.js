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
exports.searchKCD = searchKCD;
var match_sorter_1 = require("match-sorter");
var call_kent_ts_1 = require("#app/utils/call-kent.ts");
var chats_with_kent_ts_1 = require("#app/utils/chats-with-kent.ts");
var markdown_server_ts_1 = require("#app/utils/markdown.server.ts");
var mdx_server_ts_1 = require("#app/utils/mdx.server.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var simplecast_server_ts_1 = require("#app/utils/simplecast.server.ts");
var talks_server_ts_1 = require("#app/utils/talks.server.ts");
var transistor_server_ts_1 = require("#app/utils/transistor.server.ts");
var workshops_server_ts_1 = require("#app/utils/workshops.server.ts");
function searchKCD(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        function findWinners(items, search) {
            var results = (0, match_sorter_1.matchSorter)(items, search, matchSorterOptions);
            if (results.length) {
                return results;
            }
            // if we couldn't find a winner with the words altogether, try to find one
            // that matches every word
            var words = Array.from(new Set(search.split(' ')));
            // if there's only one word and we got this far we already know it won't match
            // so don't bother and just send back an empty result
            if (words.length <= 1) {
                return [];
            }
            return words.reduce(function (remaining, word) { return (0, match_sorter_1.matchSorter)(remaining, word, matchSorterOptions); }, items);
        }
        var _c, posts, callKentEpisodes, chatsWithKentEpisodes, talks, workshops, normalizedGroups, _d, matchSorterOptions, _i, normalizedGroups_1, normalizedGroup, prefix, actualQuery;
        var _e, _f, _g;
        var _this = this;
        var request = _b.request, query = _b.query;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0: return [4 /*yield*/, Promise.all([
                        (0, mdx_server_ts_1.getBlogMdxListItems)({ request: request }),
                        (0, transistor_server_ts_1.getEpisodes)({ request: request }),
                        (0, simplecast_server_ts_1.getSeasons)({ request: request }),
                        (0, talks_server_ts_1.getTalksAndTags)({ request: request }),
                        (0, workshops_server_ts_1.getWorkshops)({ request: request }),
                    ])];
                case 1:
                    _c = _h.sent(), posts = _c[0], callKentEpisodes = _c[1], chatsWithKentEpisodes = _c[2], talks = _c[3].talks, workshops = _c[4];
                    _d = [{
                            prefix: 'b',
                            items: posts.map(function (p) {
                                var _a, _b, _c, _d, _e, _f;
                                return ({
                                    route: "/blog/".concat(p.slug),
                                    segment: 'Blog Posts',
                                    title: (_a = p.frontmatter.title) !== null && _a !== void 0 ? _a : 'Untitled',
                                    metadata: { slug: p.slug },
                                    values: {
                                        priority: (_b = p.frontmatter.title) !== null && _b !== void 0 ? _b : '',
                                        other: __spreadArray(__spreadArray([
                                            (_c = p.frontmatter.description) !== null && _c !== void 0 ? _c : ''
                                        ], ((_d = p.frontmatter.categories) !== null && _d !== void 0 ? _d : []), true), ((_f = (_e = p.frontmatter.meta) === null || _e === void 0 ? void 0 : _e.keywords) !== null && _f !== void 0 ? _f : []), true),
                                    },
                                });
                            }),
                        }];
                    _e = {
                        prefix: 't'
                    };
                    return [4 /*yield*/, Promise.all(talks.map(function (t) { return __awaiter(_this, void 0, void 0, function () {
                            var _a;
                            var _b, _c;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        _b = {
                                            route: "/talks/".concat(t.slug),
                                            segment: 'Talks',
                                            title: t.title,
                                            metadata: { slug: t.slug }
                                        };
                                        _c = {
                                            priority: t.title
                                        };
                                        _a = [__spreadArray([
                                                t.description
                                            ], t.tags, true)];
                                        return [4 /*yield*/, Promise.all(t.deliveries.map(function (d) {
                                                return d.eventHTML ? (0, markdown_server_ts_1.stripHtml)(d.eventHTML) : null;
                                            }))];
                                    case 1: return [2 /*return*/, (_b.values = (_c.other = __spreadArray.apply(void 0, _a.concat([(_d.sent()).filter(misc_tsx_1.typedBoolean), true])),
                                            _c),
                                            _b)];
                                }
                            });
                        }); }))];
                case 2:
                    _d = _d.concat([
                        (_e.items = _h.sent(),
                            _e)
                    ]);
                    _f = {
                        prefix: 'cwk'
                    };
                    return [4 /*yield*/, Promise.all(chatsWithKentEpisodes
                            .flatMap(function (s) { return s.episodes; })
                            .map(function (e) { return __awaiter(_this, void 0, void 0, function () {
                            var _a, _b;
                            var _c, _d;
                            return __generator(this, function (_e) {
                                switch (_e.label) {
                                    case 0:
                                        _c = {
                                            route: (0, chats_with_kent_ts_1.getCWKEpisodePath)({
                                                seasonNumber: e.seasonNumber,
                                                episodeNumber: e.episodeNumber,
                                            }),
                                            title: e.title,
                                            segment: 'Chats with Kent Episodes',
                                            metadata: {
                                                seasonNumber: e.seasonNumber,
                                                episodeNumber: e.episodeNumber,
                                            }
                                        };
                                        _d = {
                                            priority: __spreadArray([
                                                e.title
                                            ], e.guests.flatMap(function (g) { return [g.name, g.x, g.github]; }), true)
                                        };
                                        _a = [e.description];
                                        return [4 /*yield*/, (0, markdown_server_ts_1.stripHtml)(e.summaryHTML)];
                                    case 1:
                                        _b = [__spreadArray.apply(void 0, [_a.concat([
                                                    _e.sent()
                                                ]), e.guests.map(function (g) { return g.company; }), true])];
                                        return [4 /*yield*/, Promise.all(e.homeworkHTMLs.map(function (h) { return (0, markdown_server_ts_1.stripHtml)(h); }))];
                                    case 2: return [2 /*return*/, (_c.values = (_d.other = __spreadArray.apply(void 0, [__spreadArray.apply(void 0, _b.concat([(_e.sent()), true])), e.resources.flatMap(function (r) { return [r.name, r.url]; }), true]),
                                            _d),
                                            _c)];
                                }
                            });
                        }); }))];
                case 3:
                    _d = _d.concat([
                        (_f.items = _h.sent(),
                            _f),
                        {
                            prefix: 'ck',
                            items: callKentEpisodes.map(function (e) { return ({
                                route: (0, call_kent_ts_1.getEpisodePath)({
                                    seasonNumber: e.seasonNumber,
                                    episodeNumber: e.episodeNumber,
                                }),
                                title: e.title,
                                segment: 'Call Kent Podcast Episodes',
                                metadata: {
                                    seasonNumber: e.seasonNumber,
                                    episodeNumber: e.episodeNumber,
                                },
                                values: {
                                    priority: e.title,
                                    other: __spreadArray([e.description], e.keywords, true),
                                },
                            }); }),
                        }
                    ]);
                    _g = {
                        prefix: 'w'
                    };
                    return [4 /*yield*/, Promise.all(workshops.map(function (w) { return __awaiter(_this, void 0, void 0, function () {
                            var _a, _b;
                            var _c, _d;
                            var _this = this;
                            var _e;
                            return __generator(this, function (_f) {
                                switch (_f.label) {
                                    case 0:
                                        _c = {
                                            route: "/workshops/".concat(w.slug),
                                            title: w.title,
                                            segment: 'Workshops',
                                            metadata: { slug: w.slug }
                                        };
                                        _d = {
                                            priority: w.title
                                        };
                                        _a = [__spreadArray(__spreadArray(__spreadArray(__spreadArray([], w.categories, true), w.events.map(function (e) { return e.title; }), true), ((_e = w.meta.keywords) !== null && _e !== void 0 ? _e : []), true), [
                                                w.description
                                            ], false)];
                                        return [4 /*yield*/, Promise.all(w.keyTakeawayHTMLs.map(function (t) { return __awaiter(_this, void 0, void 0, function () {
                                                var _a;
                                                return __generator(this, function (_b) {
                                                    switch (_b.label) {
                                                        case 0: return [4 /*yield*/, (0, markdown_server_ts_1.stripHtml)(t.title)];
                                                        case 1:
                                                            _a = [
                                                                _b.sent()
                                                            ];
                                                            return [4 /*yield*/, (0, markdown_server_ts_1.stripHtml)(t.description)];
                                                        case 2: return [2 /*return*/, _a.concat([
                                                                _b.sent()
                                                            ])];
                                                    }
                                                });
                                            }); }))];
                                    case 1:
                                        _b = [__spreadArray.apply(void 0, _a.concat([(_f.sent()).flatMap(function (s) { return s; }), true]))];
                                        return [4 /*yield*/, Promise.all(w.topicHTMLs.flatMap(function (t) { return (0, markdown_server_ts_1.stripHtml)(t); }))];
                                    case 2: return [2 /*return*/, (_c.values = (_d.other = __spreadArray.apply(void 0, _b.concat([(_f.sent()), true])),
                                            _d),
                                            _c)];
                                }
                            });
                        }); }))];
                case 4:
                    normalizedGroups = _d.concat([
                        (_g.items = _h.sent(),
                            _g)
                    ]);
                    matchSorterOptions = {
                        keys: [
                            { key: 'values.priority', threshold: match_sorter_1.rankings.WORD_STARTS_WITH },
                            {
                                key: 'values.other',
                                threshold: match_sorter_1.rankings.WORD_STARTS_WITH,
                                maxRanking: match_sorter_1.rankings.CONTAINS,
                            },
                        ],
                    };
                    for (_i = 0, normalizedGroups_1 = normalizedGroups; _i < normalizedGroups_1.length; _i++) {
                        normalizedGroup = normalizedGroups_1[_i];
                        prefix = "".concat(normalizedGroup.prefix, ":");
                        if (!query.startsWith(prefix))
                            continue;
                        actualQuery = query.slice(prefix.length);
                        return [2 /*return*/, findWinners(normalizedGroup.items, actualQuery)];
                    }
                    return [2 /*return*/, findWinners(normalizedGroups.flatMap(function (n) { return n.items; }), query)];
            }
        });
    });
}
