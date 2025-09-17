"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCWKEpisodePath = getCWKEpisodePath;
exports.getFeaturedEpisode = getFeaturedEpisode;
var date_fns_1 = require("date-fns");
function getCWKEpisodePath(_a) {
    var seasonNumber = _a.seasonNumber, episodeNumber = _a.episodeNumber, slug = _a.slug;
    return [
        '/chats',
        seasonNumber.toString().padStart(2, '0'),
        episodeNumber.toString().padStart(2, '0'),
        slug,
    ]
        .filter(Boolean)
        .join('/');
}
function getFeaturedEpisode(episodes) {
    if (!episodes.length)
        return null;
    var weeksSinceMyBirthday = (0, date_fns_1.differenceInWeeks)(new Date(), new Date('1988-10-18'));
    var featured = episodes[weeksSinceMyBirthday % episodes.length];
    if (!featured) {
        throw new Error("Could not find featured episode. This should be impossible. ".concat(weeksSinceMyBirthday, " % ").concat(episodes.length, " = ").concat(weeksSinceMyBirthday % episodes.length));
    }
    return featured;
}
