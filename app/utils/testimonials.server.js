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
exports.getTestimonials = getTestimonials;
var slugify_1 = require("@sindresorhus/slugify");
var YAML = require("yaml");
var lodash_ts_1 = require("#app/utils/cjs/lodash.ts");
var cache_server_ts_1 = require("./cache.server.ts");
var github_server_ts_1 = require("./github.server.ts");
var markdown_server_ts_1 = require("./markdown.server.ts");
var misc_tsx_1 = require("./misc.tsx");
var allCategories = [
    'teaching',
    'react',
    'testing',
    'courses',
    'workshop',
    'community',
    'podcast',
    'youtube',
    'talk',
    'blog',
    'remix',
];
var allSubjects = [
    'EpicWeb.dev',
    'EpicReact.dev',
    'TestingJavaScript.com',
    'Discord Community',
    'Workshop',
    'Call Kent Podcast',
    'Chats with Kent Podcast',
    'YouTube Live Streams',
    'KCD Office Hours',
    'Talk',
    'Blog',
    'Frontend Masters',
    'Egghead.io',
    'workshop: react-fundamentals',
    'workshop: react-hooks',
    'workshop: advanced-react-hooks',
    'workshop: advanced-react-patterns',
    'workshop: react-performance',
    'workshop: react-suspense',
    'workshop: testing-react-apps',
    'workshop: build-an-epic-react-app',
    'workshop: testing-fundamentals',
    'workshop: testing-node-apps',
    'workshop: web-app-fundamentals-part-1',
    'workshop: web-app-fundamentals-part-2',
    'Other',
];
var categoriesBySubject = {
    'EpicWeb.dev': ['teaching', 'courses', 'testing', 'workshop'],
    'Discord Community': ['community'],
    'EpicReact.dev': ['teaching', 'courses', 'react'],
    'TestingJavaScript.com': ['teaching', 'courses', 'testing'],
    Workshop: ['workshop'],
    'Call Kent Podcast': ['podcast'],
    'Chats with Kent Podcast': ['podcast'],
    'YouTube Live Streams': ['youtube'],
    'KCD Office Hours': ['youtube'],
    Talk: ['talk'],
    Blog: ['blog'],
    'Frontend Masters': ['courses'],
    'Egghead.io': ['courses'],
    'workshop: react-fundamentals': ['workshop', 'react'],
    'workshop: react-hooks': ['workshop', 'react'],
    'workshop: advanced-react-hooks': ['workshop', 'react'],
    'workshop: advanced-react-patterns': ['workshop', 'react'],
    'workshop: react-performance': ['workshop', 'react'],
    'workshop: react-suspense': ['workshop', 'react'],
    'workshop: testing-react-apps': ['workshop', 'react', 'testing'],
    'workshop: build-an-epic-react-app': ['workshop', 'react', 'testing'],
    'workshop: testing-fundamentals': ['workshop', 'react', 'testing'],
    'workshop: testing-node-apps': ['workshop', 'react', 'testing'],
    'workshop: web-app-fundamentals-part-1': ['workshop', 'remix'],
    'workshop: web-app-fundamentals-part-2': ['workshop', 'remix'],
    Other: [],
};
function getValueWithFallback(obj, key, _a) {
    var fallback = _a.fallback, _b = _a.warnOnFallback, warnOnFallback = _b === void 0 ? true : _b, validateType = _a.validateType;
    var value = obj[key];
    if (validateType(value)) {
        return value;
    }
    else if (typeof fallback !== 'undefined') {
        if (warnOnFallback)
            console.warn("Had to use fallback", { obj: obj, key: key, value: value });
        return fallback;
    }
    else {
        throw new Error("".concat(key, " is not set properly and no fallback is provided. It's ").concat(typeof value));
    }
}
var isString = function (v) { return typeof v === 'string'; };
var isOneOf = function (validValues) {
    return function (v) {
        return validValues.includes(v);
    };
};
var areOneOf = function (validValues) {
    return function (v) {
        return Array.isArray(v) && v.every(isOneOf(validValues));
    };
};
function mapTestimonial(rawTestimonial) {
    return __awaiter(this, void 0, void 0, function () {
        var link, subjects, categories, rawTestimonialContent, author, testimonial, error_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    link = getValueWithFallback(rawTestimonial, 'link', {
                        warnOnFallback: false,
                        fallback: null,
                        validateType: isString,
                    });
                    subjects = getValueWithFallback(rawTestimonial, 'subjects', { fallback: ['Other'], validateType: areOneOf(allSubjects) });
                    categories = getValueWithFallback(rawTestimonial, 'categories', {
                        warnOnFallback: false,
                        fallback: Array.from(new Set(subjects.flatMap(function (s) { return categoriesBySubject[s]; }))),
                        validateType: areOneOf(allCategories),
                    });
                    rawTestimonialContent = getValueWithFallback(rawTestimonial, 'testimonial', { validateType: isString });
                    author = getValueWithFallback(rawTestimonial, 'author', {
                        validateType: isString,
                    });
                    _a = {
                        id: (0, slugify_1.default)(author),
                        author: author,
                        subjects: subjects,
                        categories: categories,
                        link: link,
                        priority: getValueWithFallback(rawTestimonial, 'priority', {
                            fallback: 0,
                            validateType: isOneOf([0, 1, 2, 3, 4, 5]),
                        }),
                        cloudinaryId: getValueWithFallback(rawTestimonial, 'cloudinaryId', {
                            validateType: isString,
                        }),
                        company: getValueWithFallback(rawTestimonial, 'company', {
                            validateType: isString,
                        })
                    };
                    return [4 /*yield*/, (0, markdown_server_ts_1.markdownToHtml)(rawTestimonialContent)];
                case 1:
                    testimonial = (_a.testimonial = _b.sent(),
                        _a);
                    return [2 /*return*/, testimonial];
                case 2:
                    error_1 = _b.sent();
                    console.error((0, misc_tsx_1.getErrorMessage)(error_1), rawTestimonial);
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function getAllTestimonials(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var key, allTestimonials;
        var _this = this;
        var request = _b.request, forceFresh = _b.forceFresh, timings = _b.timings;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    key = 'content:data:testimonials.yml';
                    return [4 /*yield*/, (0, cache_server_ts_1.cachified)({
                            cache: cache_server_ts_1.cache,
                            request: request,
                            timings: timings,
                            key: key,
                            forceFresh: forceFresh,
                            ttl: 1000 * 60 * 60 * 24,
                            staleWhileRevalidate: 1000 * 60 * 60 * 24 * 30,
                            getFreshValue: function () { return __awaiter(_this, void 0, void 0, function () {
                                var talksString, rawTestimonials;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, (0, github_server_ts_1.downloadFile)('content/data/testimonials.yml')];
                                        case 1:
                                            talksString = _a.sent();
                                            rawTestimonials = YAML.parse(talksString);
                                            if (!Array.isArray(rawTestimonials)) {
                                                console.error('Testimonials is not an array', rawTestimonials);
                                                throw new Error('Testimonials is not an array.');
                                            }
                                            return [4 /*yield*/, Promise.all(rawTestimonials.map(mapTestimonial))];
                                        case 2: return [2 /*return*/, (_a.sent()).filter(misc_tsx_1.typedBoolean)];
                                    }
                                });
                            }); },
                            checkValue: function (value) { return Array.isArray(value); },
                        })];
                case 1:
                    allTestimonials = _c.sent();
                    return [2 /*return*/, allTestimonials];
            }
        });
    });
}
function sortByWithPriorityWeight(a, b) {
    return a.priority * Math.random() > b.priority * Math.random() ? 1 : -1;
}
function mapOutMetadata(testimonialWithMetadata) {
    return (0, lodash_ts_1.pick)(testimonialWithMetadata, [
        'id',
        'author',
        'cloudinaryId',
        'company',
        'testimonial',
        'link',
    ]);
}
function getTestimonials(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var allTestimonials, subjectTestimonials, fillerTestimonials, finalTestimonials;
        var request = _b.request, forceFresh = _b.forceFresh, _c = _b.subjects, subjects = _c === void 0 ? [] : _c, _d = _b.categories, categories = _d === void 0 ? [] : _d, limit = _b.limit, timings = _b.timings;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, getAllTestimonials({
                        request: request,
                        forceFresh: forceFresh,
                        timings: timings,
                    })];
                case 1:
                    allTestimonials = _e.sent();
                    if (!(subjects.length + categories.length)) {
                        // they must just want all the testimonials
                        return [2 /*return*/, allTestimonials.sort(sortByWithPriorityWeight).map(mapOutMetadata)];
                    }
                    subjectTestimonials = allTestimonials
                        .filter(function (testimonial) {
                        return testimonial.subjects.some(function (s) { return subjects.includes(s); });
                    })
                        .sort(sortByWithPriorityWeight);
                    fillerTestimonials = allTestimonials
                        .filter(function (t) {
                        return !subjectTestimonials.includes(t) &&
                            t.categories.some(function (c) { return categories.includes(c); });
                    })
                        .sort(function (a, b) {
                        // IDEA: one day, make this smarter...
                        return a.priority * Math.random() > b.priority * Math.random() ? 1 : -1;
                    });
                    finalTestimonials = __spreadArray(__spreadArray([], subjectTestimonials, true), fillerTestimonials, true);
                    if (limit) {
                        return [2 /*return*/, finalTestimonials.slice(0, limit).map(mapOutMetadata)];
                    }
                    return [2 /*return*/, finalTestimonials.map(mapOutMetadata)];
            }
        });
    });
}
