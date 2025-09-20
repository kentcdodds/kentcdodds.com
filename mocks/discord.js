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
exports.discordHandlers = void 0;
var msw_1 = require("msw");
var utils_ts_1 = require("./utils.ts");
var discordHandlers = [
    msw_1.http.post('https://discord.com/api/oauth2/token', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var body, params;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, request.text()];
                case 1:
                    body = _c.sent();
                    if (typeof body !== 'string') {
                        throw new Error('request body must be a string of URLSearchParams');
                    }
                    if (request.headers.get('Content-Type') !==
                        'application/x-www-form-urlencoded') {
                        throw new Error('Content-Type header must be "application/x-www-form-urlencoded"');
                    }
                    params = new URLSearchParams(body);
                    (0, utils_ts_1.requiredParam)(params, 'client_id');
                    (0, utils_ts_1.requiredParam)(params, 'client_secret');
                    (0, utils_ts_1.requiredParam)(params, 'grant_type');
                    (0, utils_ts_1.requiredParam)(params, 'redirect_uri');
                    (0, utils_ts_1.requiredParam)(params, 'scope');
                    return [2 /*return*/, msw_1.HttpResponse.json({
                            token_type: 'test_token_type',
                            access_token: 'test_access_token',
                        })];
            }
        });
    }); }),
    msw_1.http.get('https://discord.com/api/users/:userId', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var request = _b.request;
        return __generator(this, function (_c) {
            (0, utils_ts_1.requiredHeader)(request.headers, 'Authorization');
            return [2 /*return*/, msw_1.HttpResponse.json({
                    id: 'test_discord_id',
                    username: 'test_discord_username',
                    discriminator: '0000',
                })];
        });
    }); }),
    msw_1.http.get('https://discord.com/api/guilds/:guildId/members/:userId', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var user;
        var request = _b.request, params = _b.params;
        return __generator(this, function (_c) {
            (0, utils_ts_1.requiredHeader)(request.headers, 'Authorization');
            user = {
                id: params.userId,
                username: "".concat(params.userId, "username"),
                discriminator: '0000',
            };
            return [2 /*return*/, msw_1.HttpResponse.json(__assign({ user: user, roles: [] }, user))];
        });
    }); }),
    msw_1.http.put('https://discord.com/api/guilds/:guildId/members/:userId', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var body, bodyString;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    (0, utils_ts_1.requiredHeader)(request.headers, 'Authorization');
                    return [4 /*yield*/, request.json()];
                case 1:
                    body = _c.sent();
                    if (typeof body !== 'object') {
                        console.error('Request body:', body);
                        throw new Error('Request body must be a JSON object');
                    }
                    if (!(body === null || body === void 0 ? void 0 : body.access_token)) {
                        bodyString = JSON.stringify(body, null, 2);
                        throw new Error("access_token required in the body, but not found in ".concat(bodyString));
                    }
                    return [2 /*return*/, msw_1.HttpResponse.json({
                        // We don't use this response for now so we'll leave this empty
                        })];
            }
        });
    }); }),
    msw_1.http.patch('https://discord.com/api/guilds/:guildId/members/:userId', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var body;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    (0, utils_ts_1.requiredHeader)(request.headers, 'Authorization');
                    return [4 /*yield*/, request.json()];
                case 1:
                    body = _c.sent();
                    if (typeof body !== 'object') {
                        throw new Error('patch request to member must have a JSON body');
                    }
                    if (!body || !Array.isArray(body.roles) || body.roles.length < 1) {
                        throw new Error('patch request to member must include a roles array with the new role');
                    }
                    return [2 /*return*/, msw_1.HttpResponse.json({
                        // We don't use this response for now so we'll leave this empty
                        })];
            }
        });
    }); }),
    msw_1.http.get('https://discord.com/api/guilds/:guildId/members/:userId', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var request = _b.request;
        return __generator(this, function (_c) {
            (0, utils_ts_1.requiredHeader)(request.headers, 'Authorization');
            return [2 /*return*/, msw_1.HttpResponse.json({
                    user: { id: 'test_discord_id', username: 'test_username' },
                    roles: [],
                })];
        });
    }); }),
    msw_1.http.post('https://discord.com/api/channels/:channelId/messages', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var body;
        var request = _b.request, params = _b.params;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    (0, utils_ts_1.requiredHeader)(request.headers, 'Authorization');
                    return [4 /*yield*/, request.json()];
                case 1:
                    body = _c.sent();
                    if (typeof body !== 'object') {
                        console.error('Request body:', body);
                        throw new Error('Request body must be a JSON object');
                    }
                    console.log("\uD83E\uDD16 Sending bot message to ".concat(params.channelId, ":\n"), body === null || body === void 0 ? void 0 : body.content);
                    return [2 /*return*/, msw_1.HttpResponse.json({
                        /* we ignore the response */
                        })];
            }
        });
    }); }),
];
exports.discordHandlers = discordHandlers;
