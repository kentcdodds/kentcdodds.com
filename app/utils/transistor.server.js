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
exports.createEpisode = createEpisode;
exports.getEpisodes = getCachedEpisodes;
var slugify_1 = require("@sindresorhus/slugify");
var uuid = require("uuid");
var cache_server_ts_1 = require("./cache.server.ts");
var call_kent_ts_1 = require("./call-kent.ts");
var markdown_server_ts_1 = require("./markdown.server.ts");
var misc_tsx_1 = require("./misc.tsx");
var user_info_server_ts_1 = require("./user-info.server.ts");
var transistorApiSecret = (0, misc_tsx_1.getRequiredServerEnvVar)('TRANSISTOR_API_SECRET');
var podcastId = (0, misc_tsx_1.getRequiredServerEnvVar)('CALL_KENT_PODCAST_ID', '67890');
function fetchTransitor(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var url, _i, _c, _d, key, value, config, res, json;
        var endpoint = _b.endpoint, _e = _b.method, method = _e === void 0 ? 'GET' : _e, _f = _b.query, query = _f === void 0 ? {} : _f, data = _b.data;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    url = new URL(endpoint, 'https://api.transistor.fm');
                    for (_i = 0, _c = Object.entries(query); _i < _c.length; _i++) {
                        _d = _c[_i], key = _d[0], value = _d[1];
                        url.searchParams.set(key, value);
                    }
                    config = {
                        method: method,
                        headers: {
                            'x-api-key': transistorApiSecret,
                        },
                    };
                    if (data) {
                        config.body = JSON.stringify(data);
                        config.headers = __assign(__assign({}, config.headers), { 'Content-Type': 'application/json' });
                    }
                    return [4 /*yield*/, fetch(url.toString(), config)];
                case 1:
                    res = _g.sent();
                    return [4 /*yield*/, res.json()];
                case 2:
                    json = (_g.sent());
                    if (json.errors) {
                        throw new Error(json.errors.map(function (e) { return e.title; }).join('\n'));
                    }
                    return [2 /*return*/, json];
            }
        });
    });
}
function createEpisode(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var id, authorized, _c, upload_url, audio_url, content_type, episodesPerSeason, currentSeason, createData, created, returnValue, number, season, episodeNumber, slug, episodePath, domainUrl, shortEpisodePath, shortDomain, encodedTitle, encodedUrl, encodedName, _d, hasGravatar, avatar, base64Avatar, radius, encodedAvatar, textLines, avatarYPosition, nameYPosition, imageUrl, updateData;
        var audio = _b.audio, title = _b.title, summary = _b.summary, description = _b.description, keywords = _b.keywords, user = _b.user, request = _b.request;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    id = uuid.v4();
                    return [4 /*yield*/, fetchTransitor({
                            endpoint: 'v1/episodes/authorize_upload',
                            query: { filename: "".concat(id, ".mp3") },
                        })];
                case 1:
                    authorized = _e.sent();
                    _c = authorized.data.attributes, upload_url = _c.upload_url, audio_url = _c.audio_url, content_type = _c.content_type;
                    episodesPerSeason = 50;
                    return [4 /*yield*/, getCurrentSeason()];
                case 2:
                    currentSeason = _e.sent();
                    return [4 /*yield*/, fetch(upload_url, {
                            method: 'PUT',
                            body: audio,
                            headers: { 'Content-Type': content_type },
                        })];
                case 3:
                    _e.sent();
                    createData = {
                        episode: {
                            show_id: podcastId,
                            season: currentSeason,
                            audio_url: audio_url,
                            title: title,
                            summary: summary,
                            description: description,
                            keywords: keywords,
                            increment_number: true,
                        },
                    };
                    return [4 /*yield*/, fetchTransitor({
                            endpoint: 'v1/episodes',
                            method: 'POST',
                            data: createData,
                        })];
                case 4:
                    created = _e.sent();
                    return [4 /*yield*/, fetchTransitor({
                            endpoint: "/v1/episodes/".concat(encodeURIComponent(created.data.id), "/publish"),
                            method: 'PATCH',
                            data: {
                                episode: {
                                    status: 'published',
                                },
                            },
                        })];
                case 5:
                    _e.sent();
                    returnValue = {};
                    number = created.data.attributes.number;
                    season = currentSeason;
                    episodeNumber = 1;
                    if (!(typeof number === 'number' && typeof season === 'number')) return [3 /*break*/, 8];
                    //reset episode to 1 if it exceeds episodesPerSeason (50)
                    if (number > episodesPerSeason) {
                        season += 1;
                        episodeNumber = 1;
                    }
                    else {
                        episodeNumber = number;
                    }
                    slug = (0, slugify_1.default)(created.data.attributes.title);
                    episodePath = (0, call_kent_ts_1.getEpisodePath)({
                        episodeNumber: episodeNumber,
                        seasonNumber: season,
                        slug: slug,
                    });
                    domainUrl = 'https://kentcdodds.com';
                    shortEpisodePath = (0, call_kent_ts_1.getEpisodePath)({
                        episodeNumber: number,
                        seasonNumber: season,
                    });
                    shortDomain = domainUrl.replace(/^https?:\/\//, '');
                    encodedTitle = encodeURIComponent(encodeURIComponent(title));
                    encodedUrl = encodeURIComponent(encodeURIComponent("".concat(shortDomain).concat(shortEpisodePath)));
                    encodedName = encodeURIComponent(encodeURIComponent("- ".concat(user.firstName)));
                    return [4 /*yield*/, (0, user_info_server_ts_1.getDirectAvatarForUser)(user, {
                            size: 1400,
                            request: request,
                            forceFresh: true,
                        })];
                case 6:
                    _d = _e.sent(), hasGravatar = _d.hasGravatar, avatar = _d.avatar;
                    base64Avatar = (0, misc_tsx_1.toBase64)(avatar);
                    radius = hasGravatar ? ',r_max' : '';
                    encodedAvatar = encodeURIComponent(base64Avatar);
                    textLines = Number(Math.ceil(Math.min(title.length, 50) / 18).toFixed());
                    avatarYPosition = textLines + 0.6;
                    nameYPosition = -textLines + 5.2;
                    imageUrl = "https://res.cloudinary.com/kentcdodds-com/image/upload/$th_3000,$tw_3000,$gw_$tw_div_12,$gh_$th_div_12/w_$tw,h_$th,l_kentcdodds.com:social-background/co_white,c_fit,g_north_west,w_$gw_mul_6,h_$gh_mul_2.6,x_$gw_mul_0.8,y_$gh_mul_0.8,l_text:kentcdodds.com:Matter-Medium.woff2_180:".concat(encodedTitle, "/c_crop").concat(radius, ",g_north_west,h_$gh_mul_5.5,w_$gh_mul_5.5,x_$gw_mul_0.8,y_$gh_mul_").concat(avatarYPosition, ",l_fetch:").concat(encodedAvatar, "/co_rgb:a9adc1,c_fit,g_south_west,w_$gw_mul_8,h_$gh_mul_4,x_$gw_mul_0.8,y_$gh_mul_0.8,l_text:kentcdodds.com:Matter-Regular.woff2_120:").concat(encodedUrl, "/co_rgb:a9adc1,c_fit,g_south_west,w_$gw_mul_8,h_$gh_mul_4,x_$gw_mul_0.8,y_$gh_mul_").concat(nameYPosition, ",l_text:kentcdodds.com:Matter-Regular.woff2_140:").concat(encodedName, "/c_fit,g_east,w_$gw_mul_11,h_$gh_mul_11,x_$gw,l_kentcdodds.com:illustrations:mic/c_fill,w_$tw,h_$th/kentcdodds.com/social-background.png");
                    returnValue.episodeUrl = "".concat(domainUrl).concat(episodePath);
                    returnValue.imageUrl = imageUrl;
                    updateData = {
                        id: created.data.id,
                        episode: {
                            alternate_url: returnValue.episodeUrl,
                            image_url: imageUrl,
                            description: "".concat(description, "\n\n<a href=\"").concat(returnValue.episodeUrl, "\">").concat(title, "</a>"),
                            number: episodeNumber,
                            season: season,
                        },
                    };
                    return [4 /*yield*/, fetchTransitor({
                            endpoint: "/v1/episodes/".concat(encodeURIComponent(created.data.id)),
                            method: 'PATCH',
                            data: updateData,
                        })];
                case 7:
                    _e.sent();
                    _e.label = 8;
                case 8: 
                // update the cache with the new episode
                return [4 /*yield*/, getCachedEpisodes({ forceFresh: true })];
                case 9:
                    // update the cache with the new episode
                    _e.sent();
                    return [2 /*return*/, returnValue];
            }
        });
    });
}
function getEpisodes() {
    return __awaiter(this, void 0, void 0, function () {
        var transistorEpisodes, sortedTransistorEpisodes, episodes, _i, sortedTransistorEpisodes_1, episode, _a, _b;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, fetchTransitor({
                        endpoint: "/v1/episodes",
                        query: { 'pagination[per]': '5000' },
                    })
                    // sort by episode number
                ];
                case 1:
                    transistorEpisodes = _d.sent();
                    sortedTransistorEpisodes = transistorEpisodes.data.sort(function (a, b) {
                        var _a, _b;
                        var aNumber = (_a = a.attributes.number) !== null && _a !== void 0 ? _a : 0;
                        var bNumber = (_b = b.attributes.number) !== null && _b !== void 0 ? _b : 0;
                        if (aNumber < bNumber) {
                            return -1;
                        }
                        else if (aNumber > bNumber) {
                            return 1;
                        }
                        return 0;
                    });
                    episodes = [];
                    _i = 0, sortedTransistorEpisodes_1 = sortedTransistorEpisodes;
                    _d.label = 2;
                case 2:
                    if (!(_i < sortedTransistorEpisodes_1.length)) return [3 /*break*/, 5];
                    episode = sortedTransistorEpisodes_1[_i];
                    if (episode.attributes.audio_processing)
                        return [3 /*break*/, 4];
                    if (episode.attributes.status !== 'published')
                        return [3 /*break*/, 4];
                    if (!episode.attributes.number)
                        return [3 /*break*/, 4];
                    if (!episode.attributes.duration)
                        return [3 /*break*/, 4];
                    _b = (_a = episodes).push;
                    _c = {
                        seasonNumber: episode.attributes.season,
                        episodeNumber: episode.attributes.number,
                        slug: (0, slugify_1.default)(episode.attributes.title),
                        title: episode.attributes.title,
                        summary: episode.attributes.summary,
                        descriptionHTML: episode.attributes.description
                    };
                    return [4 /*yield*/, (0, markdown_server_ts_1.stripHtml)(episode.attributes.description)];
                case 3:
                    _b.apply(_a, [(_c.description = _d.sent(),
                            _c.keywords = episode.attributes.keywords,
                            _c.duration = episode.attributes.duration,
                            _c.shareUrl = episode.attributes.share_url,
                            _c.mediaUrl = episode.attributes.media_url,
                            _c.embedHtml = episode.attributes.embed_html,
                            _c.embedHtmlDark = episode.attributes.embed_html_dark,
                            _c.imageUrl = episode.attributes.image_url,
                            _c.publishedAt = episode.attributes.published_at,
                            _c.updatedAt = episode.attributes.updated_at,
                            _c)]);
                    _d.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/, episodes];
            }
        });
    });
}
function getCurrentSeason() {
    return __awaiter(this, void 0, void 0, function () {
        var episodesResponse, lastEpisode;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchTransitor({
                        endpoint: "/v1/episodes",
                        query: {
                            'pagination[per]': '1',
                            order: 'desc',
                        },
                    })];
                case 1:
                    episodesResponse = _a.sent();
                    lastEpisode = episodesResponse.data[0];
                    return [2 /*return*/, lastEpisode === null || lastEpisode === void 0 ? void 0 : lastEpisode.attributes.season];
            }
        });
    });
}
var episodesCacheKey = "transistor:episodes:".concat(podcastId);
function getCachedEpisodes(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var request = _b.request, forceFresh = _b.forceFresh, timings = _b.timings;
        return __generator(this, function (_c) {
            return [2 /*return*/, (0, cache_server_ts_1.cachified)({
                    cache: cache_server_ts_1.cache,
                    request: request,
                    timings: timings,
                    key: episodesCacheKey,
                    getFreshValue: getEpisodes,
                    ttl: 1000 * 60 * 60 * 24,
                    staleWhileRevalidate: 1000 * 60 * 60 * 24 * 30,
                    forceFresh: forceFresh,
                    checkValue: function (value) {
                        return Array.isArray(value) &&
                            value.every(function (v) { return typeof v.slug === 'string' && typeof v.title === 'string'; });
                    },
                })];
        });
    });
}
