"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simplecastHandlers = void 0;
var faker_1 = require("@faker-js/faker");
var msw_1 = require("msw");
var seasonListItems = [
    {
        href: "https://api.simplecast.com/seasons/".concat(faker_1.faker.string.uuid()),
        number: 1,
    },
    {
        href: "https://api.simplecast.com/seasons/".concat(faker_1.faker.string.uuid()),
        number: 2,
    },
    {
        href: "https://api.simplecast.com/seasons/".concat(faker_1.faker.string.uuid()),
        number: 3,
    },
    {
        href: "https://api.simplecast.com/seasons/".concat(faker_1.faker.string.uuid()),
        number: 4,
    },
];
var episodesById = {};
var episodesBySeasonId = {};
var _loop_1 = function (seasonListItem) {
    var seasonId = seasonListItem.href.split('/').slice(-1)[0];
    if (!seasonId)
        throw new Error("no id for ".concat(seasonListItem.href));
    var episodes = Array.from({ length: faker_1.faker.number.int({ min: 10, max: 24 }) }, function (v, index) {
        var id = faker_1.faker.string.uuid();
        var title = faker_1.faker.lorem.words();
        var homework = Array.from({ length: faker_1.faker.number.int({ min: 1, max: 3 }) }, function () { return faker_1.faker.lorem.sentence(); });
        var resources = Array.from({ length: faker_1.faker.number.int({ min: 2, max: 7 }) }, function () {
            return "[".concat(faker_1.faker.lorem.sentence(), "](https://example.com/").concat(faker_1.faker.lorem.word(), ")");
        });
        var guests = Array.from({ length: faker_1.faker.number.int({ min: 1, max: 3 }) }, function () {
            var name = faker_1.faker.person.fullName();
            var username = faker_1.faker.internet.userName();
            var website = faker_1.faker.internet.url();
            var links = [
                faker_1.faker.datatype.boolean()
                    ? "\uD835\uDD4F: [@".concat(username, "](https://x.com/").concat(username, ")")
                    : null,
                faker_1.faker.datatype.boolean()
                    ? "Website: [".concat(new URL(website).origin, "](").concat(website, ")")
                    : null,
                faker_1.faker.datatype.boolean()
                    ? "LinkedIn: [@".concat(username, "](https://www.linkedin.com/in/").concat(username, "/)")
                    : null,
                faker_1.faker.datatype.boolean()
                    ? "GitHub: [@".concat(username, "](https://github.com/").concat(username, ")")
                    : null,
            ].filter(Boolean);
            return { name: name, links: links };
        });
        return {
            id: id,
            title: title,
            is_hidden: false,
            duration: faker_1.faker.number.int({ min: 1700, max: 2500 }),
            number: index + 1,
            transcription: faker_1.faker.lorem.paragraphs(30),
            status: 'published',
            is_published: true,
            updated_at: faker_1.faker.date.past().toISOString(),
            image_url: faker_1.faker.image.avatar(),
            audio_file_url: 'set audio_file_url to a real file if we ever use this',
            slug: title.split(' ').join('-'),
            description: faker_1.faker.lorem.sentence(),
            season: seasonListItem,
            long_description: "\n".concat(faker_1.faker.lorem.paragraphs(3), "\n\n<!-- these links are for testing auto-affiliates -->\n\n[egghead.io](https://egghead.io)\n\n[amazon](https://amazon.com)\n\n* * *\n\n### Homework\n\n* ").concat(homework.join('\n* '), "\n\n### Resources\n\n* ").concat(resources.join('\n* '), "\n\n### ").concat(guests
                .map(function (guest) {
                return "\nGuest: ".concat(guest.name, "\n\n").concat(guest.links.length ? "* ".concat(guest.links.join('\n* ')) : '', "\n").trim();
            })
                .join('\n\n### '), "\n\n### Host: Kent C. Dodds\n\n* Website: [kentcdodds.com](https://kentcdodds.com/)\n* \uD835\uDD4F: [@kentcdodds](https://x.com/kentcdodds)\n* GitHub: [@kentcdodds](https://github.com/kentcdodds)\n* Youtube: [Kent C. Dodds](https://www.youtube.com/channel/UCz-BYvuntVRt_VpfR6FKXJw)\n        ").trim(),
            enclosure_url: 'https://cdn.simplecast.com/audio/f1ae04/f1ae0415-6876-4fad-aff9-96d8c26f3dbb/69813706-347b-4fd4-933f-8ab4dcf5a891/tanner-linsley_tc.mp3',
            keywords: {
                collection: faker_1.faker.lorem
                    .words()
                    .split(' ')
                    .map(function (value) { return ({ value: value }); }),
            },
        };
    });
    episodesBySeasonId[seasonId] = episodes;
    for (var _a = 0, episodes_1 = episodes; _a < episodes_1.length; _a++) {
        var episode = episodes_1[_a];
        episodesById[episode.id] = episode;
    }
};
for (var _i = 0, seasonListItems_1 = seasonListItems; _i < seasonListItems_1.length; _i++) {
    var seasonListItem = seasonListItems_1[_i];
    _loop_1(seasonListItem);
}
var simplecastHandlers = [
    msw_1.http.get('https://api.simplecast.com/podcasts/:podcastId/seasons', function () {
        var response = {
            collection: seasonListItems,
        };
        return msw_1.HttpResponse.json(response);
    }),
    msw_1.http.get('https://api.simplecast.com/seasons/:seasonId/episodes', function (_a) {
        var params = _a.params;
        if (typeof params.seasonId !== 'string') {
            throw new Error('req.params.seasonId is not a string');
        }
        var episodes = episodesBySeasonId[params.seasonId];
        if (!episodes) {
            throw new Error("No mock episodes by season ID: ".concat(params.seasonId));
        }
        var episodeListItemsResponse = {
            collection: episodes.map(function (e) { return ({
                id: e.id,
                is_hidden: e.is_hidden,
                status: e.status,
                is_published: e.is_published,
            }); }),
        };
        return msw_1.HttpResponse.json(episodeListItemsResponse);
    }),
    msw_1.http.get("https://api.simplecast.com/episodes/:episodeId", function (_a) {
        var params = _a.params;
        if (typeof params.episodeId !== 'string') {
            throw new Error('req.params.episodeId is not a string');
        }
        return msw_1.HttpResponse.json(episodesById[params.episodeId]);
    }),
];
exports.simplecastHandlers = simplecastHandlers;
