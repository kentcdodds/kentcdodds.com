"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestStorage = void 0;
exports.connect = connect;
var node_async_hooks_1 = require("node:async_hooks");
var mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
var zod_1 = require("zod");
var kit_server_js_1 = require("#app/kit/kit.server.js");
var blog_server_js_1 = require("#app/utils/blog.server.js");
var lodash_ts_1 = require("#app/utils/cjs/lodash.ts");
var mdx_server_js_1 = require("#app/utils/mdx.server.js");
var misc_js_1 = require("#app/utils/misc.js");
var prisma_server_js_1 = require("#app/utils/prisma.server.js");
var search_server_js_1 = require("#app/utils/search.server.js");
var simplecast_server_js_1 = require("#app/utils/simplecast.server.js");
var verifier_server_js_1 = require("#app/utils/verifier.server.js");
var fetch_stream_transport_server_ts_1 = require("./fetch-stream-transport.server.ts");
exports.requestStorage = new node_async_hooks_1.AsyncLocalStorage();
var transports = new Map();
function createServer() {
    var _this = this;
    var server = new mcp_js_1.McpServer({
        name: 'kentcdodds.com',
        version: '1.0.0',
    }, {
        capabilities: {
            tools: {},
        },
    });
    server.registerTool('whoami', {
        description: 'Get the user ID of the current user',
        inputSchema: {},
    }, function (_, extra) { return __awaiter(_this, void 0, void 0, function () {
        var user;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, requireUser(extra.authInfo)];
                case 1:
                    user = _a.sent();
                    return [2 /*return*/, { content: [{ type: 'text', text: JSON.stringify(user) }] }];
            }
        });
    }); });
    server.registerTool('update_user_info', {
        description: 'Update the user info for the current user',
        inputSchema: {
            firstName: zod_1.z.string().optional().describe('The first name of the user'),
        },
    }, function (_a, extra_1) { return __awaiter(_this, [_a, extra_1], void 0, function (_b, extra) {
        var user;
        var firstName = _b.firstName;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, requireUser(extra.authInfo)];
                case 1:
                    user = _c.sent();
                    return [4 /*yield*/, prisma_server_js_1.prisma.user.update({
                            where: { id: user.id },
                            data: { firstName: firstName },
                        })];
                case 2:
                    _c.sent();
                    return [2 /*return*/, { content: [{ type: 'text', text: 'User info updated' }] }];
            }
        });
    }); });
    server.registerTool('get_post_reads', {
        description: 'Get the post reads for the current user',
        inputSchema: {},
    }, function (_, extra) { return __awaiter(_this, void 0, void 0, function () {
        var request, user, postReads, domainUrl, groupedBySlug, posts;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    request = requireRequest();
                    return [4 /*yield*/, requireUser(extra.authInfo)];
                case 1:
                    user = _a.sent();
                    return [4 /*yield*/, prisma_server_js_1.prisma.postRead.findMany({
                            where: { userId: user.id },
                            select: {
                                postSlug: true,
                                createdAt: true,
                            },
                            orderBy: {
                                createdAt: 'desc',
                            },
                        })];
                case 2:
                    postReads = _a.sent();
                    domainUrl = (0, misc_js_1.getDomainUrl)(request);
                    groupedBySlug = (0, lodash_ts_1.groupBy)(postReads, 'postSlug');
                    posts = Object.entries(groupedBySlug).map(function (_a) {
                        var postSlug = _a[0], reads = _a[1];
                        return ({
                            url: "".concat(domainUrl, "/blog/").concat(postSlug),
                            readCount: reads.length,
                            reads: reads.map(function (_a) {
                                var createdAt = _a.createdAt;
                                return createdAt.toISOString();
                            }),
                        });
                    });
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(posts),
                                },
                            ],
                        }];
            }
        });
    }); });
    server.registerTool('get_recommended_posts', {
        description: 'Get recommended posts for the current user',
        inputSchema: {},
    }, function () { return __awaiter(_this, void 0, void 0, function () {
        var request, domainUrl, recommendations, posts;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    request = requireRequest();
                    domainUrl = (0, misc_js_1.getDomainUrl)(request);
                    return [4 /*yield*/, (0, blog_server_js_1.getBlogRecommendations)({ request: request })];
                case 1:
                    recommendations = _a.sent();
                    posts = recommendations.map(function (_a) {
                        var _b = _a.frontmatter, 
                        // remove this because it's not needed and it's kinda big
                        _bannerBlurDataUrl = _b.bannerBlurDataUrl, frontmatter = __rest(_b, ["bannerBlurDataUrl"]), recommendation = __rest(_a, ["frontmatter"]);
                        return (__assign(__assign({}, recommendation), { url: "".concat(domainUrl, "/blog/").concat(recommendation.slug), frontmatter: frontmatter }));
                    });
                    return [2 /*return*/, {
                            content: [{ type: 'text', text: JSON.stringify(posts) }],
                        }];
            }
        });
    }); });
    server.registerTool('get_most_popular_posts', {
        description: 'Get the most popular posts on kentcdodds.com',
        inputSchema: {},
    }, function () { return __awaiter(_this, void 0, void 0, function () {
        var request, domainUrl, mostPopularPosts, posts;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    request = requireRequest();
                    domainUrl = (0, misc_js_1.getDomainUrl)(request);
                    return [4 /*yield*/, prisma_server_js_1.prisma.postRead.groupBy({
                            by: ['postSlug'],
                            _count: true,
                            orderBy: {
                                _count: {
                                    postSlug: 'desc',
                                },
                            },
                            take: 10,
                        })];
                case 1:
                    mostPopularPosts = _a.sent();
                    posts = mostPopularPosts.map(function (_a) {
                        var postSlug = _a.postSlug, _count = _a._count;
                        return ({
                            url: "".concat(domainUrl, "/blog/").concat(postSlug),
                            readCount: _count,
                        });
                    });
                    return [2 /*return*/, {
                            content: [{ type: 'text', text: JSON.stringify(posts) }],
                        }];
            }
        });
    }); });
    server.registerTool('find_content', {
        description: 'Search for content on kentcdodds.com',
        inputSchema: {
            query: zod_1.z
                .string()
                .describe("The query to search for. It's not very intelligent, it uses match-sorter to find text matches in titles, descriptions, categories, tags, etc. Simpler and shorter queries are better."),
            category: zod_1.z
                .union([
                zod_1.z.literal('Blog'),
                zod_1.z.literal('Chats with Kent Podcast'),
                zod_1.z.literal('Call Kent Podcast'),
                zod_1.z.literal('Workshops'),
                zod_1.z.literal('Talks'),
            ])
                .optional()
                .describe('The category to search in, if omitted, it will search all categories'),
        },
    }, function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
        var request, domainUrl, categoryMap, searchResults;
        var query = _b.query, category = _b.category;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    request = exports.requestStorage.getStore();
                    if (!request) {
                        throw new Error('No request found');
                    }
                    domainUrl = (0, misc_js_1.getDomainUrl)(request);
                    categoryMap = {
                        Blog: 'b',
                        'Chats with Kent Podcast': 'cwk',
                        'Call Kent Podcast': 'ckp',
                        Workshops: 'w',
                        Talks: 't',
                    };
                    return [4 /*yield*/, (0, search_server_js_1.searchKCD)({
                            request: request,
                            query: category ? "".concat(categoryMap[category], ":").concat(query) : query,
                        })];
                case 1:
                    searchResults = _c.sent();
                    if (searchResults.length) {
                        return [2 /*return*/, {
                                content: [
                                    {
                                        type: 'text',
                                        text: searchResults
                                            .map(function (_a) {
                                            var title = _a.title, route = _a.route, segment = _a.segment, metadata = _a.metadata;
                                            return JSON.stringify(__assign({ title: title, url: "".concat(domainUrl).concat(route), category: segment }, metadata));
                                        })
                                            .join('\n'),
                                    },
                                ],
                            }];
                    }
                    else {
                        return [2 /*return*/, {
                                content: [{ type: 'text', text: "No content found for ".concat(query) }],
                            }];
                    }
                    return [2 /*return*/];
            }
        });
    }); });
    server.registerTool('get_blog_post', {
        description: 'Get the content of a specific blog post by its slug',
        inputSchema: {
            slug: zod_1.z.string().describe('The slug of the blog post to retrieve'),
        },
    }, function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
        var files;
        var slug = _b.slug;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, mdx_server_js_1.downloadMdxFilesCached)('blog', slug, {})];
                case 1:
                    files = (_c.sent()).files;
                    if (!files.length) {
                        return [2 /*return*/, {
                                content: [
                                    { type: 'text', text: "No blog post found with slug: ".concat(slug) },
                                ],
                            }];
                    }
                    return [2 /*return*/, {
                            content: files.map(function (file) {
                                return ({
                                    type: 'text',
                                    text: "".concat(file.path, ":\n\n").concat(file.content),
                                });
                            }),
                        }];
            }
        });
    }); });
    server.registerTool('get_chats_with_kent_episode_details', {
        description: 'Get the details (title, description, transcript, etc.) for a specific episode of the Chats with Kent podcast by its season number and episode number',
        inputSchema: {
            seasonNumber: zod_1.z
                .number()
                .describe('The number of the season to retrieve'),
            episodeNumber: zod_1.z
                .number()
                .describe('The number of the episode to retrieve'),
        },
    }, function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
        var request, seasons, season, episode;
        var episodeNumber = _b.episodeNumber, seasonNumber = _b.seasonNumber;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    request = exports.requestStorage.getStore();
                    if (!request) {
                        throw new Error('No request found');
                    }
                    return [4 /*yield*/, (0, simplecast_server_js_1.getSeasons)({ request: request })];
                case 1:
                    seasons = _c.sent();
                    season = seasons.find(function (s) { return s.seasonNumber === seasonNumber; });
                    if (!season) {
                        throw new Response("Season ".concat(seasonNumber, " not found"), { status: 404 });
                    }
                    episode = season.episodes.find(function (e) { return e.episodeNumber === episodeNumber; });
                    if (!episode) {
                        throw new Response("Episode ".concat(episodeNumber, " not found"), {
                            status: 404,
                        });
                    }
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: 'text',
                                    text: "Title: ".concat(episode.title, "\n"),
                                },
                                {
                                    type: 'text',
                                    text: "Description:\n".concat(episode.description, "\n"),
                                },
                                {
                                    type: 'text',
                                    text: "Transcript:\n\n".concat(episode.transcriptHTML) ||
                                        "Transcript: No transcript found for ".concat(episode.title, " (Chats with Kent S").concat(seasonNumber, "E").concat(episodeNumber, ")"),
                                },
                            ],
                        }];
            }
        });
    }); });
    server.registerTool('subscribe_to_newsletter', {
        description: 'Subscribe to Kent C. Dodds newsletter and get regular updates about new articles, courses, and workshops',
        inputSchema: {
            email: zod_1.z
                .string()
                .email()
                .optional()
                .describe('The email address to subscribe (make sure to ask the user for their email address before calling this tool. They will receive a confirmation email if not already subscribed)'),
            firstName: zod_1.z.string().optional().describe('Your first name (optional)'),
        },
    }, function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
        var isVerified, error_1;
        var email = _b.email, firstName = _b.firstName;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!email) {
                        return [2 /*return*/, {
                                isError: true,
                                content: [
                                    {
                                        type: 'text',
                                        text: "No email address provided. Please provide the user's email address before calling this tool.",
                                    },
                                ],
                            }];
                    }
                    return [4 /*yield*/, (0, verifier_server_js_1.isEmailVerified)(email)];
                case 1:
                    isVerified = _c.sent();
                    if (!isVerified.verified) {
                        return [2 /*return*/, {
                                isError: true,
                                content: [{ type: 'text', text: isVerified.message }],
                            }];
                    }
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, (0, kit_server_js_1.addSubscriberToForm)({
                            email: email,
                            firstName: firstName !== null && firstName !== void 0 ? firstName : '',
                            kitFormId: '827139',
                        })];
                case 3:
                    _c.sent();
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: 'text',
                                    text: "Successfully subscribed ".concat(email, " to Kent's newsletter! If you're not already on Kent's mailing list, you'll receive a confirmation email."),
                                },
                            ],
                        }];
                case 4:
                    error_1 = _c.sent();
                    return [2 /*return*/, {
                            isError: true,
                            content: [
                                {
                                    type: 'text',
                                    text: "Failed to subscribe to the newsletter: ".concat((0, misc_js_1.getErrorMessage)(error_1)),
                                },
                            ],
                        }];
                case 5: return [2 /*return*/];
            }
        });
    }); });
    return server;
}
var server = createServer();
function connect(sessionId) {
    return __awaiter(this, void 0, void 0, function () {
        var existingTransport, transport;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    existingTransport = sessionId ? transports.get(sessionId) : undefined;
                    if (existingTransport) {
                        return [2 /*return*/, existingTransport];
                    }
                    transport = new fetch_stream_transport_server_ts_1.FetchAPIHTTPServerTransport({
                        sessionIdGenerator: function () { return sessionId !== null && sessionId !== void 0 ? sessionId : crypto.randomUUID(); },
                        onsessioninitialized: function (sessionId) {
                            return __awaiter(this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    transports.set(sessionId, transport);
                                    return [2 /*return*/];
                                });
                            });
                        },
                    });
                    transport.onclose = function () {
                        if (transport.sessionId)
                            transports.delete(transport.sessionId);
                    };
                    return [4 /*yield*/, server.connect(transport)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, transport];
            }
        });
    });
}
function getUserId(authInfo) {
    if (authInfo && authInfo.extra && typeof authInfo.extra.userId === 'string') {
        return authInfo.extra.userId;
    }
    return null;
}
function getUser(authInfo) {
    return __awaiter(this, void 0, void 0, function () {
        var userId, user;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userId = getUserId(authInfo);
                    if (!userId)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, prisma_server_js_1.prisma.user.findUnique({
                            where: { id: userId },
                            select: {
                                id: true,
                                firstName: true,
                                email: true,
                                team: true,
                                _count: {
                                    select: { postReads: true },
                                },
                            },
                        })];
                case 1:
                    user = _a.sent();
                    if (!user)
                        return [2 /*return*/, null];
                    return [2 /*return*/, user];
            }
        });
    });
}
function requireUser(authInfo) {
    return __awaiter(this, void 0, void 0, function () {
        var user;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getUser(authInfo)];
                case 1:
                    user = _a.sent();
                    (0, misc_js_1.invariant)(user, 'User not found');
                    return [2 /*return*/, user];
            }
        });
    });
}
function requireRequest() {
    var request = exports.requestStorage.getStore();
    (0, misc_js_1.invariant)(request, 'No request found');
    return request;
}
