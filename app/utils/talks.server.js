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
exports.getTalksAndTags = getTalksAndTags;
var slugify_1 = require("@sindresorhus/slugify");
var YAML = require("yaml");
var cache_server_ts_1 = require("#app/utils/cache.server.ts");
var github_server_ts_1 = require("#app/utils/github.server.ts");
var markdown_server_ts_1 = require("#app/utils/markdown.server.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var _slugify;
function getSlugify() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (!_slugify) {
                _slugify = (0, slugify_1.slugifyWithCounter)();
            }
            return [2 /*return*/, _slugify];
        });
    });
}
function getTalk(rawTalk, allTags) {
    return __awaiter(this, void 0, void 0, function () {
        var slugify, descriptionHTML, _a, _b, _c, _d;
        var _e;
        var _this = this;
        var _f, _g, _h, _j, _k;
        return __generator(this, function (_l) {
            switch (_l.label) {
                case 0: return [4 /*yield*/, getSlugify()];
                case 1:
                    slugify = _l.sent();
                    if (!rawTalk.description) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, markdown_server_ts_1.markdownToHtml)(rawTalk.description)];
                case 2:
                    _a = _l.sent();
                    return [3 /*break*/, 4];
                case 3:
                    _a = '';
                    _l.label = 4;
                case 4:
                    descriptionHTML = _a;
                    _e = {
                        title: (_f = rawTalk.title) !== null && _f !== void 0 ? _f : 'TBA',
                        tag: (_g = allTags.find(function (tag) { var _a; return (_a = rawTalk.tags) === null || _a === void 0 ? void 0 : _a.includes(tag); })) !== null && _g !== void 0 ? _g : (_h = rawTalk.tags) === null || _h === void 0 ? void 0 : _h[0],
                        tags: (_j = rawTalk.tags) !== null && _j !== void 0 ? _j : [],
                        slug: slugify((_k = rawTalk.title) !== null && _k !== void 0 ? _k : 'TBA')
                    };
                    if (!rawTalk.resources) return [3 /*break*/, 6];
                    return [4 /*yield*/, Promise.all(rawTalk.resources.map(function (r) { return (0, markdown_server_ts_1.markdownToHtml)(r); }))];
                case 5:
                    _b = _l.sent();
                    return [3 /*break*/, 7];
                case 6:
                    _b = [];
                    _l.label = 7;
                case 7:
                    _e.resourceHTMLs = _b,
                        _e.descriptionHTML = descriptionHTML;
                    if (!descriptionHTML) return [3 /*break*/, 9];
                    return [4 /*yield*/, (0, markdown_server_ts_1.stripHtml)(descriptionHTML)];
                case 8:
                    _c = _l.sent();
                    return [3 /*break*/, 10];
                case 9:
                    _c = '';
                    _l.label = 10;
                case 10:
                    _e.description = _c;
                    if (!rawTalk.deliveries) return [3 /*break*/, 12];
                    return [4 /*yield*/, Promise.all(rawTalk.deliveries.map(function (d) { return __awaiter(_this, void 0, void 0, function () {
                            var _a;
                            var _b;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        _b = {};
                                        if (!d.event) return [3 /*break*/, 2];
                                        return [4 /*yield*/, (0, markdown_server_ts_1.markdownToHtml)(d.event)];
                                    case 1:
                                        _a = _c.sent();
                                        return [3 /*break*/, 3];
                                    case 2:
                                        _a = undefined;
                                        _c.label = 3;
                                    case 3: return [2 /*return*/, (_b.eventHTML = _a,
                                            _b.date = d.date,
                                            _b.recording = d.recording,
                                            _b.dateDisplay = d.date ? (0, misc_tsx_1.formatDate)(d.date) : 'TBA',
                                            _b)];
                                }
                            });
                        }); }))];
                case 11:
                    _d = _l.sent();
                    return [3 /*break*/, 13];
                case 12:
                    _d = [];
                    _l.label = 13;
                case 13: return [2 /*return*/, (_e.deliveries = (_d).sort(function (a, b) {
                        return a.date && b.date ? (moreRecent(a.date, b.date) ? -1 : 1) : 0;
                    }),
                        _e)];
            }
        });
    });
}
function sortByPresentationDate(a, b) {
    var mostRecentA = mostRecent(a.deliveries.map(function (_a) {
        var date = _a.date;
        return date;
    }).filter(misc_tsx_1.typedBoolean));
    var mostRecentB = mostRecent(b.deliveries.map(function (_a) {
        var date = _a.date;
        return date;
    }).filter(misc_tsx_1.typedBoolean));
    return moreRecent(mostRecentA, mostRecentB) ? -1 : 1;
}
function mostRecent(dates) {
    if (dates === void 0) { dates = []; }
    return dates.reduce(function (recent, compare) {
        if (!recent)
            return compare;
        return moreRecent(compare, recent) ? compare : recent;
    });
}
// returns true if a is more recent than b
function moreRecent(a, b) {
    if (typeof a === 'string')
        a = new Date(a);
    if (typeof b === 'string')
        b = new Date(b);
    return a > b;
}
function getTags(talks) {
    var _a;
    // get most used tags
    var tagCounts = {};
    for (var _i = 0, talks_1 = talks; _i < talks_1.length; _i++) {
        var talk = talks_1[_i];
        if (!talk.tags)
            continue;
        for (var _b = 0, _c = talk.tags; _b < _c.length; _b++) {
            var tag = _c[_b];
            tagCounts[tag] = ((_a = tagCounts[tag]) !== null && _a !== void 0 ? _a : 0) + 1;
        }
    }
    var tags = Object.entries(tagCounts)
        .filter(function (_a) {
        var _tag = _a[0], counts = _a[1];
        return counts > 1;
    }) // only include tags assigned to >1 talks
        .sort(function (l, r) { return r[1] - l[1]; }) // sort on num occurrences
        .map(function (_a) {
        var tag = _a[0];
        return tag;
    }); // extract tags, ditch the counts
    return tags;
}
function getTalksAndTags(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var slugify, key, talks;
        var _this = this;
        var request = _b.request, forceFresh = _b.forceFresh, timings = _b.timings;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, getSlugify()];
                case 1:
                    slugify = _c.sent();
                    slugify.reset();
                    key = 'content:data:talks.yml';
                    return [4 /*yield*/, (0, cache_server_ts_1.cachified)({
                            cache: cache_server_ts_1.cache,
                            request: request,
                            timings: timings,
                            key: key,
                            ttl: 1000 * 60 * 60 * 24 * 14,
                            staleWhileRevalidate: 1000 * 60 * 60 * 24 * 30,
                            forceFresh: forceFresh,
                            getFreshValue: function () { return __awaiter(_this, void 0, void 0, function () {
                                var talksString, rawTalks, allTags, allTalks;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, (0, github_server_ts_1.downloadFile)('content/data/talks.yml')];
                                        case 1:
                                            talksString = _a.sent();
                                            rawTalks = YAML.parse(talksString);
                                            if (!Array.isArray(rawTalks)) {
                                                console.error('Talks is not an array', rawTalks);
                                                throw new Error('Talks is not an array.');
                                            }
                                            allTags = getTags(rawTalks);
                                            return [4 /*yield*/, Promise.all(rawTalks.map(function (rawTalk) { return getTalk(rawTalk, allTags); }))];
                                        case 2:
                                            allTalks = _a.sent();
                                            allTalks.sort(sortByPresentationDate);
                                            return [2 /*return*/, { talks: allTalks, tags: allTags }];
                                    }
                                });
                            }); },
                            checkValue: function (value) {
                                return Boolean(value) &&
                                    typeof value === 'object' &&
                                    Array.isArray(value.talks) &&
                                    Array.isArray(value.tags);
                            },
                        })];
                case 2:
                    talks = _c.sent();
                    return [2 /*return*/, talks];
            }
        });
    });
}
