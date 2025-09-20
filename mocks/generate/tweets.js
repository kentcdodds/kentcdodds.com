"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
var fs_1 = require("fs");
var path_1 = require("path");
var url_1 = require("url");
var node_1 = require("@remix-run/node");
var get_tweet_ts_1 = require("../../app/utils/twitter/get-tweet.ts");
var __dirname = path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url));
(0, node_1.installGlobals)();
var tweets = {
    video: '1420669402932932611',
    onePhoto: '1418928039069511682',
    twoPhotos: '1410709329951354880',
    fourPhotos: '1404408769551994880',
    threePhotos: '1420726342996271105',
    quote: '1420720925868052486',
    simpleWithMention: '1420508470726463489',
    reply: '1418772893190606852',
    quoteOfQuote: '1420020360293011456',
    poll: '1415491278008033280',
    linkWithMetadata: '1414579379422711809',
    textOnly: '1413326124969459714',
    quoteOfDeletedTweet: '1406244165529137159',
    deletedTweet: '1406128033216356353',
    streamEmbed: '1403018951639113733',
};
var tweetDatas = {};
for (var _i = 0, _a = Object.entries(tweets); _i < _a.length; _i++) {
    var _b = _a[_i], key = _b[0], value = _b[1];
    tweetDatas[key] = await (0, get_tweet_ts_1.getTweet)(value);
}
await fs_1.default.promises.writeFile(path_1.default.join(__dirname, '../data/tweets.json'), JSON.stringify(tweetDatas, null, 2));
