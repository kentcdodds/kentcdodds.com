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
exports.getSeasons = void 0;
exports.getSeasonListItems = getSeasonListItems;
var hast_util_to_html_1 = require("hast-util-to-html");
var mdast_util_to_hast_1 = require("mdast-util-to-hast");
var rehype_parse_1 = require("rehype-parse");
var rehype_remark_1 = require("rehype-remark");
var rehype_stringify_1 = require("rehype-stringify");
var remark_parse_1 = require("remark-parse");
var remark_rehype_1 = require("remark-rehype");
var unified_1 = require("unified");
var unist_util_visit_1 = require("unist-util-visit");
var lodash_ts_1 = require("#app/utils/cjs/lodash.ts");
var cache_server_ts_1 = require("./cache.server.ts");
var markdown_server_ts_1 = require("./markdown.server.ts");
var misc_tsx_1 = require("./misc.tsx");
var SIMPLECAST_KEY = (0, misc_tsx_1.getRequiredServerEnvVar)('SIMPLECAST_KEY');
var CHATS_WITH_KENT_PODCAST_ID = (0, misc_tsx_1.getRequiredServerEnvVar)('CHATS_WITH_KENT_PODCAST_ID');
var headers = {
    authorization: "Bearer ".concat(SIMPLECAST_KEY),
};
var seasonsCacheKey = "simplecast:seasons:".concat(CHATS_WITH_KENT_PODCAST_ID);
function isTooManyRequests(json) {
    return (typeof json === 'object' &&
        json !== null &&
        json.hasOwnProperty('too_many_requests'));
}
var getCachedSeasons = function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var request = _b.request, forceFresh = _b.forceFresh, timings = _b.timings;
    return __generator(this, function (_c) {
        return [2 /*return*/, (0, cache_server_ts_1.cachified)({
                cache: cache_server_ts_1.cache,
                request: request,
                timings: timings,
                key: seasonsCacheKey,
                // while we're actively publishing the podcast, let's have the cache be
                // shorter
                ttl: 1000 * 60 * 5,
                // ttl: 1000 * 60 * 60 * 24 * 7,
                staleWhileRevalidate: 1000 * 60 * 60 * 24 * 30,
                getFreshValue: function () { return getSeasons({ request: request, forceFresh: forceFresh, timings: timings }); },
                forceFresh: forceFresh,
                checkValue: function (value) {
                    return Array.isArray(value) &&
                        value.every(function (v) { return typeof v.seasonNumber === 'number' && Array.isArray(v.episodes); });
                },
            })];
    });
}); };
exports.getSeasons = getCachedSeasons;
function getCachedEpisode(episodeId_1, _a) {
    return __awaiter(this, arguments, void 0, function (episodeId, _b) {
        var key;
        var request = _b.request, forceFresh = _b.forceFresh, timings = _b.timings;
        return __generator(this, function (_c) {
            key = "simplecast:episode:".concat(episodeId);
            return [2 /*return*/, (0, cache_server_ts_1.cachified)({
                    cache: cache_server_ts_1.cache,
                    request: request,
                    timings: timings,
                    key: key,
                    ttl: 1000 * 60 * 60 * 24 * 7,
                    staleWhileRevalidate: 1000 * 60 * 60 * 24 * 30,
                    getFreshValue: function () { return getEpisode(episodeId); },
                    forceFresh: forceFresh,
                    checkValue: function (value) {
                        return typeof value === 'object' && value !== null && 'title' in value;
                    },
                })];
        });
    });
}
function getSeasons(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var res, json, collection, seasons;
        var _this = this;
        var request = _b.request, forceFresh = _b.forceFresh, timings = _b.timings;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, fetch("https://api.simplecast.com/podcasts/".concat(CHATS_WITH_KENT_PODCAST_ID, "/seasons"), { headers: headers })];
                case 1:
                    res = _c.sent();
                    return [4 /*yield*/, res.json()];
                case 2:
                    json = (_c.sent());
                    if (isTooManyRequests(json)) {
                        return [2 /*return*/, []];
                    }
                    collection = json.collection;
                    return [4 /*yield*/, Promise.all(collection.map(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                            var seasonId, episodes;
                            var href = _b.href, number = _b.number;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        seasonId = new URL(href).pathname.split('/').slice(-1)[0];
                                        if (!seasonId) {
                                            console.error("Could not determine seasonId from ".concat(href, " for season ").concat(number));
                                            return [2 /*return*/];
                                        }
                                        return [4 /*yield*/, getEpisodes(seasonId, {
                                                request: request,
                                                forceFresh: forceFresh,
                                                timings: timings,
                                            })];
                                    case 1:
                                        episodes = _c.sent();
                                        if (!episodes.length)
                                            return [2 /*return*/, null];
                                        return [2 /*return*/, { seasonNumber: number, episodes: episodes }];
                                }
                            });
                        }); })).then(function (s) { return s.filter(misc_tsx_1.typedBoolean); })];
                case 3:
                    seasons = _c.sent();
                    return [2 /*return*/, (0, lodash_ts_1.sortBy)(seasons, function (s) { return Number(s.seasonNumber); })];
            }
        });
    });
}
function getEpisodes(seasonId_1, _a) {
    return __awaiter(this, arguments, void 0, function (seasonId, _b) {
        var url, res, json, collection, episodes;
        var request = _b.request, forceFresh = _b.forceFresh, timings = _b.timings;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    url = new URL("https://api.simplecast.com/seasons/".concat(seasonId, "/episodes"));
                    url.searchParams.set('limit', '300');
                    return [4 /*yield*/, fetch(url.toString(), { headers: headers })];
                case 1:
                    res = _c.sent();
                    return [4 /*yield*/, res.json()];
                case 2:
                    json = (_c.sent());
                    if (isTooManyRequests(json)) {
                        return [2 /*return*/, []];
                    }
                    collection = json.collection;
                    return [4 /*yield*/, Promise.all(collection
                            .filter(function (_a) {
                            var status = _a.status, is_hidden = _a.is_hidden;
                            return status === 'published' && !is_hidden;
                        })
                            .map(function (_a) {
                            var id = _a.id;
                            return getCachedEpisode(id, { request: request, forceFresh: forceFresh, timings: timings });
                        }))];
                case 3:
                    episodes = _c.sent();
                    return [2 /*return*/, episodes.filter(misc_tsx_1.typedBoolean)];
            }
        });
    });
}
function getEpisode(episodeId) {
    return __awaiter(this, void 0, void 0, function () {
        var res, json, id, is_published, updated_at, slug, transcriptMarkdown, summaryMarkdown, _a, descriptionMarkdown, image_url, number, duration, title, seasonNumber, keywordsData, mediaUrl, keywords, _b, transcriptHTML, descriptionHTML, _c, summaryHTML, homeworkHTMLs, resources, guests, cwkEpisode;
        var _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, fetch("https://api.simplecast.com/episodes/".concat(episodeId), {
                        headers: headers,
                    })];
                case 1:
                    res = _e.sent();
                    return [4 /*yield*/, res.json()];
                case 2:
                    json = (_e.sent());
                    if (isTooManyRequests(json)) {
                        return [2 /*return*/, null];
                    }
                    id = json.id, is_published = json.is_published, updated_at = json.updated_at, slug = json.slug, transcriptMarkdown = json.transcription, summaryMarkdown = json.long_description, _a = json.description, descriptionMarkdown = _a === void 0 ? '' : _a, image_url = json.image_url, number = json.number, duration = json.duration, title = json.title, seasonNumber = json.season.number, keywordsData = json.keywords, mediaUrl = json.enclosure_url;
                    if (!is_published) {
                        return [2 /*return*/, null];
                    }
                    keywords = keywordsData.collection.map(function (_a) {
                        var value = _a.value;
                        return value;
                    });
                    return [4 /*yield*/, Promise.all([
                            transcriptMarkdown
                                ? transcriptMarkdown.trim().startsWith('<')
                                    ? transcriptMarkdown
                                    : (0, markdown_server_ts_1.markdownToHtml)(transcriptMarkdown)
                                : '',
                            descriptionMarkdown
                                ? descriptionMarkdown.trim().startsWith('<')
                                    ? descriptionMarkdown
                                    : (0, markdown_server_ts_1.markdownToHtml)(descriptionMarkdown)
                                : '',
                            summaryMarkdown
                                ? parseSummaryMarkdown(summaryMarkdown, "".concat(id, "-").concat(slug))
                                : {
                                    summaryHTML: '',
                                    homeworkHTMLs: [],
                                    resources: [],
                                    guests: [],
                                },
                        ])];
                case 3:
                    _b = _e.sent(), transcriptHTML = _b[0], descriptionHTML = _b[1], _c = _b[2], summaryHTML = _c.summaryHTML, homeworkHTMLs = _c.homeworkHTMLs, resources = _c.resources, guests = _c.guests;
                    _d = {
                        transcriptHTML: transcriptHTML,
                        descriptionHTML: descriptionHTML
                    };
                    return [4 /*yield*/, (0, markdown_server_ts_1.stripHtml)(descriptionHTML)];
                case 4:
                    cwkEpisode = (_d.description = _e.sent(),
                        _d.summaryHTML = summaryHTML,
                        _d.guests = guests,
                        _d.slug = slug,
                        _d.resources = resources,
                        _d.image = image_url,
                        _d.episodeNumber = number,
                        _d.updatedAt = updated_at,
                        _d.homeworkHTMLs = homeworkHTMLs,
                        _d.seasonNumber = seasonNumber,
                        _d.duration = duration,
                        _d.title = title,
                        _d.meta = {
                            keywords: keywords,
                        },
                        _d.simpleCastId = episodeId,
                        _d.mediaUrl = mediaUrl,
                        _d);
                    return [2 /*return*/, cwkEpisode];
            }
        });
    });
}
function removeEls(array) {
    var els = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        els[_i - 1] = arguments[_i];
    }
    return array.filter(function (el) { return !els.includes(el); });
}
function autoAffiliates() {
    return function affiliateTransformer(tree) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                (0, unist_util_visit_1.visit)(tree, 'element', function visitor(linkNode) {
                    if (linkNode.tagName !== 'a')
                        return;
                    if (!linkNode.properties)
                        return;
                    if (typeof linkNode.properties.href !== 'string')
                        return;
                    if (linkNode.properties.href.includes('amazon.com')) {
                        var amazonUrl = new URL(linkNode.properties.href);
                        if (!amazonUrl.searchParams.has('tag')) {
                            amazonUrl.searchParams.set('tag', 'kentcdodds-20');
                            linkNode.properties.href = amazonUrl.toString();
                        }
                    }
                    if (linkNode.properties.href.includes('egghead.io')) {
                        var eggheadUrl = new URL(linkNode.properties.href);
                        if (!eggheadUrl.searchParams.has('af')) {
                            eggheadUrl.searchParams.set('af', '5236ad');
                            linkNode.properties.href = eggheadUrl.toString();
                        }
                    }
                });
                return [2 /*return*/];
            });
        });
    };
}
function parseSummaryMarkdown(summaryInput, errorKey) {
    return __awaiter(this, void 0, void 0, function () {
        var isHTMLInput, resources, guests, homeworkHTMLs, result, summaryHTML;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    isHTMLInput = summaryInput.trim().startsWith('<');
                    resources = [];
                    guests = [];
                    homeworkHTMLs = [];
                    return [4 /*yield*/, (0, unified_1.unified)()
                            .use(isHTMLInput ? rehype_parse_1.default : remark_parse_1.default)
                            .use(isHTMLInput ? rehype_remark_1.default : function () { })
                            .use(function extractMetaData() {
                            return function transformer(tree) {
                                var sections = {};
                                (0, unist_util_visit_1.visit)(tree, 'heading', function (heading, index, parent) {
                                    var _a;
                                    if (!parent) {
                                        console.error(heading, "".concat(errorKey, " heading without a parent"));
                                        return;
                                    }
                                    if (heading.depth !== 3)
                                        return;
                                    var nextHeading = parent.children
                                        .slice((index !== null && index !== void 0 ? index : 0) + 1)
                                        // the rule is wrong here...
                                        .find(function (n) { return n.type === 'heading' && n.depth >= 3; });
                                    var endOfSection = nextHeading
                                        ? // @ts-expect-error no idea why typescript says something I found can't be indexed 🤷‍♂️
                                            parent.children.indexOf(nextHeading)
                                        : parent.children.length;
                                    var headingChildren = parent.children.slice((index !== null && index !== void 0 ? index : 0) + 1, endOfSection);
                                    var sectionTitle = (_a = heading.children[0]) === null || _a === void 0 ? void 0 : _a.value;
                                    if (!sectionTitle) {
                                        console.error("".concat(errorKey, ": Section with no title"), heading);
                                        return;
                                    }
                                    sections[sectionTitle] = {
                                        children: headingChildren,
                                        remove: function () {
                                            parent.children = removeEls.apply(void 0, __spreadArray([parent.children,
                                                heading], headingChildren, false));
                                        },
                                    };
                                });
                                for (var _i = 0, _a = Object.entries(sections); _i < _a.length; _i++) {
                                    var _b = _a[_i], sectionTitle = _b[0], _c = _b[1], children = _c.children, remove = _c.remove;
                                    // can't remove elements from an array while you're iterating
                                    // over that array, so we have to do it afterwards
                                    if (/kent c. dodds/i.test(sectionTitle)) {
                                        // we don't need to add any meta data for Kent.
                                        remove();
                                        continue;
                                    }
                                    if (/resources/i.test(sectionTitle)) {
                                        remove();
                                        for (var _d = 0, children_1 = children; _d < children_1.length; _d++) {
                                            var child = children_1[_d];
                                            (0, unist_util_visit_1.visit)(child, 'listItem', function (listItem) {
                                                (0, unist_util_visit_1.visit)(listItem, 'link', function (link) {
                                                    (0, unist_util_visit_1.visit)(link, 'text', function (text) {
                                                        resources.push({
                                                            name: text.value,
                                                            url: link.url,
                                                        });
                                                    });
                                                });
                                            });
                                        }
                                    }
                                    if (/homework/i.test(sectionTitle)) {
                                        remove();
                                        for (var _e = 0, children_2 = children; _e < children_2.length; _e++) {
                                            var child = children_2[_e];
                                            (0, unist_util_visit_1.visit)(child, 'listItem', function (listItem) {
                                                homeworkHTMLs.push(listItem.children
                                                    .map(function (c) {
                                                    var hastC = (0, mdast_util_to_hast_1.toHast)(c);
                                                    if (!hastC) {
                                                        console.error("".concat(errorKey, ": list item child that returned no hAST."), c);
                                                        throw new Error('This should not happen. mdastToHast of a list item child is falsy.');
                                                    }
                                                    return (0, hast_util_to_html_1.toHtml)(hastC);
                                                })
                                                    .join(''));
                                            });
                                        }
                                    }
                                    if (/^guest/i.test(sectionTitle)) {
                                        remove();
                                        var _loop_1 = function (child) {
                                            var company, github, x;
                                            (0, unist_util_visit_1.visit)(child, 'listItem', function (listItem) {
                                                // this error handling makes me laugh and cry
                                                // definitely better error messages than we'd get
                                                // if we just pretended this could never happen...
                                                // ... and you know what... they did happen and I'm glad I added
                                                // this error handling 😂
                                                var paragraph = listItem.children[0];
                                                if ((paragraph === null || paragraph === void 0 ? void 0 : paragraph.type) !== 'paragraph') {
                                                    console.error("".concat(errorKey, ": guest listItem first child is not a paragraph"), child);
                                                    return;
                                                }
                                                var _a = paragraph.children, text = _a[0], link = _a[1];
                                                if ((text === null || text === void 0 ? void 0 : text.type) !== 'text') {
                                                    console.error("".concat(errorKey, ": guest listItem first child's first child is not a text node"), child);
                                                    return;
                                                }
                                                if ((link === null || link === void 0 ? void 0 : link.type) !== 'link') {
                                                    console.error("".concat(errorKey, ": guest listItem first child's second child is not a link node"), child);
                                                    return;
                                                }
                                                var linkText = link.children[0];
                                                if ((linkText === null || linkText === void 0 ? void 0 : linkText.type) !== 'text') {
                                                    console.error("".concat(errorKey, ": guest listItem first child's second child's first child is not a text node"), child);
                                                    return;
                                                }
                                                var type = text.value;
                                                var name = linkText.value;
                                                if (/company/i.test(type)) {
                                                    company = name;
                                                }
                                                if (/github/i.test(type)) {
                                                    github = name.replace('@', '');
                                                }
                                                if (/twitter/i.test(type)) {
                                                    x = name.replace('@', '');
                                                }
                                                if (/x/i.test(type)) {
                                                    x = name.replace('@', '');
                                                }
                                                if (/𝕏/i.test(type)) {
                                                    x = name.replace('@', '');
                                                }
                                            });
                                            guests.push({
                                                name: sectionTitle.replace(/^guest:?/i, '').trim(),
                                                company: company,
                                                github: github,
                                                x: x,
                                            });
                                        };
                                        for (var _f = 0, children_3 = children; _f < children_3.length; _f++) {
                                            var child = children_3[_f];
                                            _loop_1(child);
                                        }
                                    }
                                }
                                var lastElement = tree.children.slice(-1)[0];
                                if ((lastElement === null || lastElement === void 0 ? void 0 : lastElement.type) === 'thematicBreak') {
                                    tree.children = removeEls(tree.children, lastElement);
                                }
                            };
                        })
                            .use(remark_rehype_1.default)
                            .use(autoAffiliates)
                            .use(rehype_stringify_1.default)
                            .process(summaryInput)];
                case 1:
                    result = _a.sent();
                    summaryHTML = result.value.toString();
                    return [2 /*return*/, {
                            summaryHTML: summaryHTML,
                            homeworkHTMLs: homeworkHTMLs,
                            resources: resources,
                            guests: guests,
                        }];
            }
        });
    });
}
function getSeasonListItems(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var seasons, listItemSeasons, _i, seasons_1, season;
        var request = _b.request, forceFresh = _b.forceFresh, timings = _b.timings;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, getCachedSeasons({ request: request, forceFresh: forceFresh, timings: timings })];
                case 1:
                    seasons = _c.sent();
                    listItemSeasons = [];
                    for (_i = 0, seasons_1 = seasons; _i < seasons_1.length; _i++) {
                        season = seasons_1[_i];
                        listItemSeasons.push({
                            seasonNumber: season.seasonNumber,
                            episodes: season.episodes.map(function (episode) {
                                return (0, lodash_ts_1.omit)(episode, 'homeworkHTMLs', 'resources', 'summaryHTML', 'transcriptHTML', 'meta', 'descriptionHTML');
                            }),
                        });
                    }
                    return [2 /*return*/, listItemSeasons];
            }
        });
    });
}
