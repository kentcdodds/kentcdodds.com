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
exports.getTweetEmbedHTML = getTweetEmbedHTML;
exports.isXUrl = isXUrl;
var http_1 = require("http");
var https_1 = require("https");
var cachified_1 = require("@epic-web/cachified");
var metascraper_1 = require("metascraper");
var metascraper_description_1 = require("metascraper-description");
var metascraper_image_1 = require("metascraper-image");
var metascraper_title_1 = require("metascraper-title");
var cache_server_ts_1 = require("./cache.server.ts");
var misc_tsx_1 = require("./misc.tsx");
var get_tweet_ts_1 = require("./twitter/get-tweet.ts");
var metascraper = (0, metascraper_1.default)([(0, metascraper_title_1.default)(), (0, metascraper_description_1.default)(), (0, metascraper_image_1.default)()]);
function getMetadata(url) {
    return __awaiter(this, void 0, void 0, function () {
        var html;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetch(url).then(function (res) { return res.text(); })];
                case 1:
                    html = _a.sent();
                    return [2 /*return*/, metascraper({ html: html, url: url })];
            }
        });
    });
}
function unshorten(urlString, maxFollows) {
    if (maxFollows === void 0) { maxFollows = 10; }
    return new Promise(function (resolve, reject) {
        try {
            var url_1 = new URL(urlString);
            if (url_1.protocol) {
                var request = (url_1.protocol === 'https:' ? https_1.default : http_1.default).request;
                request(urlString, { method: 'HEAD' }, function (response) {
                    var location = response.headers.location;
                    if (location && location !== urlString && maxFollows > 0) {
                        var fullLocation = location.startsWith('/')
                            ? new URL(location, url_1).toString()
                            : location;
                        void unshorten(fullLocation, maxFollows - 1).then(resolve);
                    }
                    else {
                        resolve(urlString);
                    }
                }).end();
            }
            else {
                reject("Invalid URL: ".concat(urlString));
            }
        }
        catch (error) {
            reject(error);
        }
    });
}
function getTweetCached(tweetId) {
    return __awaiter(this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, cachified_1.cachified)({
                        key: "tweet:".concat(tweetId),
                        cache: cache_server_ts_1.lruCache,
                        ttl: 1000 * 60,
                        swr: 1000 * 60 * 60 * 24 * 30 * 6,
                        getFreshValue: function (_a) {
                            return __awaiter(this, arguments, void 0, function (_b) {
                                var tweet;
                                var background = _b.background;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0: return [4 /*yield*/, (0, get_tweet_ts_1.getTweet)(tweetId)];
                                        case 1:
                                            tweet = _c.sent();
                                            if (tweet)
                                                return [2 /*return*/, tweet];
                                            if (background) {
                                                // throw an error so this fallsback to the cache
                                                throw new Error("Tweet not found: ".concat(tweetId));
                                            }
                                            return [2 /*return*/, null];
                                    }
                                });
                            });
                        },
                    }, (0, cachified_1.verboseReporter)()).catch(function (e) {
                        // catch the error so things don't crash if there's no cache to fallback to.
                        console.error('Error getting tweet', tweetId, e);
                        return null;
                    })];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
}
var playSvg = "<svg width=\"75\" height=\"75\" viewBox=\"0 0 75 75\" xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"37.4883\" cy=\"37.8254\" r=\"37\" fill=\"white\" /><path fillRule=\"evenodd\" clipRule=\"evenodd\" d=\"M35.2643 33.025L41.0017 36.9265C41.6519 37.369 41.6499 38.3118 40.9991 38.7518L35.2616 42.6276C34.5113 43.1349 33.4883 42.6077 33.4883 41.7143V33.9364C33.4883 33.0411 34.5146 32.5151 35.2643 33.025\" /></svg>";
function buildMediaList(mediaDetails, link) {
    var width = mediaDetails.length > 1 ? '50%' : '100%';
    var imgs = mediaDetails
        .map(function (media) {
        var src = media.media_url_https;
        var imgHTML = "<img src=\"".concat(src, "\" width=\"").concat(width, "\" loading=\"lazy\" alt=\"Tweet media\" />");
        if (media.type === 'animated_gif' || media.type === 'video') {
            return "<div class=\"tweet-media-with-play-button\"><div class=\"tweet-media-play-button\">".concat(playSvg, "</div>").concat(imgHTML, "</div>");
        }
        else {
            return imgHTML;
        }
    })
        .join('');
    var grid = "<div class=\"tweet-media-container\"><div class=\"tweet-media-grid\" data-count=\"".concat(mediaDetails.length, "\">").concat(imgs, "</div></div>");
    if (link) {
        return "<a href=\"".concat(link, "\" target=\"_blank\" rel=\"noreferrer noopener\">").concat(grid, "</a>");
    }
    else {
        return grid;
    }
}
var likesSVG = "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><g><path d=\"M12 21.638h-.014C9.403 21.59 1.95 14.856 1.95 8.478c0-3.064 2.525-5.754 5.403-5.754 2.29 0 3.83 1.58 4.646 2.73.814-1.148 2.354-2.73 4.645-2.73 2.88 0 5.404 2.69 5.404 5.755 0 6.376-7.454 13.11-10.037 13.157H12zM7.354 4.225c-2.08 0-3.903 1.988-3.903 4.255 0 5.74 7.034 11.596 8.55 11.658 1.518-.062 8.55-5.917 8.55-11.658 0-2.267-1.823-4.255-3.903-4.255-2.528 0-3.94 2.936-3.952 2.965-.23.562-1.156.562-1.387 0-.014-.03-1.425-2.965-3.954-2.965z\"></path></g></svg>";
var repliesSVG = "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><g><path d=\"M14.046 2.242l-4.148-.01h-.002c-4.374 0-7.8 3.427-7.8 7.802 0 4.098 3.186 7.206 7.465 7.37v3.828c0 .108.044.286.12.403.142.225.384.347.632.347.138 0 .277-.038.402-.118.264-.168 6.473-4.14 8.088-5.506 1.902-1.61 3.04-3.97 3.043-6.312v-.017c-.006-4.367-3.43-7.787-7.8-7.788zm3.787 12.972c-1.134.96-4.862 3.405-6.772 4.643V16.67c0-.414-.335-.75-.75-.75h-.396c-3.66 0-6.318-2.476-6.318-5.886 0-3.534 2.768-6.302 6.3-6.302l4.147.01h.002c3.532 0 6.3 2.766 6.302 6.296-.003 1.91-.942 3.844-2.514 5.176z\"></path></g></svg>";
var retweetSVG = "<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><g><path d=\"M23.77 15.67c-.292-.293-.767-.293-1.06 0l-2.22 2.22V7.65c0-2.068-1.683-3.75-3.75-3.75h-5.85c-.414 0-.75.336-.75.75s.336.75.75.75h5.85c1.24 0 2.25 1.01 2.25 2.25v10.24l-2.22-2.22c-.293-.293-.768-.293-1.06 0s-.294.768 0 1.06l3.5 3.5c.145.147.337.22.53.22s.383-.072.53-.22l3.5-3.5c.294-.292.294-.767 0-1.06zm-10.66 3.28H7.26c-1.24 0-2.25-1.01-2.25-2.25V6.46l2.22 2.22c.148.147.34.22.532.22s.384-.073.53-.22c.293-.293.293-.768 0-1.06l-3.5-3.5c-.293-.294-.768-.294-1.06 0l-3.5 3.5c-.294.292-.294.767 0 1.06s.767.293 1.06 0l2.22-2.22V16.7c0 2.068 1.683 3.75 3.75 3.75h5.85c.414 0 .75-.336.75-.75s-.337-.75-.75-.75z\"></path></g></svg>";
var linkSvg = "<svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><g><path d=\"M11.96 14.945c-.067 0-.136-.01-.203-.027-1.13-.318-2.097-.986-2.795-1.932-.832-1.125-1.176-2.508-.968-3.893s.942-2.605 2.068-3.438l3.53-2.608c2.322-1.716 5.61-1.224 7.33 1.1.83 1.127 1.175 2.51.967 3.895s-.943 2.605-2.07 3.438l-1.48 1.094c-.333.246-.804.175-1.05-.158-.246-.334-.176-.804.158-1.05l1.48-1.095c.803-.592 1.327-1.463 1.476-2.45.148-.988-.098-1.975-.69-2.778-1.225-1.656-3.572-2.01-5.23-.784l-3.53 2.608c-.802.593-1.326 1.464-1.475 2.45-.15.99.097 1.975.69 2.778.498.675 1.187 1.15 1.992 1.377.4.114.633.528.52.928-.092.33-.394.547-.722.547z\"></path><path d=\"M7.27 22.054c-1.61 0-3.197-.735-4.225-2.125-.832-1.127-1.176-2.51-.968-3.894s.943-2.605 2.07-3.438l1.478-1.094c.334-.245.805-.175 1.05.158s.177.804-.157 1.05l-1.48 1.095c-.803.593-1.326 1.464-1.475 2.45-.148.99.097 1.975.69 2.778 1.225 1.657 3.57 2.01 5.23.785l3.528-2.608c1.658-1.225 2.01-3.57.785-5.23-.498-.674-1.187-1.15-1.992-1.376-.4-.113-.633-.527-.52-.927.112-.4.528-.63.926-.522 1.13.318 2.096.986 2.794 1.932 1.717 2.324 1.224 5.612-1.1 7.33l-3.53 2.608c-.933.693-2.023 1.026-3.105 1.026z\"></path></g></svg>";
var arrowSvg = "<svg width=\"24\" height=\"24\" fill=\"none\" viewBox=\"0 0 24 24\">\n  <path stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\" d=\"M17.25 15.25V6.75H8.75\"></path>\n  <path stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\" d=\"M17 7L6.75 17.25\"></path>\n</svg>\n";
function buildTweetHTML(tweet, expandQuotedTweet) {
    return __awaiter(this, void 0, void 0, function () {
        var author, postURL, authorImg, authorHTML, links, blockquote, index, linkInfo, shortLink, replacement, expandedQuoteTweetHTML, quotedTweet, quotedHTML, tweetHTML, mediaHTML, lastMetadataLink, linkMetadataHTML, md, longLink, longUrl, title, titleHtml, imgHtml, descHtml, urlHtml, createdAtHTML, likeIntent, retweetIntent, replyIntent, favorite_count, conversation_count, likeCount, replyCount, statsHTML;
        var _this = this;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    author = tweet.user;
                    postURL = "https://x.com/".concat(author.screen_name, "/status/").concat(tweet.id_str);
                    authorImg = author.profile_image_url_https.replace('_normal', '_bigger');
                    authorHTML = "\n    <a class=\"tweet-author\" href=\"https://x.com/".concat(author.screen_name, "\" target=\"_blank\" rel=\"noreferrer noopener\">\n      <img src=\"").concat(authorImg, "\" loading=\"lazy\" alt=\"").concat(author.name, " avatar\" />\n      <div>\n        <span class=\"tweet-author-name\">").concat(author.name, "</span>\n        <span class=\"tweet-author-handle\">@").concat(author.screen_name, "</span>\n      </div>\n    </a>");
                    return [4 /*yield*/, Promise.all(__spreadArray([], tweet.text.matchAll(/https:\/\/t.co\/\w+/g), true).map(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                            var longLink, longUrl, isXLink, replacement, isReferenced, metadata, isXMediaLink;
                            var _c, _d;
                            var shortLink = _b[0];
                            return __generator(this, function (_e) {
                                switch (_e.label) {
                                    case 0:
                                        if (!shortLink)
                                            return [2 /*return*/];
                                        return [4 /*yield*/, unshorten(shortLink).catch(function () { return shortLink; })];
                                    case 1:
                                        longLink = _e.sent();
                                        longUrl = new URL(longLink);
                                        isXLink = longUrl.host === 'twitter.com' || longUrl.host === 'x.com';
                                        replacement = "<a href=\"".concat(longLink, "\" target=\"_blank\" rel=\"noreferrer noopener\">").concat(longUrl.hostname + longUrl.pathname, "</a>");
                                        isReferenced = ((_c = tweet.quoted_tweet) === null || _c === void 0 ? void 0 : _c.id_str) &&
                                            longLink.includes(tweet.quoted_tweet.id_str);
                                        metadata = null;
                                        if (isReferenced) {
                                            // we'll handle the referenced tweet later
                                            replacement = '';
                                        }
                                        isXMediaLink = isXLink && /\/(video|photo)\//.test(longUrl.pathname);
                                        if (isXMediaLink) {
                                            // we just embed the media link as an href around the media
                                            replacement = '';
                                        }
                                        if (!!isXLink) return [3 /*break*/, 3];
                                        return [4 /*yield*/, getMetadata(longLink).catch(function () { return null; })];
                                    case 2:
                                        // we don't want to get metadata for tweets.
                                        metadata = _e.sent();
                                        _e.label = 3;
                                    case 3:
                                        if (metadata) {
                                            replacement = "<a href=\"".concat(longLink, "\" target=\"_blank\" rel=\"noreferrer noopener\">").concat(((_d = metadata.title) === null || _d === void 0 ? void 0 : _d.trim()) || longUrl.hostname + longUrl.pathname, "</a>");
                                        }
                                        return [2 /*return*/, {
                                                shortLink: shortLink,
                                                isXLink: isXLink,
                                                longLink: longLink,
                                                longUrl: longUrl,
                                                replacement: replacement,
                                                metadata: metadata,
                                            }];
                                }
                            });
                        }); }))];
                case 1:
                    links = (_c.sent()).filter(misc_tsx_1.typedBoolean);
                    blockquote = tweet.text;
                    for (index = 0; index < links.length; index++) {
                        linkInfo = links[index];
                        if (!linkInfo)
                            continue;
                        shortLink = linkInfo.shortLink, replacement = linkInfo.replacement;
                        blockquote = blockquote.replaceAll(shortLink, replacement);
                    }
                    expandedQuoteTweetHTML = '';
                    if (!(expandQuotedTweet && tweet.quoted_tweet)) return [3 /*break*/, 4];
                    return [4 /*yield*/, getTweetCached(tweet.quoted_tweet.id_str).catch(function () { })];
                case 2:
                    quotedTweet = _c.sent();
                    if (!quotedTweet) return [3 /*break*/, 4];
                    return [4 /*yield*/, buildTweetHTML(quotedTweet, false).catch(function () { })];
                case 3:
                    quotedHTML = _c.sent();
                    if (quotedHTML) {
                        expandedQuoteTweetHTML = "<div class=\"tweet-quoted\">".concat(quotedHTML, "</div>");
                    }
                    _c.label = 4;
                case 4:
                    // xify @mentions
                    blockquote = blockquote.replace(/@(\w+)/g, "<a href=\"https://x.com/$1\" target=\"_blank\" rel=\"noreferrer noopener\">$&</a>");
                    tweetHTML = "<blockquote>".concat(blockquote.trim(), "</blockquote>");
                    mediaHTML = ((_a = tweet.mediaDetails) === null || _a === void 0 ? void 0 : _a.length)
                        ? buildMediaList(tweet.mediaDetails, postURL)
                        : '';
                    lastMetadataLink = links.reverse().find(function (l) { return l.metadata; });
                    linkMetadataHTML = '';
                    if (lastMetadataLink && !mediaHTML) {
                        md = lastMetadataLink.metadata, longLink = lastMetadataLink.longLink, longUrl = lastMetadataLink.longUrl;
                        if (md) {
                            title = (_b = md.title) !== null && _b !== void 0 ? _b : 'Unknown title';
                            titleHtml = "<div class=\"tweet-ref-metadata-title\">".concat(title, "</div>");
                            imgHtml = md.image
                                ? "<img class=\"tweet-ref-metadata-image\" src=\"".concat(md.image, "\" loading=\"lazy\" alt=\"Referenced media\" />")
                                : '';
                            descHtml = md.description
                                ? "<div class=\"tweet-ref-metadata-description\">".concat(md.description, "</div>")
                                : '';
                            urlHtml = "<div class=\"tweet-ref-metadata-domain\">".concat(linkSvg, "<span>").concat(longUrl.hostname, "</span></div>");
                            linkMetadataHTML = "\n<a href=\"".concat(longLink, "\" class=\"tweet-ref-metadata\" target=\"_blank\" rel=\"noreferrer noopener\">\n  ").concat(imgHtml, "\n  ").concat(titleHtml, "\n  ").concat(descHtml, "\n  ").concat(urlHtml, "\n</a>\n      ").trim();
                        }
                    }
                    createdAtHTML = "<div class=\"tweet-time\"><a href=\"".concat(postURL, "\" target=\"_blank\" rel=\"noreferrer noopener\">").concat((0, misc_tsx_1.formatDate)(tweet.created_at, 'h:mm a'), " (UTC) \u00B7 ").concat((0, misc_tsx_1.formatDate)(new Date(tweet.created_at)), "</a></div>");
                    likeIntent = "https://x.com/intent/like?tweet_id=".concat(tweet.id_str);
                    retweetIntent = "https://x.com/intent/retweet?tweet_id=".concat(tweet.id_str);
                    replyIntent = postURL;
                    favorite_count = tweet.favorite_count, conversation_count = tweet.conversation_count;
                    likeCount = (0, misc_tsx_1.formatNumber)(favorite_count);
                    replyCount = (0, misc_tsx_1.formatNumber)(conversation_count);
                    statsHTML = "\n    <div class=\"tweet-stats\">\n      <a href=\"".concat(replyIntent, "\" class=\"tweet-reply\" target=\"_blank\" rel=\"noreferrer noopener\">").concat(repliesSVG, "<span>").concat(replyCount, "</span></a>\n      <a href=\"").concat(retweetIntent, "\" class=\"tweet-retweet\" target=\"_blank\" rel=\"noreferrer noopener\">").concat(retweetSVG, "</a>\n      <a href=\"").concat(likeIntent, "\" class=\"tweet-like\" target=\"_blank\" rel=\"noreferrer noopener\">").concat(likesSVG, "<span>").concat(likeCount, "</span></a>\n      <a href=\"").concat(postURL, "\" class=\"tweet-link\" target=\"_blank\" rel=\"noreferrer noopener\">").concat(arrowSvg, "<span></span></a>\n    </div>\n  ");
                    return [2 /*return*/, "\n    <div class=\"tweet-embed\">\n      ".concat(authorHTML, "\n      ").concat(tweetHTML, "\n      ").concat(mediaHTML, "\n      ").concat(linkMetadataHTML, "\n      ").concat(expandedQuoteTweetHTML, "\n      ").concat(createdAtHTML, "\n      ").concat(statsHTML, "\n    </div>\n  ").trim()];
            }
        });
    });
}
function getTweetEmbedHTML(urlString) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, (0, cachified_1.cachified)({
                    key: "tweet:embed:".concat(urlString),
                    ttl: 1000 * 60 * 60 * 24,
                    cache: cache_server_ts_1.cache,
                    staleWhileRevalidate: 1000 * 60 * 60 * 24 * 30 * 6,
                    getFreshValue: function () { return getTweetEmbedHTMLImpl(urlString); },
                }, (0, cachified_1.verboseReporter)())];
        });
    });
}
function getTweetEmbedHTMLImpl(urlString) {
    return __awaiter(this, void 0, void 0, function () {
        var url, tweetId, tweet, failureHtml, html, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = new URL(urlString);
                    tweetId = url.pathname.split('/').pop();
                    if (!tweetId) {
                        console.error('TWEET ID NOT FOUND', urlString, tweetId);
                        return [2 /*return*/, ''];
                    }
                    tweet = null;
                    failureHtml = "<callout-danger>\uD835\uDD4F post data not available: <a href=\"".concat(urlString, "\">").concat(urlString, "</a></callout-danger>");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, getTweetCached(tweetId)];
                case 2:
                    tweet = _a.sent();
                    if (!tweet) {
                        return [2 /*return*/, failureHtml];
                    }
                    return [4 /*yield*/, buildTweetHTML(tweet, true)];
                case 3:
                    html = _a.sent();
                    return [2 /*return*/, html];
                case 4:
                    error_1 = _a.sent();
                    console.error('Error processing tweet', {
                        urlString: urlString,
                        tweetId: tweetId,
                        error: error_1,
                        tweet: tweet,
                    });
                    return [2 /*return*/, failureHtml];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function isXUrl(urlString) {
    var url = new URL(urlString);
    return /\.?twitter\.com/.test(url.hostname) || /\.?x\.com/.test(url.hostname);
}
