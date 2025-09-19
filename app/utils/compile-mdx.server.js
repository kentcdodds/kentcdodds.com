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
exports.compileMdx = queuedCompileMdx;
var md_temp_1 = require("@kentcdodds/md-temp");
var core_1 = require("@remark-embedder/core");
var transformer_oembed_1 = require("@remark-embedder/transformer-oembed");
var mdx_bundler_1 = require("mdx-bundler");
var p_queue_1 = require("p-queue");
var reading_time_1 = require("reading-time");
var remark_autolink_headings_1 = require("remark-autolink-headings");
var remark_gfm_1 = require("remark-gfm");
var remark_slug_1 = require("remark-slug");
var unist_util_visit_1 = require("unist-util-visit");
var x = require("./x.server.ts");
function handleEmbedderError(_a) {
    var url = _a.url;
    return "<p>Error embedding <a href=\"".concat(url, "\">").concat(url, "</a></p>.");
}
function handleEmbedderHtml(html, info) {
    if (!html)
        return null;
    var url = new URL(info.url);
    // matches youtu.be and youtube.com
    if (/youtu\.?be/.test(url.hostname)) {
        // this allows us to set youtube embeds to 100% width and the
        // height will be relative to that width with a good aspect ratio
        return makeEmbed(html, 'youtube');
    }
    if (url.hostname.includes('codesandbox.io')) {
        return makeEmbed(html, 'codesandbox', '80%');
    }
    return html;
}
function makeEmbed(html, type, heightRatio) {
    if (heightRatio === void 0) { heightRatio = '56.25%'; }
    return "\n  <div class=\"embed\" data-embed-type=\"".concat(type, "\">\n    <div style=\"padding-bottom: ").concat(heightRatio, "\">\n      ").concat(html, "\n    </div>\n  </div>\n");
}
function trimCodeBlocks() {
    return function transformer(tree) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                (0, unist_util_visit_1.visit)(tree, 'element', function (preNode) {
                    if (preNode.tagName !== 'pre' || !preNode.children.length) {
                        return;
                    }
                    var codeNode = preNode.children[0];
                    if (!codeNode ||
                        codeNode.type !== 'element' ||
                        codeNode.tagName !== 'code') {
                        return;
                    }
                    var codeStringNode = codeNode.children[0];
                    if (!codeStringNode)
                        return;
                    if (codeStringNode.type !== 'text') {
                        console.warn("trimCodeBlocks: Unexpected: codeStringNode type is not \"text\": ".concat(codeStringNode.type));
                        return;
                    }
                    codeStringNode.value = codeStringNode.value.trim();
                });
                return [2 /*return*/];
            });
        });
    };
}
// yes, I did write this myself 😬
var cloudinaryUrlRegex = /^https?:\/\/res\.cloudinary\.com\/(?<cloudName>.+?)\/image\/upload\/((?<transforms>(.+?_.+?)+?)\/)?(\/?(?<version>v\d+)\/)?(?<publicId>.+$)/;
function optimizeCloudinaryImages() {
    return function transformer(tree) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                (0, unist_util_visit_1.visit)(tree, 'mdxJsxFlowElement', function visitor(node) {
                    if (node.name !== 'img')
                        return;
                    var srcAttr = node.attributes.find(function (attr) { return attr.type === 'mdxJsxAttribute' && attr.name === 'src'; });
                    var urlString = (srcAttr === null || srcAttr === void 0 ? void 0 : srcAttr.value) ? String(srcAttr.value) : null;
                    if (!srcAttr || !urlString) {
                        console.error('image without url?', node);
                        return;
                    }
                    var newUrl = handleImageUrl(urlString);
                    if (newUrl) {
                        srcAttr.value = newUrl;
                    }
                });
                (0, unist_util_visit_1.visit)(tree, 'element', function visitor(node) {
                    var _a, _b;
                    if (node.tagName !== 'img')
                        return;
                    var urlString = ((_a = node.properties) === null || _a === void 0 ? void 0 : _a.src)
                        ? String(node.properties.src)
                        : null;
                    if (!((_b = node.properties) === null || _b === void 0 ? void 0 : _b.src) || !urlString) {
                        console.error('image without url?', node);
                        return;
                    }
                    var newUrl = handleImageUrl(urlString);
                    if (newUrl) {
                        node.properties.src = newUrl;
                    }
                });
                return [2 /*return*/];
            });
        });
    };
    function handleImageUrl(urlString) {
        var match = urlString.match(cloudinaryUrlRegex);
        var groups = match === null || match === void 0 ? void 0 : match.groups;
        if (groups) {
            var _a = groups, cloudName = _a.cloudName, transforms = _a.transforms, version = _a.version, publicId = _a.publicId;
            // don't add transforms if they're already included
            if (transforms)
                return;
            var defaultTransforms = [
                'f_auto',
                'q_auto',
                // gifs can't do dpr transforms
                publicId.endsWith('.gif') ? '' : 'dpr_2.0',
                'w_1600',
            ]
                .filter(Boolean)
                .join(',');
            return [
                "https://res.cloudinary.com/".concat(cloudName, "/image/upload"),
                defaultTransforms,
                version,
                publicId,
            ]
                .filter(Boolean)
                .join('/');
        }
    }
}
var twitterTransformer = {
    shouldTransform: x.isXUrl,
    getHTML: x.getTweetEmbedHTML,
};
var eggheadTransformer = {
    shouldTransform: function (url) {
        var _a = new URL(url), host = _a.host, pathname = _a.pathname;
        return (host === 'egghead.io' &&
            pathname.includes('/lessons/') &&
            !pathname.includes('/embed'));
    },
    getHTML: function (url) {
        var _a = new URL(url), host = _a.host, pathname = _a.pathname, searchParams = _a.searchParams;
        // Don't preload videos
        if (!searchParams.has('preload')) {
            searchParams.set('preload', 'false');
        }
        // Kent's affiliate link
        if (!searchParams.has('af')) {
            searchParams.set('af', '5236ad');
        }
        var iframeSrc = "https://".concat(host).concat(pathname, "/embed?").concat(searchParams.toString());
        return makeEmbed("<iframe src=\"".concat(iframeSrc, "\" allowfullscreen></iframe>"), 'egghead');
    },
};
function autoAffiliates() {
    return function affiliateTransformer(tree) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                (0, unist_util_visit_1.visit)(tree, 'link', function visitor(linkNode) {
                    if (linkNode.url.includes('amazon.com')) {
                        var amazonUrl = new URL(linkNode.url);
                        if (!amazonUrl.searchParams.has('tag')) {
                            amazonUrl.searchParams.set('tag', 'kentcdodds-20');
                            linkNode.url = amazonUrl.toString();
                        }
                    }
                    if (linkNode.url.includes('egghead.io')) {
                        var eggheadUrl = new URL(linkNode.url);
                        if (!eggheadUrl.searchParams.has('af')) {
                            eggheadUrl.searchParams.set('af', '5236ad');
                            linkNode.url = eggheadUrl.toString();
                        }
                    }
                });
                return [2 /*return*/];
            });
        });
    };
}
function removePreContainerDivs() {
    return function preContainerDivsTransformer(tree) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                (0, unist_util_visit_1.visit)(tree, { type: 'element', tagName: 'pre' }, function visitor(node, index, parent) {
                    if ((parent === null || parent === void 0 ? void 0 : parent.type) !== 'element')
                        return;
                    if (parent.tagName !== 'div')
                        return;
                    if (parent.children.length !== 1 && index === 0)
                        return;
                    Object.assign(parent, node);
                });
                return [2 /*return*/];
            });
        });
    };
}
var remarkPlugins = [
    [
        core_1.default,
        {
            handleError: handleEmbedderError,
            handleHTML: handleEmbedderHtml,
            transformers: [twitterTransformer, eggheadTransformer, transformer_oembed_1.default],
        },
    ],
    autoAffiliates,
];
var rehypePlugins = [
    optimizeCloudinaryImages,
    trimCodeBlocks,
    md_temp_1.rehypeCodeBlocksShiki,
    removePreContainerDivs,
];
function compileMdx(slug, githubFiles) {
    return __awaiter(this, void 0, void 0, function () {
        var indexRegex, indexFile, rootDir, relativeFiles, files, _a, frontmatter, code, readTime, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    indexRegex = new RegExp("".concat(slug, "\\/index.mdx?$"));
                    indexFile = githubFiles.find(function (_a) {
                        var path = _a.path;
                        return indexRegex.test(path);
                    });
                    if (!indexFile)
                        return [2 /*return*/, null];
                    rootDir = indexFile.path.replace(/index.mdx?$/, '');
                    relativeFiles = githubFiles.map(function (_a) {
                        var path = _a.path, content = _a.content;
                        return ({
                            path: path.replace(rootDir, './'),
                            content: content,
                        });
                    });
                    files = arrayToObj(relativeFiles, {
                        keyName: 'path',
                        valueName: 'content',
                    });
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, mdx_bundler_1.bundleMDX)({
                            source: indexFile.content,
                            files: files,
                            mdxOptions: function (options) {
                                var _a, _b;
                                options.remarkPlugins = __spreadArray(__spreadArray(__spreadArray([], ((_a = options.remarkPlugins) !== null && _a !== void 0 ? _a : []), true), [
                                    remark_slug_1.default,
                                    [remark_autolink_headings_1.default, { behavior: 'wrap' }],
                                    remark_gfm_1.default
                                ], false), remarkPlugins, true);
                                options.rehypePlugins = __spreadArray(__spreadArray([], ((_b = options.rehypePlugins) !== null && _b !== void 0 ? _b : []), true), rehypePlugins, true);
                                return options;
                            },
                        })];
                case 2:
                    _a = _b.sent(), frontmatter = _a.frontmatter, code = _a.code;
                    readTime = (0, reading_time_1.default)(indexFile.content);
                    return [2 /*return*/, {
                            code: code,
                            readTime: readTime,
                            frontmatter: frontmatter,
                        }];
                case 3:
                    error_1 = _b.sent();
                    console.error("Compilation error for slug: ", slug);
                    throw error_1;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function arrayToObj(array, _a) {
    var keyName = _a.keyName, valueName = _a.valueName;
    var obj = {};
    for (var _i = 0, array_1 = array; _i < array_1.length; _i++) {
        var item = array_1[_i];
        var key = item[keyName];
        if (typeof key !== 'string') {
            throw new Error("".concat(String(keyName), " of item must be a string"));
        }
        var value = item[valueName];
        obj[key] = value;
    }
    return obj;
}
var _queue = null;
function getQueue() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (_queue)
                return [2 /*return*/, _queue];
            _queue = new p_queue_1.default({
                concurrency: 1,
                throwOnTimeout: true,
                timeout: 1000 * 30,
            });
            return [2 /*return*/, _queue];
        });
    });
}
// We have to use a queue because we can't run more than one of these at a time
// or we'll hit an out of memory error because esbuild uses a lot of memory...
function queuedCompileMdx() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return __awaiter(this, void 0, void 0, function () {
        var queue, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getQueue()];
                case 1:
                    queue = _a.sent();
                    return [4 /*yield*/, queue.add(function () { return compileMdx.apply(void 0, args); })];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
}
