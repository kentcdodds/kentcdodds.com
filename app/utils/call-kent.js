"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEpisodePath = getEpisodePath;
exports.getEpisodeFromParams = getEpisodeFromParams;
exports.getErrorForAudio = getErrorForAudio;
exports.getErrorForTitle = getErrorForTitle;
exports.getErrorForDescription = getErrorForDescription;
exports.getErrorForKeywords = getErrorForKeywords;
function getErrorForDescription(description) {
    if (!description)
        return "Description is required";
    var minLength = 20;
    var maxLength = 5000;
    if (description.length < minLength) {
        return "Description must be at least ".concat(minLength, " characters");
    }
    if (description.length > maxLength) {
        return "Description must be no longer than ".concat(maxLength, " characters");
    }
    return null;
}
function getErrorForTitle(title) {
    if (!title)
        return "Title is required";
    var minLength = 5;
    var maxLength = 80;
    if (title.length < minLength) {
        return "Title must be at least ".concat(minLength, " characters");
    }
    if (title.length > maxLength) {
        return "Title must be no longer than ".concat(maxLength, " characters");
    }
    return null;
}
function getErrorForKeywords(keywords) {
    if (!keywords)
        return "Keywords is required";
    var minLength = 2;
    var maxLength = 100;
    if (keywords.length < minLength) {
        return "Keywords must be at least ".concat(minLength, " characters");
    }
    if (keywords.length > maxLength) {
        return "Keywords must be no longer than ".concat(maxLength, " characters");
    }
    return null;
}
function getErrorForAudio(audio) {
    if (!audio)
        return 'Audio file is required';
    return null;
}
function getEpisodeFromParams(episodes, params) {
    return episodes.find(function (e) {
        return e.seasonNumber === Number(params.season) &&
            e.episodeNumber === Number(params.episode);
    });
}
function getEpisodePath(_a) {
    var seasonNumber = _a.seasonNumber, episodeNumber = _a.episodeNumber, slug = _a.slug;
    return [
        '/calls',
        seasonNumber.toString().padStart(2, '0'),
        episodeNumber.toString().padStart(2, '0'),
        slug,
    ]
        .filter(Boolean)
        .join('/');
}
