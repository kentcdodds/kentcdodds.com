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
exports.getSitemapXml = getSitemapXml;
var lodash_ts_1 = require("#app/utils/cjs/lodash.ts");
var misc_tsx_1 = require("./misc.tsx");
function getSitemapXml(request, remixContext) {
    return __awaiter(this, void 0, void 0, function () {
        function getEntry(_a) {
            var route = _a.route, lastmod = _a.lastmod, changefreq = _a.changefreq, priority = _a.priority;
            return "\n<url>\n  <loc>".concat(domainUrl).concat(route, "</loc>\n  ").concat(lastmod ? "<lastmod>".concat(lastmod, "</lastmod>") : '', "\n  ").concat(changefreq ? "<changefreq>".concat(changefreq, "</changefreq>") : '', "\n  ").concat(priority ? "<priority>".concat(priority, "</priority>") : '', "\n</url>\n  ").trim();
        }
        var domainUrl, rawSitemapEntries, sitemapEntries, _loop_1, _i, rawSitemapEntries_1, entry;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    domainUrl = (0, misc_tsx_1.getDomainUrl)(request);
                    return [4 /*yield*/, Promise.all(Object.entries(remixContext.routeModules).map(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                            var handle, manifestEntry, parentId, parent, path, parentPath, entry;
                            var id = _b[0], mod = _b[1];
                            return __generator(this, function (_c) {
                                if (!mod)
                                    return [2 /*return*/];
                                if (id === 'root')
                                    return [2 /*return*/];
                                if (id.startsWith('routes/_'))
                                    return [2 /*return*/];
                                if (id.startsWith('__test_routes__'))
                                    return [2 /*return*/];
                                handle = mod.handle;
                                if (handle === null || handle === void 0 ? void 0 : handle.getSitemapEntries) {
                                    return [2 /*return*/, handle.getSitemapEntries(request)];
                                }
                                // exclude resource routes from the sitemap
                                // (these are an opt-in via the getSitemapEntries method)
                                if (!('default' in mod))
                                    return [2 /*return*/];
                                manifestEntry = remixContext.manifest.routes[id];
                                if (!manifestEntry) {
                                    console.warn("Could not find a manifest entry for ".concat(id));
                                    return [2 /*return*/];
                                }
                                parentId = manifestEntry.parentId;
                                parent = parentId ? remixContext.manifest.routes[parentId] : null;
                                if (manifestEntry.path) {
                                    path = (0, misc_tsx_1.removeTrailingSlash)(manifestEntry.path);
                                }
                                else if (manifestEntry.index) {
                                    path = '';
                                }
                                else {
                                    return [2 /*return*/];
                                }
                                while (parent) {
                                    parentPath = parent.path ? (0, misc_tsx_1.removeTrailingSlash)(parent.path) : '';
                                    path = "".concat(parentPath, "/").concat(path);
                                    parentId = parent.parentId;
                                    parent = parentId ? remixContext.manifest.routes[parentId] : null;
                                }
                                // we can't handle dynamic routes, so if the handle doesn't have a
                                // getSitemapEntries function, we just
                                if (path.includes(':'))
                                    return [2 /*return*/];
                                if (id === 'root')
                                    return [2 /*return*/];
                                entry = { route: (0, misc_tsx_1.removeTrailingSlash)(path) };
                                return [2 /*return*/, entry];
                            });
                        }); }))];
                case 1:
                    rawSitemapEntries = (_a.sent())
                        .flatMap(function (z) { return z; })
                        .filter(misc_tsx_1.typedBoolean);
                    sitemapEntries = [];
                    _loop_1 = function (entry) {
                        var existingEntryForRoute = sitemapEntries.find(function (e) { return e.route === entry.route; });
                        if (existingEntryForRoute) {
                            if (!(0, lodash_ts_1.isEqual)(existingEntryForRoute, entry)) {
                                console.warn("Duplicate route for ".concat(entry.route, " with different sitemap data"), { entry: entry, existingEntryForRoute: existingEntryForRoute });
                            }
                        }
                        else {
                            sitemapEntries.push(entry);
                        }
                    };
                    for (_i = 0, rawSitemapEntries_1 = rawSitemapEntries; _i < rawSitemapEntries_1.length; _i++) {
                        entry = rawSitemapEntries_1[_i];
                        _loop_1(entry);
                    }
                    return [2 /*return*/, "\n<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset\n  xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"\n  xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"\n  xsi:schemaLocation=\"http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd\"\n>\n  ".concat(sitemapEntries.map(function (entry) { return getEntry(entry); }).join(''), "\n</urlset>\n  ").trim()];
            }
        });
    });
}
