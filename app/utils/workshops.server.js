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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkshops = getWorkshops;
var p_props_1 = require("p-props");
var YAML = require("yaml");
var cache_server_ts_1 = require("./cache.server.ts");
var github_server_ts_1 = require("./github.server.ts");
var markdown_server_ts_1 = require("./markdown.server.ts");
var misc_tsx_1 = require("./misc.tsx");
function getWorkshops(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var key;
        var _this = this;
        var request = _b.request, forceFresh = _b.forceFresh, timings = _b.timings;
        return __generator(this, function (_c) {
            key = 'content:workshops';
            return [2 /*return*/, (0, cache_server_ts_1.cachified)({
                    cache: cache_server_ts_1.cache,
                    request: request,
                    timings: timings,
                    forceFresh: forceFresh,
                    key: key,
                    ttl: 1000 * 60 * 60 * 24 * 7,
                    staleWhileRevalidate: 1000 * 60 * 60 * 24 * 30,
                    getFreshValue: function () { return __awaiter(_this, void 0, void 0, function () {
                        var dirList, workshopFileList, workshops;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, (0, github_server_ts_1.downloadDirList)("content/workshops")];
                                case 1:
                                    dirList = _a.sent();
                                    workshopFileList = dirList
                                        .filter(function (listing) { return listing.type === 'file' && listing.name.endsWith('.yml'); })
                                        .map(function (listing) { return listing.name.replace(/\.yml$/, ''); });
                                    return [4 /*yield*/, Promise.all(workshopFileList.map(function (slug) { return getWorkshop(slug); }))];
                                case 2:
                                    workshops = _a.sent();
                                    return [2 /*return*/, workshops.filter(misc_tsx_1.typedBoolean)];
                            }
                        });
                    }); },
                    checkValue: function (value) { return Array.isArray(value); },
                }).catch(function (err) {
                    console.error("Failed to download workshop list", err);
                    return [];
                })];
        });
    });
}
function getWorkshop(slug) {
    return __awaiter(this, void 0, void 0, function () {
        var rawWorkshopString, rawWorkshop, title, kitTag, _a, description, _b, categories, _c, events, topics, _d, meta, _e, problemStatementHTMLs, keyTakeawayHTMLs, topicHTMLs, prerequisiteHTML;
        var _f, _g, _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0: return [4 /*yield*/, (0, github_server_ts_1.downloadFile)("content/workshops/".concat(slug, ".yml")).catch(function () { return null; })];
                case 1:
                    rawWorkshopString = _j.sent();
                    if (!rawWorkshopString)
                        return [2 /*return*/, null];
                    try {
                        rawWorkshop = YAML.parse(rawWorkshopString);
                    }
                    catch (error) {
                        console.error("Error parsing YAML", error, rawWorkshopString);
                        return [2 /*return*/, null];
                    }
                    if (!rawWorkshop.title) {
                        console.error('Workshop has no title', rawWorkshop);
                        return [2 /*return*/, null];
                    }
                    title = rawWorkshop.title, kitTag = rawWorkshop.kitTag, _a = rawWorkshop.description, description = _a === void 0 ? 'This workshop is... indescribeable' : _a, _b = rawWorkshop.categories, categories = _b === void 0 ? [] : _b, _c = rawWorkshop.events, events = _c === void 0 ? [] : _c, topics = rawWorkshop.topics, _d = rawWorkshop.meta, meta = _d === void 0 ? {} : _d;
                    if (!kitTag) {
                        throw new Error('All workshops must have a kitTag');
                    }
                    return [4 /*yield*/, Promise.all([
                            rawWorkshop.problemStatements
                                ? (0, p_props_1.default)({
                                    part1: (0, markdown_server_ts_1.markdownToHtmlUnwrapped)(rawWorkshop.problemStatements.part1),
                                    part2: (0, markdown_server_ts_1.markdownToHtmlUnwrapped)(rawWorkshop.problemStatements.part2),
                                    part3: (0, markdown_server_ts_1.markdownToHtmlUnwrapped)(rawWorkshop.problemStatements.part3),
                                    part4: (0, markdown_server_ts_1.markdownToHtmlUnwrapped)(rawWorkshop.problemStatements.part4),
                                })
                                : { part1: '', part2: '', part3: '', part4: '' },
                            Promise.all((_g = (_f = rawWorkshop.keyTakeaways) === null || _f === void 0 ? void 0 : _f.map(function (keyTakeaway) {
                                return (0, p_props_1.default)({
                                    title: (0, markdown_server_ts_1.markdownToHtmlUnwrapped)(keyTakeaway.title),
                                    description: (0, markdown_server_ts_1.markdownToHtmlUnwrapped)(keyTakeaway.description),
                                });
                            })) !== null && _g !== void 0 ? _g : []),
                            Promise.all((_h = topics === null || topics === void 0 ? void 0 : topics.map(function (r) { return (0, markdown_server_ts_1.markdownToHtmlUnwrapped)(r); })) !== null && _h !== void 0 ? _h : []),
                            rawWorkshop.prerequisite
                                ? (0, markdown_server_ts_1.markdownToHtmlUnwrapped)(rawWorkshop.prerequisite)
                                : '',
                        ])];
                case 2:
                    _e = _j.sent(), problemStatementHTMLs = _e[0], keyTakeawayHTMLs = _e[1], topicHTMLs = _e[2], prerequisiteHTML = _e[3];
                    return [2 /*return*/, {
                            slug: slug,
                            title: title,
                            events: events.map(function (e) { return (__assign({ type: 'manual' }, e)); }),
                            meta: meta,
                            description: description,
                            kitTag: kitTag,
                            categories: categories,
                            problemStatementHTMLs: problemStatementHTMLs,
                            keyTakeawayHTMLs: keyTakeawayHTMLs,
                            topicHTMLs: topicHTMLs,
                            prerequisiteHTML: prerequisiteHTML,
                        }];
            }
        });
    });
}
