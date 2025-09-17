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
exports.gravatarExistsForEmail = gravatarExistsForEmail;
exports.getUserInfo = getUserInfo;
exports.deleteKitCache = deleteKitCache;
exports.deleteDiscordCache = deleteDiscordCache;
exports.getDirectAvatarForUser = getDirectAvatarForUser;
var images_tsx_1 = require("../images.tsx");
var k = require("../kit/kit.server.ts");
var cache_server_ts_1 = require("./cache.server.ts");
var discord = require("./discord.server.ts");
var misc_tsx_1 = require("./misc.tsx");
function abortTimeoutSignal(timeMs) {
    var abortController = new AbortController();
    void new Promise(function (resolve) { return setTimeout(resolve, timeMs); }).then(function () {
        abortController.abort();
    });
    return abortController.signal;
}
function gravatarExistsForEmail(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var _this = this;
        var email = _b.email, request = _b.request, timings = _b.timings, forceFresh = _b.forceFresh;
        return __generator(this, function (_c) {
            return [2 /*return*/, (0, cache_server_ts_1.cachified)({
                    key: "gravatar-exists-for:".concat(email),
                    cache: cache_server_ts_1.cache,
                    request: request,
                    timings: timings,
                    forceFresh: forceFresh,
                    ttl: 1000 * 60 * 60 * 24 * 90,
                    staleWhileRevalidate: 1000 * 60 * 60 * 24 * 365,
                    checkValue: function (prevValue) { return typeof prevValue === 'boolean'; },
                    getFreshValue: function (context) { return __awaiter(_this, void 0, void 0, function () {
                        var gravatarUrl, avatarResponse, error_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    gravatarUrl = (0, misc_tsx_1.getAvatar)(email, { fallback: '404' });
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, fetch(gravatarUrl, {
                                            method: 'HEAD',
                                            signal: abortTimeoutSignal(context.background || forceFresh ? 1000 * 10 : 100),
                                        })];
                                case 2:
                                    avatarResponse = _a.sent();
                                    if (avatarResponse.status === 200) {
                                        context.metadata.ttl = 1000 * 60 * 60 * 24 * 365;
                                        return [2 /*return*/, true];
                                    }
                                    else {
                                        context.metadata.ttl = 1000 * 60;
                                        return [2 /*return*/, false];
                                    }
                                    return [3 /*break*/, 4];
                                case 3:
                                    error_1 = _a.sent();
                                    console.error("Error getting gravatar for ".concat(email, ":"), error_1);
                                    context.metadata.ttl = 1000 * 60;
                                    return [2 /*return*/, false];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); },
                })];
        });
    });
}
function getDirectAvatarForUser(_a, _b) {
    return __awaiter(this, arguments, void 0, function (_c, _d) {
        var hasGravatar, imageProfileIds;
        var email = _c.email, team = _c.team;
        var _e = _d.size, size = _e === void 0 ? 128 : _e, request = _d.request, timings = _d.timings, forceFresh = _d.forceFresh;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0: return [4 /*yield*/, gravatarExistsForEmail({
                        email: email,
                        request: request,
                        timings: timings,
                        forceFresh: forceFresh,
                    })];
                case 1:
                    hasGravatar = _f.sent();
                    if (hasGravatar) {
                        return [2 /*return*/, { hasGravatar: hasGravatar, avatar: (0, misc_tsx_1.getAvatar)(email, { size: size, fallback: null }) }];
                    }
                    else {
                        imageProfileIds = {
                            RED: images_tsx_1.images.kodyProfileRed.id,
                            BLUE: images_tsx_1.images.kodyProfileBlue.id,
                            YELLOW: images_tsx_1.images.kodyProfileYellow.id,
                            UNKNOWN: images_tsx_1.images.kodyProfileGray.id,
                        };
                        return [2 /*return*/, {
                                hasGravatar: hasGravatar,
                                avatar: (0, images_tsx_1.getImageBuilder)(imageProfileIds[(0, misc_tsx_1.getOptionalTeam)(team)])({
                                    resize: {
                                        type: 'pad',
                                        width: size,
                                        height: size,
                                    },
                                }),
                            }];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
var getKitCacheKey = function (kitId) { return "kit:".concat(kitId); };
var getDiscordCacheKey = function (discordId) { return "discord:".concat(discordId); };
function getUserInfo(user_1, _a) {
    return __awaiter(this, arguments, void 0, function (user, _b) {
        var discordId, kitId, email, _c, discordUser, kitInfo, _d, avatar, hasGravatar, userInfo;
        var _this = this;
        var request = _b.request, forceFresh = _b.forceFresh, timings = _b.timings;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    discordId = user.discordId, kitId = user.kitId, email = user.email;
                    return [4 /*yield*/, Promise.all([
                            discordId
                                ? (0, cache_server_ts_1.cachified)({
                                    cache: cache_server_ts_1.cache,
                                    request: request,
                                    timings: timings,
                                    forceFresh: forceFresh,
                                    ttl: 1000 * 60 * 60 * 24 * 30,
                                    staleWhileRevalidate: 1000 * 60 * 60 * 24 * 30,
                                    key: getDiscordCacheKey(discordId),
                                    checkValue: function (value) {
                                        return typeof value === 'object' && value !== null && 'id' in value;
                                    },
                                    getFreshValue: function () { return __awaiter(_this, void 0, void 0, function () {
                                        var result;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0: return [4 /*yield*/, discord.getDiscordUser(discordId)];
                                                case 1:
                                                    result = _a.sent();
                                                    return [2 /*return*/, result];
                                            }
                                        });
                                    }); },
                                })
                                : null,
                            kitId
                                ? (0, cache_server_ts_1.cachified)({
                                    cache: cache_server_ts_1.cache,
                                    request: request,
                                    timings: timings,
                                    forceFresh: forceFresh,
                                    ttl: 1000 * 60 * 60 * 24 * 30,
                                    staleWhileRevalidate: 1000 * 60 * 60 * 24 * 30,
                                    key: getKitCacheKey(kitId),
                                    checkValue: function (value) {
                                        return typeof value === 'object' && value !== null && 'tags' in value;
                                    },
                                    getFreshValue: function () { return __awaiter(_this, void 0, void 0, function () {
                                        var subscriber, tags;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0: return [4 /*yield*/, k.getKitSubscriber(email)];
                                                case 1:
                                                    subscriber = _a.sent();
                                                    if (!subscriber) {
                                                        return [2 /*return*/, {
                                                                tags: [],
                                                            }];
                                                    }
                                                    return [4 /*yield*/, k.getKitSubscriberTags(subscriber.id)];
                                                case 2:
                                                    tags = _a.sent();
                                                    return [2 /*return*/, {
                                                            tags: tags.map(function (_a) {
                                                                var name = _a.name, id = _a.id;
                                                                return ({ name: name, id: id });
                                                            }),
                                                        }];
                                            }
                                        });
                                    }); },
                                })
                                : null,
                        ])];
                case 1:
                    _c = _e.sent(), discordUser = _c[0], kitInfo = _c[1];
                    return [4 /*yield*/, getDirectAvatarForUser(user, {
                            size: 128,
                            request: request,
                            timings: timings,
                        })];
                case 2:
                    _d = _e.sent(), avatar = _d.avatar, hasGravatar = _d.hasGravatar;
                    userInfo = {
                        avatar: {
                            src: avatar,
                            alt: user.firstName,
                            hasGravatar: hasGravatar,
                        },
                        discord: discordUser,
                        kit: kitInfo,
                    };
                    return [2 /*return*/, userInfo];
            }
        });
    });
}
function deleteKitCache(kitId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, cache_server_ts_1.cache.delete(getKitCacheKey(String(kitId)))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function deleteDiscordCache(discordId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, cache_server_ts_1.cache.delete(getDiscordCacheKey(discordId))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
