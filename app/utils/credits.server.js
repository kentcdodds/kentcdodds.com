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
exports.getPeople = getPeople;
var cachified_1 = require("@epic-web/cachified");
var YAML = require("yaml");
var cache_server_ts_1 = require("./cache.server.ts");
var github_server_ts_1 = require("./github.server.ts");
var misc_tsx_1 = require("./misc.tsx");
function getValueWithFallback(obj, key, _a) {
    var fallback = _a.fallback, _b = _a.warnOnFallback, warnOnFallback = _b === void 0 ? true : _b, validateType = _a.validateType;
    var value = obj[key];
    if (validateType(value)) {
        return value;
    }
    else if (typeof fallback === 'undefined') {
        throw new Error("".concat(key, " is not set properly and no fallback is provided. It's ").concat(typeof value));
    }
    else {
        if (warnOnFallback)
            console.warn("Had to use fallback", { obj: obj, key: key, value: value });
        return fallback;
    }
}
var isString = function (v) { return typeof v === 'string'; };
function mapPerson(rawPerson) {
    try {
        return {
            name: getValueWithFallback(rawPerson, 'name', {
                fallback: 'Unnamed',
                validateType: isString,
            }),
            cloudinaryId: getValueWithFallback(rawPerson, 'cloudinaryId', {
                fallback: 'kentcdodds.com/illustrations/kody_profile_white',
                validateType: isString,
            }),
            role: getValueWithFallback(rawPerson, 'role', {
                fallback: 'Unknown',
                validateType: isString,
            }),
            description: getValueWithFallback(rawPerson, 'description', {
                fallback: 'Being awesome',
                validateType: isString,
            }),
            github: getValueWithFallback(rawPerson, 'github', {
                fallback: null,
                warnOnFallback: false,
                validateType: isString,
            }),
            x: getValueWithFallback(rawPerson, 'x', {
                fallback: null,
                warnOnFallback: false,
                validateType: isString,
            }),
            website: getValueWithFallback(rawPerson, 'website', {
                fallback: null,
                warnOnFallback: false,
                validateType: isString,
            }),
            dribbble: getValueWithFallback(rawPerson, 'dribbble', {
                fallback: null,
                warnOnFallback: false,
                validateType: isString,
            }),
            linkedin: getValueWithFallback(rawPerson, 'linkedin', {
                fallback: null,
                warnOnFallback: false,
                validateType: isString,
            }),
            instagram: getValueWithFallback(rawPerson, 'instagram', {
                fallback: null,
                warnOnFallback: false,
                validateType: isString,
            }),
            codepen: getValueWithFallback(rawPerson, 'codepen', {
                fallback: null,
                warnOnFallback: false,
                validateType: isString,
            }),
            twitch: getValueWithFallback(rawPerson, 'twitch', {
                fallback: null,
                warnOnFallback: false,
                validateType: isString,
            }),
            behance: getValueWithFallback(rawPerson, 'behance', {
                fallback: null,
                warnOnFallback: false,
                validateType: isString,
            }),
        };
    }
    catch (error) {
        console.error((0, misc_tsx_1.getErrorMessage)(error), rawPerson);
        return null;
    }
}
function getPeople(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var key, allPeople, _c;
        var _d;
        var _this = this;
        var request = _b.request, forceFresh = _b.forceFresh;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    key = 'content:data:credits.yml';
                    _c = cachified_1.cachified;
                    _d = {
                        key: key,
                        cache: cache_server_ts_1.cache
                    };
                    return [4 /*yield*/, (0, cache_server_ts_1.shouldForceFresh)({ forceFresh: forceFresh, request: request, key: key })];
                case 1: return [4 /*yield*/, _c.apply(void 0, [(_d.forceFresh = _e.sent(),
                            _d.ttl = 1000 * 60 * 60 * 24 * 30,
                            _d.staleWhileRevalidate = 1000 * 60 * 60 * 24,
                            _d.getFreshValue = function () { return __awaiter(_this, void 0, void 0, function () {
                                var creditsString, rawCredits;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, (0, github_server_ts_1.downloadFile)('content/data/credits.yml')];
                                        case 1:
                                            creditsString = _a.sent();
                                            rawCredits = YAML.parse(creditsString);
                                            if (!Array.isArray(rawCredits)) {
                                                console.error('Credits is not an array', rawCredits);
                                                throw new Error('Credits is not an array.');
                                            }
                                            return [2 /*return*/, rawCredits.map(mapPerson).filter(misc_tsx_1.typedBoolean)];
                                    }
                                });
                            }); },
                            _d.checkValue = function (value) { return Array.isArray(value); },
                            _d), (0, cachified_1.verboseReporter)()])];
                case 2:
                    allPeople = _e.sent();
                    return [2 /*return*/, allPeople];
            }
        });
    });
}
