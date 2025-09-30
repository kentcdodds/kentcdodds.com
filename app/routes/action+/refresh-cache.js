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
exports.loader = exports.commitShaKey = void 0;
exports.isRefreshShaInfo = isRefreshShaInfo;
exports.action = action;
var path_1 = require("path");
var node_1 = require("@remix-run/node");
var cache_server_ts_1 = require("#app/utils/cache.server.ts");
var credits_server_ts_1 = require("#app/utils/credits.server.ts");
var litefs_js_server_ts_1 = require("#app/utils/litefs-js.server.ts");
var mdx_server_ts_1 = require("#app/utils/mdx.server.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var talks_server_ts_1 = require("#app/utils/talks.server.ts");
var testimonials_server_ts_1 = require("#app/utils/testimonials.server.ts");
var workshops_server_ts_1 = require("#app/utils/workshops.server.ts");
function isRefreshShaInfo(value) {
    return (typeof value === 'object' &&
        value !== null &&
        'sha' in value &&
        typeof value.sha === 'string' &&
        'date' in value &&
        typeof value.date === 'string');
}
exports.commitShaKey = 'meta:last-refresh-commit-sha';
function action(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        function setShaInCache() {
            var sha = body.commitSha;
            if (sha) {
                var value = { sha: sha, date: new Date().toISOString() };
                cache_server_ts_1.cache.set(exports.commitShaKey, {
                    value: value,
                    metadata: {
                        createdTime: new Date().getTime(),
                        swr: Number.MAX_SAFE_INTEGER,
                        ttl: Number.MAX_SAFE_INTEGER,
                    },
                });
            }
        }
        var body, _i, _c, key, refreshingContentPaths, promises, _d, _e, contentPath, _f, contentDir, dirOrFilename, slug;
        var request = _b.request;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0: return [4 /*yield*/, (0, litefs_js_server_ts_1.ensurePrimary)()];
                case 1:
                    _g.sent();
                    if (request.headers.get('auth') !==
                        (0, misc_tsx_1.getRequiredServerEnvVar)('REFRESH_CACHE_SECRET')) {
                        return [2 /*return*/, (0, node_1.redirect)('https://www.youtube.com/watch?v=dQw4w9WgXcQ')];
                    }
                    return [4 /*yield*/, request.json()];
                case 2:
                    body = (_g.sent());
                    if ('keys' in body && Array.isArray(body.keys)) {
                        for (_i = 0, _c = body.keys; _i < _c.length; _i++) {
                            key = _c[_i];
                            void cache_server_ts_1.cache.delete(key);
                        }
                        setShaInCache();
                        return [2 /*return*/, (0, node_1.json)({
                                message: 'Deleting cache keys',
                                keys: body.keys,
                                commitSha: body.commitSha,
                            })];
                    }
                    if (!('contentPaths' in body && Array.isArray(body.contentPaths))) return [3 /*break*/, 5];
                    refreshingContentPaths = [];
                    promises = [];
                    for (_d = 0, _e = body.contentPaths; _d < _e.length; _d++) {
                        contentPath = _e[_d];
                        if (typeof contentPath !== 'string') {
                            continue;
                        }
                        if (contentPath.startsWith('blog') || contentPath.startsWith('pages')) {
                            _f = contentPath.split('/'), contentDir = _f[0], dirOrFilename = _f[1];
                            if (!contentDir || !dirOrFilename) {
                                continue;
                            }
                            slug = path_1.default.parse(dirOrFilename).name;
                            refreshingContentPaths.push(contentPath);
                            promises.push((0, mdx_server_ts_1.getMdxPage)({ contentDir: contentDir, slug: slug }, { forceFresh: true }));
                        }
                        if (contentPath.startsWith('workshops')) {
                            refreshingContentPaths.push(contentPath);
                            promises.push((0, workshops_server_ts_1.getWorkshops)({ forceFresh: true }));
                        }
                        if (contentPath === 'data/testimonials.yml') {
                            refreshingContentPaths.push(contentPath);
                            promises.push((0, testimonials_server_ts_1.getTestimonials)({ forceFresh: true }));
                        }
                        if (contentPath === 'data/talks.yml') {
                            refreshingContentPaths.push(contentPath);
                            promises.push((0, talks_server_ts_1.getTalksAndTags)({ forceFresh: true }));
                        }
                        if (contentPath === 'data/credits.yml') {
                            refreshingContentPaths.push(contentPath);
                            promises.push((0, credits_server_ts_1.getPeople)({ forceFresh: true }));
                        }
                    }
                    // if any blog contentPaths were changed then let's update the dir list
                    // so it will appear on the blog page.
                    if (refreshingContentPaths.some(function (p) { return p.startsWith('blog'); })) {
                        promises.push((0, mdx_server_ts_1.getBlogMdxListItems)({
                            request: request,
                            forceFresh: 'blog:dir-list,blog:mdx-list-items',
                        }));
                    }
                    if (refreshingContentPaths.some(function (p) { return p.startsWith('pages'); })) {
                        promises.push((0, mdx_server_ts_1.getMdxDirList)('pages', { forceFresh: true }));
                    }
                    if (!promises.length) return [3 /*break*/, 4];
                    return [4 /*yield*/, Promise.all(promises)];
                case 3:
                    _g.sent();
                    _g.label = 4;
                case 4:
                    setShaInCache();
                    return [2 /*return*/, (0, node_1.json)({
                            message: 'Refreshing cache for content paths',
                            contentPaths: refreshingContentPaths,
                            commitSha: body.commitSha,
                        })];
                case 5: return [2 /*return*/, (0, node_1.json)({ message: 'no action taken' }, { status: 400 })];
            }
        });
    });
}
var loader = function () { return (0, node_1.redirect)('/', { status: 404 }); };
exports.loader = loader;
