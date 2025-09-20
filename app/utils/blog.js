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
exports.filterPosts = filterPosts;
exports.getRankingLeader = getRankingLeader;
var match_sorter_1 = require("match-sorter");
function getRankingLeader(rankings) {
    if (!rankings)
        return null;
    return rankings.reduce(function (leader, rank) {
        if (rank.ranking <= 0)
            return leader;
        if (!leader || rank.ranking > leader.ranking)
            return rank;
        return leader;
    }, null);
}
function filterPosts(posts, searchString) {
    if (!searchString)
        return posts;
    var options = {
        keys: [
            {
                key: 'frontmatter.title',
                threshold: match_sorter_1.rankings.CONTAINS,
            },
            {
                key: 'frontmatter.categories',
                threshold: match_sorter_1.rankings.CONTAINS,
                maxRanking: match_sorter_1.rankings.CONTAINS,
            },
            {
                key: 'frontmatter.meta.keywords',
                threshold: match_sorter_1.rankings.CONTAINS,
                maxRanking: match_sorter_1.rankings.CONTAINS,
            },
            {
                key: 'frontmatter.description',
                threshold: match_sorter_1.rankings.CONTAINS,
                maxRanking: match_sorter_1.rankings.CONTAINS,
            },
        ],
    };
    var allResults = (0, match_sorter_1.matchSorter)(posts, searchString, options);
    var searches = new Set(searchString.split(' '));
    if (searches.size < 2) {
        // if there's only one word then we're done
        return allResults;
    }
    // if there are multiple words, we'll conduct an individual search for each word
    var _a = searches.values(), firstWord = _a[0], restWords = _a.slice(1);
    if (!firstWord) {
        // this should be impossible, but if it does happen, we'll just return an empty array
        return [];
    }
    var individualWordOptions = __assign(__assign({}, options), { keys: options.keys.map(function (key) {
            return __assign(__assign({}, key), { maxRanking: match_sorter_1.rankings.CASE_SENSITIVE_EQUAL, threshold: match_sorter_1.rankings.WORD_STARTS_WITH });
        }) });
    // go through each word and further filter the results
    var individualWordResults = (0, match_sorter_1.matchSorter)(posts, firstWord, individualWordOptions);
    var _loop_1 = function (word) {
        var searchResult = (0, match_sorter_1.matchSorter)(individualWordResults, word, individualWordOptions);
        individualWordResults = individualWordResults.filter(function (r) {
            return searchResult.includes(r);
        });
    };
    for (var _i = 0, restWords_1 = restWords; _i < restWords_1.length; _i++) {
        var word = restWords_1[_i];
        _loop_1(word);
    }
    return Array.from(new Set(__spreadArray(__spreadArray([], allResults, true), individualWordResults, true)));
}
