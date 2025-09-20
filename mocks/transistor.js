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
exports.transistorHandlers = void 0;
var faker_1 = require("@faker-js/faker");
var msw_1 = require("msw");
var utils_ts_1 = require("./utils.ts");
function makeEpisode(overrides) {
    if (overrides === void 0) { overrides = {}; }
    var publishedAt = faker_1.faker.date.between({
        from: Date.now() - 1000 * 60 * 60 * 24 * 7 * 6,
        to: Date.now() - 1000 * 60 * 60 * 24,
    });
    return __assign(__assign({ id: faker_1.faker.string.uuid(), type: 'episode' }, overrides), { attributes: __assign({ number: 0, season: 1, title: faker_1.faker.lorem.words(), duration: faker_1.faker.number.float({ min: 180, max: 900 }), summary: faker_1.faker.lorem.sentence(), description: faker_1.faker.lorem.paragraphs(2), keywords: faker_1.faker.lorem.words().split(' ').join(','), status: 'published', image_url: faker_1.faker.image.avatar(), media_url: 'https://media.transistor.fm/1493e91f/10e5e65b.mp3', share_url: 'https://share.transistor.fm/s/1493e91f', embed_html: '<iframe src="https://share.transistor.fm/e/1493e91f" width="100%" height="180" frameborder="0" scrolling="no" seamless style="width:100%; height:180px;"></iframe>', embed_html_dark: '<iframe src="https://share.transistor.fm/e/1493e91f/dark" width="100%" height="180" frameborder="0" scrolling="no" seamless style="width:100%; height:180px;"></iframe>', published_at: publishedAt.toISOString(), audio_processing: false, updated_at: faker_1.faker.date
                .between({
                from: publishedAt.getTime(),
                to: Date.now() - 1000 * 60 * 60 * 23,
            })
                .toISOString() }, overrides.attributes) });
}
var episodes = Array.from({ length: 99 }, function (item, index) {
    return makeEpisode({
        attributes: {
            season: Math.ceil((index + 1) / 50),
            number: (index % 50) + 1,
        },
    });
});
var transistorHandlers = [
    msw_1.http.get('https://api.transistor.fm/v1/episodes/authorize_upload', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var url, data;
        var request = _b.request;
        return __generator(this, function (_c) {
            url = new URL(request.url);
            (0, utils_ts_1.requiredParam)(url.searchParams, 'filename');
            (0, utils_ts_1.requiredHeader)(request.headers, 'x-api-key');
            data = {
                data: {
                    attributes: {
                        upload_url: 'https://transistorupload.s3.amazonaws.com/uploads/api/37009fba-7aae-4514-8ebb-d3c8be45734f/Episode1.mp3?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAJNPH...%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20210517T191158Z&X-Amz-Expires=600&X-Amz-SignedHeaders=host&X-Amz-Signature=f7b749...',
                        content_type: 'audio/mpeg',
                        audio_url: 'https://transistorupload.s3.amazonaws.com/uploads/api/37009fba-7aae-4514-8ebb-d3c8be45734f/Episode1.mp3',
                    },
                },
            };
            return [2 /*return*/, msw_1.HttpResponse.json(data)];
        });
    }); }),
    msw_1.http.put('https://transistorupload.s3.amazonaws.com/uploads/api/:bucketId/:fileId', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var body;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, request.blob()];
                case 1:
                    body = _c.sent();
                    if (!body.size) {
                        throw new Error('body is required');
                    }
                    return [2 /*return*/, msw_1.HttpResponse.json({
                        // we don't use the response so no need to put something real here.
                        })];
            }
        });
    }); }),
    msw_1.http.post('https://api.transistor.fm/v1/episodes', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var body, episode, data;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, request.json()];
                case 1:
                    body = _c.sent();
                    if (!body || typeof body !== 'object') {
                        throw new Error('req.body must be an object');
                    }
                    (0, utils_ts_1.requiredHeader)(request.headers, 'x-api-key');
                    (0, utils_ts_1.requiredProperty)(body, 'episode');
                    (0, utils_ts_1.requiredProperty)(body.episode, 'show_id');
                    (0, utils_ts_1.requiredProperty)(body.episode, 'season');
                    (0, utils_ts_1.requiredProperty)(body.episode, 'audio_url');
                    (0, utils_ts_1.requiredProperty)(body.episode, 'title');
                    (0, utils_ts_1.requiredProperty)(body.episode, 'summary');
                    (0, utils_ts_1.requiredProperty)(body.episode, 'description');
                    episode = makeEpisode({
                        attributes: __assign({ number: Math.max.apply(Math, episodes.map(function (e) { var _a; return (_a = e.attributes.number) !== null && _a !== void 0 ? _a : 0; })) + 1 }, body.episode),
                    });
                    data = { data: episode };
                    episodes.push(episode);
                    return [2 /*return*/, msw_1.HttpResponse.json(data)];
            }
        });
    }); }),
    msw_1.http.patch('https://api.transistor.fm/v1/episodes/:episodeId/publish', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var body, episode, data;
        var request = _b.request, params = _b.params;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, request.json()];
                case 1:
                    body = _c.sent();
                    if (!body || typeof body !== 'object') {
                        throw new Error('req.body must be an object');
                    }
                    (0, utils_ts_1.requiredProperty)(body, 'episode');
                    (0, utils_ts_1.requiredHeader)(request.headers, 'x-api-key');
                    if (body.episode.status !== 'published') {
                        throw new Error("req.body.episode.status must be published. Was \"".concat(body.episode.status, "\""));
                    }
                    episode = episodes.find(function (e) { return e.id === params.episodeId; });
                    if (!episode) {
                        throw new Error("No episode exists with the id of ".concat(params.episodeId));
                    }
                    episode.attributes.status = 'published';
                    data = { data: episode };
                    return [2 /*return*/, msw_1.HttpResponse.json(data)];
            }
        });
    }); }),
    msw_1.http.patch('https://api.transistor.fm/v1/episodes/:episodeId', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var body, episode, data;
        var request = _b.request, params = _b.params;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, request.json()];
                case 1:
                    body = _c.sent();
                    if (!body || typeof body !== 'object') {
                        throw new Error('req.body must be an object');
                    }
                    (0, utils_ts_1.requiredProperty)(body, 'episode');
                    (0, utils_ts_1.requiredHeader)(request.headers, 'x-api-key');
                    episode = episodes.find(function (e) { return e.id === params.episodeId; });
                    if (!episode) {
                        throw new Error("No episode exists with the id of ".concat(params.episodeId));
                    }
                    Object.assign(episode, body.episode);
                    data = { data: episode };
                    return [2 /*return*/, msw_1.HttpResponse.json(data)];
            }
        });
    }); }),
    msw_1.http.get('https://api.transistor.fm/v1/episodes', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var data;
        var request = _b.request;
        return __generator(this, function (_c) {
            (0, utils_ts_1.requiredHeader)(request.headers, 'x-api-key');
            data = { data: episodes };
            return [2 /*return*/, msw_1.HttpResponse.json(data)];
        });
    }); }),
];
exports.transistorHandlers = transistorHandlers;
