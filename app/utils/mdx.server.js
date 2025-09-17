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
exports.getMdxPage = getMdxPage;
exports.getMdxPagesInDirectory = getMdxPagesInDirectory;
exports.getMdxDirList = getMdxDirList;
exports.getBlogMdxListItems = getBlogMdxListItems;
exports.downloadMdxFilesCached = downloadMdxFilesCached;
var cloudinary_build_url_1 = require("cloudinary-build-url");
var compile_mdx_server_ts_1 = require("#app/utils/compile-mdx.server.ts");
var github_server_ts_1 = require("#app/utils/github.server.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var cache_server_ts_1 = require("./cache.server.ts");
var markdown_server_ts_1 = require("./markdown.server.ts");
var defaultTTL = 1000 * 60 * 60 * 24 * 14;
var defaultStaleWhileRevalidate = 1000 * 60 * 60 * 24 * 365 * 100;
var checkCompiledValue = function (value) {
    return typeof value === 'object' &&
        (value === null || ('code' in value && 'frontmatter' in value));
};
function getMdxPage(_a, options_1) {
    return __awaiter(this, arguments, void 0, function (_b, options) {
        var forceFresh, _c, ttl, request, timings, key, page;
        var _this = this;
        var contentDir = _b.contentDir, slug = _b.slug;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    forceFresh = options.forceFresh, _c = options.ttl, ttl = _c === void 0 ? defaultTTL : _c, request = options.request, timings = options.timings;
                    key = "mdx-page:".concat(contentDir, ":").concat(slug, ":compiled");
                    return [4 /*yield*/, (0, cache_server_ts_1.cachified)({
                            key: key,
                            cache: cache_server_ts_1.cache,
                            request: request,
                            timings: timings,
                            ttl: ttl,
                            staleWhileRevalidate: defaultStaleWhileRevalidate,
                            forceFresh: forceFresh,
                            checkValue: checkCompiledValue,
                            getFreshValue: function () { return __awaiter(_this, void 0, void 0, function () {
                                var pageFiles, compiledPage;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, downloadMdxFilesCached(contentDir, slug, options)];
                                        case 1:
                                            pageFiles = _a.sent();
                                            return [4 /*yield*/, compileMdxCached(__assign(__assign({ contentDir: contentDir, slug: slug }, pageFiles), { options: options })).catch(function (err) {
                                                    console.error("Failed to get a fresh value for mdx:", {
                                                        contentDir: contentDir,
                                                        slug: slug,
                                                    });
                                                    return Promise.reject(err);
                                                })];
                                        case 2:
                                            compiledPage = _a.sent();
                                            return [2 /*return*/, compiledPage];
                                    }
                                });
                            }); },
                        })];
                case 1:
                    page = _d.sent();
                    if (!page) {
                        // if there's no page, let's remove it from the cache
                        void cache_server_ts_1.cache.delete(key);
                    }
                    return [2 /*return*/, page];
            }
        });
    });
}
function getMdxPagesInDirectory(contentDir, options) {
    return __awaiter(this, void 0, void 0, function () {
        var dirList, pageDatas, pages;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getMdxDirList(contentDir, options)
                    // our octokit throttle plugin will make sure we don't hit the rate limit
                ];
                case 1:
                    dirList = _a.sent();
                    return [4 /*yield*/, Promise.all(dirList.map(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                            var _c;
                            var slug = _b.slug;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        _c = [{}];
                                        return [4 /*yield*/, downloadMdxFilesCached(contentDir, slug, options)];
                                    case 1: return [2 /*return*/, __assign.apply(void 0, [__assign.apply(void 0, _c.concat([(_d.sent())])), { slug: slug }])];
                                }
                            });
                        }); }))];
                case 2:
                    pageDatas = _a.sent();
                    return [4 /*yield*/, Promise.all(pageDatas.map(function (pageData) {
                            return compileMdxCached(__assign(__assign({ contentDir: contentDir }, pageData), { options: options }));
                        }))];
                case 3:
                    pages = _a.sent();
                    return [2 /*return*/, pages.filter(misc_tsx_1.typedBoolean)];
            }
        });
    });
}
var getDirListKey = function (contentDir) { return "".concat(contentDir, ":dir-list"); };
function getMdxDirList(contentDir, options) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, forceFresh, _b, ttl, request, timings, key;
        var _this = this;
        return __generator(this, function (_c) {
            _a = options !== null && options !== void 0 ? options : {}, forceFresh = _a.forceFresh, _b = _a.ttl, ttl = _b === void 0 ? defaultTTL : _b, request = _a.request, timings = _a.timings;
            key = getDirListKey(contentDir);
            return [2 /*return*/, (0, cache_server_ts_1.cachified)({
                    cache: cache_server_ts_1.cache,
                    request: request,
                    timings: timings,
                    ttl: ttl,
                    staleWhileRevalidate: defaultStaleWhileRevalidate,
                    forceFresh: forceFresh,
                    key: key,
                    checkValue: function (value) { return Array.isArray(value); },
                    getFreshValue: function () { return __awaiter(_this, void 0, void 0, function () {
                        var fullContentDirPath, dirList;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    fullContentDirPath = "content/".concat(contentDir);
                                    return [4 /*yield*/, (0, github_server_ts_1.downloadDirList)(fullContentDirPath)];
                                case 1:
                                    dirList = (_a.sent())
                                        .map(function (_a) {
                                        var name = _a.name, path = _a.path;
                                        return ({
                                            name: name,
                                            slug: path
                                                .replace(/\\/g, '/')
                                                .replace("".concat(fullContentDirPath, "/"), '')
                                                .replace(/\.mdx$/, ''),
                                        });
                                    })
                                        .filter(function (_a) {
                                        var name = _a.name;
                                        return name !== 'README.md';
                                    });
                                    return [2 /*return*/, dirList];
                            }
                        });
                    }); },
                })];
        });
    });
}
function getBlogMdxListItems(options) {
    return __awaiter(this, void 0, void 0, function () {
        var request, forceFresh, _a, ttl, timings, key;
        var _this = this;
        return __generator(this, function (_b) {
            request = options.request, forceFresh = options.forceFresh, _a = options.ttl, ttl = _a === void 0 ? defaultTTL : _a, timings = options.timings;
            key = 'blog:mdx-list-items';
            return [2 /*return*/, (0, cache_server_ts_1.cachified)({
                    cache: cache_server_ts_1.cache,
                    request: request,
                    timings: timings,
                    ttl: ttl,
                    staleWhileRevalidate: defaultStaleWhileRevalidate,
                    forceFresh: forceFresh,
                    key: key,
                    getFreshValue: function () { return __awaiter(_this, void 0, void 0, function () {
                        var pages;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, getMdxPagesInDirectory('blog', options).then(function (allPosts) {
                                        return allPosts.filter(function (p) { return !p.frontmatter.draft && !p.frontmatter.unlisted; });
                                    })];
                                case 1:
                                    pages = _a.sent();
                                    pages = pages.sort(function (a, z) {
                                        var _a, _b;
                                        var aTime = new Date((_a = a.frontmatter.date) !== null && _a !== void 0 ? _a : '').getTime();
                                        var zTime = new Date((_b = z.frontmatter.date) !== null && _b !== void 0 ? _b : '').getTime();
                                        return aTime > zTime ? -1 : aTime === zTime ? 0 : 1;
                                    });
                                    return [2 /*return*/, pages.map(function (_a) {
                                            var code = _a.code, rest = __rest(_a, ["code"]);
                                            return rest;
                                        })];
                            }
                        });
                    }); },
                })];
        });
    });
}
function downloadMdxFilesCached(contentDir, slug, options) {
    return __awaiter(this, void 0, void 0, function () {
        var forceFresh, _a, ttl, request, timings, key, downloaded;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    forceFresh = options.forceFresh, _a = options.ttl, ttl = _a === void 0 ? defaultTTL : _a, request = options.request, timings = options.timings;
                    key = "".concat(contentDir, ":").concat(slug, ":downloaded");
                    return [4 /*yield*/, (0, cache_server_ts_1.cachified)({
                            cache: cache_server_ts_1.cache,
                            request: request,
                            timings: timings,
                            ttl: ttl,
                            staleWhileRevalidate: defaultStaleWhileRevalidate,
                            forceFresh: forceFresh,
                            key: key,
                            checkValue: function (value) {
                                if (typeof value !== 'object') {
                                    return "value is not an object";
                                }
                                if (value === null) {
                                    return "value is null";
                                }
                                var download = value;
                                if (!Array.isArray(download.files)) {
                                    return "value.files is not an array";
                                }
                                if (typeof download.entry !== 'string') {
                                    return "value.entry is not a string";
                                }
                                return true;
                            },
                            getFreshValue: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, (0, github_server_ts_1.downloadMdxFileOrDirectory)("".concat(contentDir, "/").concat(slug))];
                            }); }); },
                        })
                        // if there aren't any files, remove it from the cache
                    ];
                case 1:
                    downloaded = _b.sent();
                    // if there aren't any files, remove it from the cache
                    if (!downloaded.files.length) {
                        void cache_server_ts_1.cache.delete(key);
                    }
                    return [2 /*return*/, downloaded];
            }
        });
    });
}
function compileMdxCached(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var key, page;
        var _this = this;
        var contentDir = _b.contentDir, slug = _b.slug, entry = _b.entry, files = _b.files, options = _b.options;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    key = "".concat(contentDir, ":").concat(slug, ":compiled");
                    return [4 /*yield*/, (0, cache_server_ts_1.cachified)(__assign(__assign({ cache: cache_server_ts_1.cache, ttl: defaultTTL, staleWhileRevalidate: defaultStaleWhileRevalidate }, options), { key: key, checkValue: checkCompiledValue, getFreshValue: function () { return __awaiter(_this, void 0, void 0, function () {
                                var compiledPage, _a, error_1, credit, noHtml;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0: return [4 /*yield*/, (0, compile_mdx_server_ts_1.compileMdx)(slug, files)];
                                        case 1:
                                            compiledPage = _b.sent();
                                            if (!compiledPage) return [3 /*break*/, 9];
                                            if (!(compiledPage.frontmatter.bannerCloudinaryId &&
                                                !compiledPage.frontmatter.bannerBlurDataUrl)) return [3 /*break*/, 5];
                                            _b.label = 2;
                                        case 2:
                                            _b.trys.push([2, 4, , 5]);
                                            _a = compiledPage.frontmatter;
                                            return [4 /*yield*/, getBlurDataUrl(compiledPage.frontmatter.bannerCloudinaryId)];
                                        case 3:
                                            _a.bannerBlurDataUrl = _b.sent();
                                            return [3 /*break*/, 5];
                                        case 4:
                                            error_1 = _b.sent();
                                            console.error('oh no, there was an error getting the blur image data url', error_1);
                                            return [3 /*break*/, 5];
                                        case 5:
                                            if (!compiledPage.frontmatter.bannerCredit) return [3 /*break*/, 8];
                                            return [4 /*yield*/, (0, markdown_server_ts_1.markdownToHtmlUnwrapped)(compiledPage.frontmatter.bannerCredit)];
                                        case 6:
                                            credit = _b.sent();
                                            compiledPage.frontmatter.bannerCredit = credit;
                                            return [4 /*yield*/, (0, markdown_server_ts_1.stripHtml)(credit)];
                                        case 7:
                                            noHtml = _b.sent();
                                            if (!compiledPage.frontmatter.bannerAlt) {
                                                compiledPage.frontmatter.bannerAlt = noHtml
                                                    .replace(/(photo|image)/i, '')
                                                    .trim();
                                            }
                                            if (!compiledPage.frontmatter.bannerTitle) {
                                                compiledPage.frontmatter.bannerTitle = noHtml;
                                            }
                                            _b.label = 8;
                                        case 8: return [2 /*return*/, __assign(__assign({ dateDisplay: compiledPage.frontmatter.date
                                                    ? (0, misc_tsx_1.formatDate)(compiledPage.frontmatter.date)
                                                    : undefined }, compiledPage), { slug: slug, editLink: "https://github.com/kentcdodds/kentcdodds.com/edit/main/".concat(entry) })];
                                        case 9: return [2 /*return*/, null];
                                    }
                                });
                            }); } }))
                        // if there's no page, remove it from the cache
                    ];
                case 1:
                    page = _c.sent();
                    // if there's no page, remove it from the cache
                    if (!page) {
                        void cache_server_ts_1.cache.delete(key);
                    }
                    return [2 /*return*/, page];
            }
        });
    });
}
function getBlurDataUrl(cloudinaryId) {
    return __awaiter(this, void 0, void 0, function () {
        var imageURL, dataUrl;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    imageURL = (0, cloudinary_build_url_1.buildImageUrl)(cloudinaryId, {
                        transformations: {
                            resize: { width: 100 },
                            quality: 'auto',
                            format: 'webp',
                            effect: {
                                name: 'blur',
                                value: '1000',
                            },
                        },
                    });
                    return [4 /*yield*/, getDataUrlForImage(imageURL)];
                case 1:
                    dataUrl = _a.sent();
                    return [2 /*return*/, dataUrl];
            }
        });
    });
}
function getDataUrlForImage(imageUrl) {
    return __awaiter(this, void 0, void 0, function () {
        var res, arrayBuffer, base64, mime, dataUrl;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, fetch(imageUrl)];
                case 1:
                    res = _b.sent();
                    return [4 /*yield*/, res.arrayBuffer()];
                case 2:
                    arrayBuffer = _b.sent();
                    base64 = Buffer.from(arrayBuffer).toString('base64');
                    mime = (_a = res.headers.get('Content-Type')) !== null && _a !== void 0 ? _a : 'image/webp';
                    dataUrl = "data:".concat(mime, ";base64,").concat(base64);
                    return [2 /*return*/, dataUrl];
            }
        });
    });
}
