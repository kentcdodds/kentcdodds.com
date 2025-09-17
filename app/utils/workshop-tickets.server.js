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
exports.getScheduledEvents = getScheduledEventsIgnoreErrors;
var cache_server_ts_1 = require("./cache.server.ts");
var titoSecret = process.env.TITO_API_SECRET;
if (!titoSecret && process.env.NODE_ENV === 'production') {
    console.error("TITO_API_SECRET is not set. Can't get tickets from the ti.to API!");
}
function getTitoAccounts() {
    return __awaiter(this, void 0, void 0, function () {
        var response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetch("https://api.tito.io/v3/hello", {
                        headers: { Authorization: "Bearer ".concat(titoSecret) },
                    })];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, response.json()];
            }
        });
    });
}
function getTito(account, endpoint) {
    return __awaiter(this, void 0, void 0, function () {
        var response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetch("https://api.tito.io/v3/".concat(encodeURIComponent(account), "/").concat(encodeURIComponent(endpoint)), { headers: { Authorization: "Bearer ".concat(titoSecret) } })];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, response.json()];
            }
        });
    });
}
function getDiscounts(codes) {
    var _a;
    if (codes === void 0) { codes = []; }
    var dis = {};
    for (var _i = 0, codes_1 = codes; _i < codes_1.length; _i++) {
        var discount = codes_1[_i];
        var isEarly = discount.code === 'early';
        var isCurrent = discount.state === 'current';
        var isAvailable = ((_a = discount.quantity) !== null && _a !== void 0 ? _a : 0) > discount.quantity_used;
        if (isEarly && isCurrent && isAvailable) {
            dis[discount.code] = {
                url: discount.share_url,
                ends: discount.end_at,
            };
        }
    }
    return dis;
}
function getScheduledEvents() {
    return __awaiter(this, void 0, void 0, function () {
        var accounts, events;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!titoSecret)
                        return [2 /*return*/, []];
                    return [4 /*yield*/, getTitoAccounts()];
                case 1:
                    accounts = _a.sent();
                    return [4 /*yield*/, Promise.all(accounts.accounts.map(getScheduledEventsForAccount))];
                case 2:
                    events = _a.sent();
                    return [2 /*return*/, events.flat()];
            }
        });
    });
}
function getScheduledEventsForAccount(account) {
    return __awaiter(this, void 0, void 0, function () {
        var allEvents, liveEvents, events;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getTito(account, 'events')];
                case 1:
                    allEvents = (_a.sent()).events;
                    liveEvents = allEvents.filter(function (event) {
                        var _a;
                        return (((_a = event.metadata) === null || _a === void 0 ? void 0 : _a.workshopSlug) &&
                            event.live);
                    });
                    return [4 /*yield*/, Promise.all(liveEvents.map(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                            var _c, event, discounts, activity, eventInfo, _i, _d, release;
                            var slug = _b.slug, url = _b.url, banner = _b.banner, title = _b.title, description = _b.description, metadata = _b.metadata;
                            return __generator(this, function (_e) {
                                switch (_e.label) {
                                    case 0: return [4 /*yield*/, Promise.all([
                                            getTito(account, "".concat(slug)).then(function (r) { return r.event; }),
                                            getTito(account, "".concat(slug, "/discount_codes")).then(function (r) { return getDiscounts(r.discount_codes); }),
                                            getTito(account, "".concat(slug, "/activities")).then(function (r) { var _a; return (_a = r.activities) === null || _a === void 0 ? void 0 : _a[0]; }),
                                        ])];
                                    case 1:
                                        _c = _e.sent(), event = _c[0], discounts = _c[1], activity = _c[2];
                                        eventInfo = {
                                            type: 'tito',
                                            quantity: 0,
                                            sold: 0,
                                            remaining: 0,
                                            location: event.location,
                                            slug: slug,
                                            discounts: discounts,
                                            title: title,
                                            description: description,
                                            banner: banner,
                                            url: url,
                                            // we filter out events without workshopSlugs above
                                            metadata: metadata,
                                            date: event.date_or_range,
                                            startTime: activity === null || activity === void 0 ? void 0 : activity.start_at,
                                            endTime: activity === null || activity === void 0 ? void 0 : activity.end_at,
                                            expired: event.releases.every(function (release) { return release.expired; }),
                                            salesEndTime: event.releases
                                                .map(function (release) { return release.end_at; })
                                                .filter(Boolean)
                                                .sort()
                                                .pop(),
                                        };
                                        for (_i = 0, _d = event.releases; _i < _d.length; _i++) {
                                            release = _d[_i];
                                            eventInfo.quantity += release.quantity;
                                            eventInfo.sold += release.tickets_count;
                                            eventInfo.remaining += release.quantity - release.tickets_count;
                                        }
                                        return [2 /*return*/, eventInfo];
                                }
                            });
                        }); }))];
                case 2:
                    events = _a.sent();
                    return [2 /*return*/, events];
            }
        });
    });
}
function getCachedScheduledEvents(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var key, scheduledEvents;
        var request = _b.request, forceFresh = _b.forceFresh, timings = _b.timings;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    key = 'tito:scheduled-events';
                    return [4 /*yield*/, (0, cache_server_ts_1.cachified)({
                            key: key,
                            cache: cache_server_ts_1.cache,
                            request: request,
                            timings: timings,
                            getFreshValue: getScheduledEvents,
                            checkValue: function (value) { return Array.isArray(value); },
                            forceFresh: forceFresh,
                            ttl: 1000 * 60 * 24,
                            staleWhileRevalidate: 1000 * 60 * 60 * 24 * 30,
                        })];
                case 1:
                    scheduledEvents = _c.sent();
                    return [2 /*return*/, scheduledEvents];
            }
        });
    });
}
// we don't want the TiTo integration to prevent the page from showing up
function getScheduledEventsIgnoreErrors(_a) {
    var request = _a.request, forceFresh = _a.forceFresh, timings = _a.timings;
    return getCachedScheduledEvents({ request: request, forceFresh: forceFresh, timings: timings }).catch(function (error) {
        console.error('There was a problem retrieving ti.to info', error);
        return [];
    });
}
