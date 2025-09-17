"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
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
exports.getMostPopularPostSlugs = getMostPopularPostSlugs;
exports.getBlogRecommendations = getBlogRecommendations;
exports.getBlogReadRankings = getBlogReadRankings;
exports.getAllBlogPostReadRankings = getAllBlogPostReadRankings;
exports.getSlugReadsByUser = getSlugReadsByUser;
exports.getTotalPostReads = getTotalPostReads;
exports.getReaderCount = getReaderCount;
exports.getPostJson = getPostJson;
exports.notifyOfTeamLeaderChangeOnPost = notifyOfTeamLeaderChangeOnPost;
exports.notifyOfOverallTeamLeaderChange = notifyOfOverallTeamLeaderChange;
var date_fns_1 = require("date-fns");
var p_limit_1 = require("p-limit");
var lodash_ts_1 = require("#app/utils/cjs/lodash.ts");
var blog_ts_1 = require("./blog.ts");
var cache_server_ts_1 = require("./cache.server.ts");
var client_server_ts_1 = require("./client.server.ts");
var discord_server_ts_1 = require("./discord.server.ts");
var mdx_server_ts_1 = require("./mdx.server.ts");
var misc_tsx_1 = require("./misc.tsx");
var prisma_server_ts_1 = require("./prisma.server.ts");
var session_server_ts_1 = require("./session.server.ts");
var team_provider_tsx_1 = require("./team-provider.tsx");
var timing_server_ts_1 = require("./timing.server.ts");
function getBlogRecommendations(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var allPosts, exclude, user, client, clientId, where, readPosts, recommendablePosts, recommendations, groupsCount, limitPerGroup, postsByBestMatch, bestMatchRecommendations, mostPopularRecommendationSlugs, mostPopularRecommendations, remainingPosts, completelyRandomRecommendations;
        var request = _b.request, _c = _b.limit, limit = _c === void 0 ? 3 : _c, _d = _b.keywords, keywords = _d === void 0 ? [] : _d, _e = _b.exclude, externalExclude = _e === void 0 ? [] : _e, timings = _b.timings;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0: return [4 /*yield*/, (0, mdx_server_ts_1.getBlogMdxListItems)({ forceFresh: false, timings: timings })
                    // exclude what they want us to + any posts that are labeled as archived or draft.
                ];
                case 1:
                    allPosts = _f.sent();
                    exclude = Array.from(new Set(__spreadArray(__spreadArray([], externalExclude, true), allPosts
                        .filter(function (post) {
                        var _a, _b;
                        return (_b = (_a = post.frontmatter.unlisted) !== null && _a !== void 0 ? _a : post.frontmatter.archived) !== null && _b !== void 0 ? _b : post.frontmatter.draft;
                    })
                        .map(function (p) { return p.slug; }), true)));
                    return [4 /*yield*/, (0, session_server_ts_1.getUser)(request)];
                case 2:
                    user = _f.sent();
                    return [4 /*yield*/, (0, client_server_ts_1.getClientSession)(request, user)];
                case 3:
                    client = _f.sent();
                    clientId = client.getClientId();
                    where = user
                        ? { user: { id: user.id }, postSlug: { notIn: exclude.filter(Boolean) } }
                        : { clientId: clientId, postSlug: { notIn: exclude.filter(Boolean) } };
                    return [4 /*yield*/, (0, timing_server_ts_1.time)(prisma_server_ts_1.prisma.postRead.groupBy({
                            by: ['postSlug'],
                            where: where,
                        }), {
                            timings: timings,
                            type: 'getReadPosts',
                            desc: 'getting slugs of all posts read by user',
                        })];
                case 4:
                    readPosts = _f.sent();
                    exclude.push.apply(exclude, readPosts.map(function (p) { return p.postSlug; }));
                    recommendablePosts = allPosts.filter(function (post) { return !exclude.includes(post.slug); });
                    if (limit === null)
                        return [2 /*return*/, (0, lodash_ts_1.shuffle)(recommendablePosts)];
                    recommendations = [];
                    groupsCount = keywords.length ? 3 : 2;
                    limitPerGroup = Math.floor(limit / groupsCount) || 1;
                    if (keywords.length) {
                        postsByBestMatch = keywords.length
                            ? Array.from(new (Set.bind.apply(Set, __spreadArray([void 0], keywords.map(function (k) { return (0, blog_ts_1.filterPosts)(recommendablePosts, k); }), false)))())
                            : recommendablePosts;
                        bestMatchRecommendations = (0, lodash_ts_1.shuffle)(postsByBestMatch.slice(0, limitPerGroup * 4)).slice(0, limitPerGroup);
                        recommendations.push.apply(recommendations, bestMatchRecommendations);
                        exclude = __spreadArray(__spreadArray([], exclude, true), bestMatchRecommendations.map(function (_a) {
                            var slug = _a.slug;
                            return slug;
                        }), true);
                    }
                    return [4 /*yield*/, getMostPopularPostSlugs({
                            // get 4x the limit so we can have a little randomness
                            limit: limitPerGroup * 4,
                            exclude: exclude,
                            timings: timings,
                            request: request,
                        })];
                case 5:
                    mostPopularRecommendationSlugs = _f.sent();
                    mostPopularRecommendations = (0, lodash_ts_1.shuffle)(mostPopularRecommendationSlugs
                        .map(function (slug) { return recommendablePosts.find(function (_a) {
                        var s = _a.slug;
                        return s === slug;
                    }); })
                        .filter(misc_tsx_1.typedBoolean)).slice(0, limitPerGroup);
                    recommendations.push.apply(recommendations, mostPopularRecommendations);
                    exclude = __spreadArray(__spreadArray([], exclude, true), mostPopularRecommendationSlugs, true);
                    if (recommendations.length < limit) {
                        remainingPosts = recommendablePosts.filter(function (_a) {
                            var slug = _a.slug;
                            return !exclude.includes(slug);
                        });
                        completelyRandomRecommendations = (0, lodash_ts_1.shuffle)(remainingPosts).slice(0, limit - recommendations.length);
                        recommendations.push.apply(recommendations, completelyRandomRecommendations);
                    }
                    // then mix them up
                    return [2 /*return*/, (0, lodash_ts_1.shuffle)(recommendations)];
            }
        });
    });
}
function getMostPopularPostSlugs(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var postsSortedByMostPopular;
        var _this = this;
        var limit = _b.limit, exclude = _b.exclude, timings = _b.timings, request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, cache_server_ts_1.cachified)({
                        key: "sorted-most-popular-post-slugs",
                        ttl: 1000 * 60 * 30,
                        staleWhileRevalidate: 1000 * 60 * 60 * 24,
                        cache: cache_server_ts_1.lruCache,
                        request: request,
                        getFreshValue: function () { return __awaiter(_this, void 0, void 0, function () {
                            var result;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, prisma_server_ts_1.prisma.postRead.groupBy({
                                            by: ['postSlug'],
                                            _count: true,
                                            orderBy: {
                                                _count: {
                                                    postSlug: 'desc',
                                                },
                                            },
                                        })];
                                    case 1:
                                        result = _a.sent();
                                        return [2 /*return*/, result.map(function (p) { return p.postSlug; })];
                                }
                            });
                        }); },
                        timings: timings,
                        checkValue: function (value) {
                            return Array.isArray(value) && value.every(function (v) { return typeof v === 'string'; });
                        },
                    })
                    // NOTE: we're not using exclude and limit in the query itself because it's
                    // a slow query and quite hard to cache. It's not a lot of data that's returned
                    // anyway, so we can easily filter it out here.
                ];
                case 1:
                    postsSortedByMostPopular = _c.sent();
                    // NOTE: we're not using exclude and limit in the query itself because it's
                    // a slow query and quite hard to cache. It's not a lot of data that's returned
                    // anyway, so we can easily filter it out here.
                    return [2 /*return*/, postsSortedByMostPopular
                            .filter(function (s) { return !exclude.includes(s); })
                            .slice(0, limit)];
            }
        });
    });
}
function getTotalPostReads(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var key;
        var request = _b.request, slug = _b.slug, timings = _b.timings;
        return __generator(this, function (_c) {
            key = "total-post-reads:".concat(slug !== null && slug !== void 0 ? slug : '__all-posts__');
            return [2 /*return*/, (0, cache_server_ts_1.cachified)({
                    key: key,
                    cache: cache_server_ts_1.lruCache,
                    ttl: 1000 * 60,
                    staleWhileRevalidate: 1000 * 60 * 60 * 24,
                    request: request,
                    timings: timings,
                    checkValue: function (value) { return typeof value === 'number'; },
                    getFreshValue: function () {
                        return prisma_server_ts_1.prisma.postRead.count(slug ? { where: { postSlug: slug } } : undefined);
                    },
                })];
        });
    });
}
function isRawQueryResult(result) {
    return Array.isArray(result) && result.every(function (r) { return typeof r === 'object'; });
}
function getReaderCount(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var key;
        var _this = this;
        var request = _b.request, timings = _b.timings;
        return __generator(this, function (_c) {
            key = 'total-reader-count';
            return [2 /*return*/, (0, cache_server_ts_1.cachified)({
                    key: key,
                    cache: cache_server_ts_1.lruCache,
                    ttl: 1000 * 60 * 5,
                    staleWhileRevalidate: 1000 * 60 * 60 * 24,
                    request: request,
                    timings: timings,
                    checkValue: function (value) { return typeof value === 'number'; },
                    getFreshValue: function () { return __awaiter(_this, void 0, void 0, function () {
                        var result, count;
                        var _a, _b;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0: return [4 /*yield*/, prisma_server_ts_1.prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n      SELECT\n        (SELECT COUNT(DISTINCT \"userId\") FROM \"PostRead\" WHERE \"userId\" IS NOT NULL) +\n        (SELECT COUNT(DISTINCT \"clientId\") FROM \"PostRead\" WHERE \"clientId\" IS NOT NULL)"], ["\n      SELECT\n        (SELECT COUNT(DISTINCT \"userId\") FROM \"PostRead\" WHERE \"userId\" IS NOT NULL) +\n        (SELECT COUNT(DISTINCT \"clientId\") FROM \"PostRead\" WHERE \"clientId\" IS NOT NULL)"])))];
                                case 1:
                                    result = _c.sent();
                                    if (!isRawQueryResult(result)) {
                                        console.error("Unexpected result from getReaderCount: ".concat(result));
                                        return [2 /*return*/, 0];
                                    }
                                    count = (_b = Object.values((_a = result[0]) !== null && _a !== void 0 ? _a : [])[0]) !== null && _b !== void 0 ? _b : 0;
                                    // the count is a BigInt, so we need to convert it to a number
                                    return [2 /*return*/, Number(count)];
                            }
                        });
                    }); },
                })];
        });
    });
}
function getBlogReadRankings(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var key, rankingObjs;
        var _this = this;
        var slug = _b.slug, request = _b.request, forceFresh = _b.forceFresh, timings = _b.timings;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    key = slug ? "blog:".concat(slug, ":rankings") : "blog:rankings";
                    return [4 /*yield*/, (0, cache_server_ts_1.cachified)({
                            key: key,
                            cache: cache_server_ts_1.cache,
                            request: request,
                            timings: timings,
                            ttl: slug ? 1000 * 60 * 60 * 24 * 7 : 1000 * 60 * 60,
                            staleWhileRevalidate: 1000 * 60 * 60 * 24,
                            forceFresh: forceFresh,
                            checkValue: function (value) {
                                return Array.isArray(value) &&
                                    value.every(function (v) { return typeof v === 'object' && 'team' in v; });
                            },
                            getFreshValue: function () { return __awaiter(_this, void 0, void 0, function () {
                                var rawRankingData, rankings, maxRanking, minRanking, rankPercentages;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, Promise.all(misc_tsx_1.teams.map(function getRankingsForTeam(team) {
                                                return __awaiter(this, void 0, void 0, function () {
                                                    var totalReads, activeMembers, recentReads, ranking;
                                                    return __generator(this, function (_a) {
                                                        switch (_a.label) {
                                                            case 0: return [4 /*yield*/, prisma_server_ts_1.prisma.postRead.count({
                                                                    where: {
                                                                        postSlug: slug,
                                                                        user: { team: team },
                                                                    },
                                                                })];
                                                            case 1:
                                                                totalReads = _a.sent();
                                                                return [4 /*yield*/, getActiveMembers({ team: team, timings: timings })];
                                                            case 2:
                                                                activeMembers = _a.sent();
                                                                return [4 /*yield*/, getRecentReads({ slug: slug, team: team, timings: timings })];
                                                            case 3:
                                                                recentReads = _a.sent();
                                                                ranking = 0;
                                                                if (activeMembers) {
                                                                    ranking = Number((recentReads / activeMembers).toFixed(4));
                                                                }
                                                                return [2 /*return*/, { team: team, totalReads: totalReads, ranking: ranking }];
                                                        }
                                                    });
                                                });
                                            }))];
                                        case 1:
                                            rawRankingData = _a.sent();
                                            rankings = rawRankingData.map(function (r) { return r.ranking; });
                                            maxRanking = Math.max.apply(Math, rankings);
                                            minRanking = Math.min.apply(Math, rankings);
                                            rankPercentages = rawRankingData.map(function (_a) {
                                                var team = _a.team, totalReads = _a.totalReads, ranking = _a.ranking;
                                                return {
                                                    team: team,
                                                    totalReads: totalReads,
                                                    ranking: ranking,
                                                    percent: Number(((ranking - minRanking) / (maxRanking - minRanking || 1)).toFixed(2)),
                                                };
                                            });
                                            return [2 /*return*/, rankPercentages];
                                    }
                                });
                            }); },
                        })];
                case 1:
                    rankingObjs = _c.sent();
                    return [2 /*return*/, (rankingObjs
                            // if they're the same, then we'll randomize their relative order.
                            // Otherwise, it's greatest to smallest
                            .sort(function (_a, _b) {
                            var a = _a.percent;
                            var b = _b.percent;
                            return b === a ? (Math.random() > 0.5 ? -1 : 1) : a > b ? -1 : 1;
                        }))];
            }
        });
    });
}
function getAllBlogPostReadRankings(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var key;
        var _this = this;
        var request = _b.request, forceFresh = _b.forceFresh, timings = _b.timings;
        return __generator(this, function (_c) {
            key = 'all-blog-post-read-rankings';
            return [2 /*return*/, (0, cache_server_ts_1.cachified)({
                    key: key,
                    cache: cache_server_ts_1.cache,
                    request: request,
                    timings: timings,
                    forceFresh: forceFresh,
                    ttl: 1000 * 60 * 5, // the underlying caching should be able to handle this every 5 minues
                    staleWhileRevalidate: 1000 * 60 * 60 * 24,
                    getFreshValue: function () { return __awaiter(_this, void 0, void 0, function () {
                        var posts, limit, allPostReadRankings;
                        var _this = this;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, (0, mdx_server_ts_1.getBlogMdxListItems)({ request: request, timings: timings })
                                    // each of the getBlogReadRankings calls results in 9 database queries
                                    // and we don't want to hit the limit of connections so we limit this
                                    // to 2 at a time. Though most of the data should be cached anyway.
                                    // This is good to just be certain.
                                ];
                                case 1:
                                    posts = _a.sent();
                                    limit = (0, p_limit_1.default)(2);
                                    allPostReadRankings = {};
                                    return [4 /*yield*/, Promise.all(posts.map(function (post) {
                                            return limit(function () { return __awaiter(_this, void 0, void 0, function () {
                                                var _a, _b;
                                                return __generator(this, function (_c) {
                                                    switch (_c.label) {
                                                        case 0:
                                                            _a = allPostReadRankings;
                                                            _b = post.slug;
                                                            return [4 /*yield*/, getBlogReadRankings({
                                                                    request: request,
                                                                    slug: post.slug,
                                                                    timings: timings,
                                                                })];
                                                        case 1:
                                                            _a[_b] = _c.sent();
                                                            return [2 /*return*/];
                                                    }
                                                });
                                            }); });
                                        }))];
                                case 2:
                                    _a.sent();
                                    return [2 /*return*/, allPostReadRankings];
                            }
                        });
                    }); },
                })];
        });
    });
}
function getRecentReads(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var withinTheLastSixMonths, count;
        var slug = _b.slug, team = _b.team, timings = _b.timings;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    withinTheLastSixMonths = (0, date_fns_1.subMonths)(new Date(), 6);
                    return [4 /*yield*/, (0, timing_server_ts_1.time)(prisma_server_ts_1.prisma.postRead.count({
                            where: {
                                postSlug: slug,
                                createdAt: { gt: withinTheLastSixMonths },
                                user: { team: team },
                            },
                        }), {
                            timings: timings,
                            type: 'getRecentReads',
                            desc: "Getting reads of ".concat(slug, " by ").concat(team, " within the last 6 months"),
                        })];
                case 1:
                    count = _c.sent();
                    return [2 /*return*/, count];
            }
        });
    });
}
function getActiveMembers(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var withinTheLastYear, count;
        var team = _b.team, timings = _b.timings;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    withinTheLastYear = (0, date_fns_1.subYears)(new Date(), 1);
                    return [4 /*yield*/, (0, timing_server_ts_1.time)(prisma_server_ts_1.prisma.user.count({
                            where: {
                                team: team,
                                postReads: {
                                    some: {
                                        createdAt: { gt: withinTheLastYear },
                                    },
                                },
                            },
                        }), {
                            timings: timings,
                            type: 'getActiveMembers',
                            desc: "Getting active members of ".concat(team),
                        })];
                case 1:
                    count = _c.sent();
                    return [2 /*return*/, count];
            }
        });
    });
}
function getSlugReadsByUser(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var user, clientSession, clientId, reads;
        var request = _b.request, timings = _b.timings;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, session_server_ts_1.getUser)(request)];
                case 1:
                    user = _c.sent();
                    return [4 /*yield*/, (0, client_server_ts_1.getClientSession)(request, user)];
                case 2:
                    clientSession = _c.sent();
                    clientId = clientSession.getClientId();
                    return [4 /*yield*/, (0, timing_server_ts_1.time)(prisma_server_ts_1.prisma.postRead.findMany({
                            where: user ? { userId: user.id } : { clientId: clientId },
                            select: { postSlug: true },
                        }), {
                            timings: timings,
                            type: 'getSlugReadsByUser',
                            desc: "Getting reads by ".concat(user ? user.id : clientId),
                        })];
                case 3:
                    reads = _c.sent();
                    return [2 /*return*/, Array.from(new Set(reads.map(function (read) { return read.postSlug; })))];
            }
        });
    });
}
function getPostJson(request) {
    return __awaiter(this, void 0, void 0, function () {
        var posts, blogUrl;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, mdx_server_ts_1.getBlogMdxListItems)({ request: request })];
                case 1:
                    posts = _a.sent();
                    blogUrl = "".concat((0, misc_tsx_1.getDomainUrl)(request), "/blog");
                    return [2 /*return*/, posts.map(function (post) {
                            var slug = post.slug, _a = post.frontmatter, title = _a.title, description = _a.description, _b = _a.meta, _c = _b === void 0 ? {} : _b, _d = _c.keywords, keywords = _d === void 0 ? [] : _d, categories = _a.categories;
                            return {
                                id: slug,
                                slug: slug,
                                productionUrl: "".concat(blogUrl, "/").concat(slug),
                                title: title,
                                categories: categories,
                                keywords: keywords,
                                description: description,
                            };
                        })];
            }
        });
    });
}
var leaderboardChannelId = (0, misc_tsx_1.getRequiredServerEnvVar)('DISCORD_LEADERBOARD_CHANNEL');
var getUserDiscordMention = function (user) {
    return user.discordId ? "<@!".concat(user.discordId, ">") : user.firstName;
};
function notifyOfTeamLeaderChangeOnPost(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var blogUrl, newLeaderEmoji, url, newTeamMention, prevLeaderEmoji, prevTeamMention, readerMention, cause, who, cause, readerMention;
        var request = _b.request, prevLeader = _b.prevLeader, newLeader = _b.newLeader, postSlug = _b.postSlug, reader = _b.reader;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    blogUrl = "".concat((0, misc_tsx_1.getDomainUrl)(request), "/blog");
                    newLeaderEmoji = team_provider_tsx_1.teamEmoji[newLeader];
                    url = "".concat(blogUrl, "/").concat(postSlug);
                    newTeamMention = "the ".concat(newLeaderEmoji, " ").concat(newLeader.toLowerCase(), " team");
                    if (!prevLeader) return [3 /*break*/, 5];
                    prevLeaderEmoji = team_provider_tsx_1.teamEmoji[prevLeader];
                    prevTeamMention = "the ".concat(prevLeaderEmoji, " ").concat(prevLeader.toLowerCase(), " team");
                    if (!(reader && reader.team === newLeader)) return [3 /*break*/, 2];
                    readerMention = getUserDiscordMention(reader);
                    cause = "".concat(readerMention, " just read ").concat(url, " and won the post from ").concat(prevTeamMention, " for ").concat(newTeamMention, "!");
                    return [4 /*yield*/, (0, discord_server_ts_1.sendMessageFromDiscordBot)(leaderboardChannelId, "\uD83C\uDF89 Congratulations to ".concat(newTeamMention, "! You've won a post!\n\n").concat(cause))];
                case 1:
                    _c.sent();
                    return [3 /*break*/, 4];
                case 2:
                    who = reader
                        ? "Someone on the ".concat(team_provider_tsx_1.teamEmoji[(0, misc_tsx_1.getOptionalTeam)(reader.team)], " ").concat(reader.team.toLowerCase(), " team")
                        : "An anonymous user";
                    cause = "".concat(who, " just read ").concat(url, " and triggered a recalculation of the rankings: ").concat(prevTeamMention, " lost the post and it's now claimed by ").concat(newTeamMention, "!");
                    return [4 /*yield*/, (0, discord_server_ts_1.sendMessageFromDiscordBot)(leaderboardChannelId, "\uD83C\uDF89 Congratulations to ".concat(newTeamMention, "! You've won a post!\n\n").concat(cause))];
                case 3:
                    _c.sent();
                    _c.label = 4;
                case 4: return [3 /*break*/, 7];
                case 5:
                    if (!reader) return [3 /*break*/, 7];
                    readerMention = getUserDiscordMention(reader);
                    return [4 /*yield*/, (0, discord_server_ts_1.sendMessageFromDiscordBot)(leaderboardChannelId, "Congratulations to ".concat(newTeamMention, "! You've won a post!\n\n").concat(readerMention, " just read ").concat(url, " and claimed the post for ").concat(newTeamMention, "!"))];
                case 6:
                    _c.sent();
                    _c.label = 7;
                case 7: return [2 /*return*/];
            }
        });
    });
}
function notifyOfOverallTeamLeaderChange(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var blogUrl, newLeaderEmoji, url, cause, prevLeaderEmoji;
        var request = _b.request, prevLeader = _b.prevLeader, newLeader = _b.newLeader, postSlug = _b.postSlug, reader = _b.reader;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    blogUrl = "".concat((0, misc_tsx_1.getDomainUrl)(request), "/blog");
                    newLeaderEmoji = team_provider_tsx_1.teamEmoji[newLeader];
                    url = "".concat(blogUrl, "/").concat(postSlug);
                    cause = reader
                        ? "".concat(getUserDiscordMention(reader), " just read ").concat(url)
                        : "An anonymous user just read ".concat(url, " triggering a ranking recalculation");
                    if (!prevLeader) return [3 /*break*/, 2];
                    prevLeaderEmoji = team_provider_tsx_1.teamEmoji[prevLeader];
                    return [4 /*yield*/, (0, discord_server_ts_1.sendMessageFromDiscordBot)(leaderboardChannelId, "\uD83C\uDF89 Congratulations to the ".concat(newLeaderEmoji, " ").concat(newLeader.toLowerCase(), " team! ").concat(cause, " and knocked team ").concat(prevLeaderEmoji, " ").concat(prevLeader.toLowerCase(), " team off the top of the leader board! \uD83D\uDC4F"))];
                case 1:
                    _c.sent();
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, (0, discord_server_ts_1.sendMessageFromDiscordBot)(leaderboardChannelId, "\uD83C\uDF89 Congratulations to the ".concat(newLeaderEmoji, " ").concat(newLeader.toLowerCase(), " team! ").concat(cause, " and took ").concat(newLeader.toLowerCase(), " team to the top of the leader board! \uD83D\uDC4F"))];
                case 3:
                    _c.sent();
                    _c.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
var templateObject_1;
