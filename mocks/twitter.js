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
exports.twitterHandlers = void 0;
var path_1 = require("path");
var fs_extra_1 = require("fs-extra");
var msw_1 = require("msw");
var utils_ts_1 = require("./utils.ts");
// use readJson as long as Import assertions is experimental
// import siteMetadata from './data/site-metadata.json' assert {type: 'json'}
// import type tweets from './data/tweets.json' assert {type: 'json'}
var here = function (s) { return path_1.default.join(process.cwd(), './mocks/data', s); };
var read = function (s) { return fs_extra_1.default.readJsonSync(here(s)); };
var tweets = read('tweets.json');
var siteMetadata = read('site-metadata.json');
var tweetsArray = Object.values(tweets);
var siteMetadataArray = Object.values(siteMetadata);
function getSiteMetadata(tweetUrlId) {
    var urlIdNumber = tweetUrlId
        .split('')
        .map(function (c) { return c.charCodeAt(0); })
        .reduce(function (a, n) { return a + n; }, 0);
    var index = urlIdNumber % siteMetadataArray.length;
    var metadata = siteMetadataArray[index];
    if (!metadata) {
        throw new Error("no metadata found for id ".concat(tweetUrlId, ". This should be impossible..."));
    }
    return metadata;
}
var twitterHandlers = [
    msw_1.http.get('https://cdn.syndication.twimg.com/tweet-result', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var url, tweetId, tweet, tweetNumber, index;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    url = new URL(request.url);
                    return [4 /*yield*/, (0, utils_ts_1.isConnectedToTheInternet)()];
                case 1:
                    // if you want to mock out specific tweets, comment out this next line
                    if ((_c.sent()) &&
                        process.env.TWITTER_BEARER_TOKEN !== 'MOCK_TWITTER_TOKEN') {
                        return [2 /*return*/];
                    }
                    tweetId = url.searchParams.get('tweet_id');
                    tweet = tweetsArray.find(function (t) {
                        if ('data' in t) {
                            return tweetId === t.id_str;
                        }
                        else {
                            console.warn("mock tweet data that does not match!", t);
                            return false;
                        }
                    });
                    if (!tweet) {
                        tweetNumber = Number(tweetId);
                        index = tweetNumber % tweetsArray.length;
                        tweet = tweetsArray[index];
                    }
                    if (!tweet) {
                        throw new Error("no tweet found for id ".concat(tweetId, ". This should be impossible..."));
                    }
                    return [2 /*return*/, msw_1.HttpResponse.json(tweet)];
            }
        });
    }); }),
    msw_1.http.get('https://t.co/:tweetUrlId', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var params = _b.params;
        return __generator(this, function (_c) {
            return [2 /*return*/, msw_1.HttpResponse.text(getSiteMetadata(params.tweetUrlId))];
        });
    }); }),
    msw_1.http.head('https://t.co/:tweetUrlId', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, msw_1.HttpResponse.json(null, { headers: { 'x-head-mock': 'true' } })];
        });
    }); }),
];
exports.twitterHandlers = twitterHandlers;
