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
exports.connectDiscord = connectDiscord;
exports.getDiscordUser = getDiscordUser;
exports.getMember = getMember;
exports.sendMessageFromDiscordBot = sendMessageFromDiscordBot;
var misc_tsx_1 = require("./misc.tsx");
var prisma_server_ts_1 = require("./prisma.server.ts");
var DISCORD_CLIENT_ID = (0, misc_tsx_1.getRequiredServerEnvVar)('DISCORD_CLIENT_ID');
var DISCORD_CLIENT_SECRET = (0, misc_tsx_1.getRequiredServerEnvVar)('DISCORD_CLIENT_SECRET');
var DISCORD_SCOPES = (0, misc_tsx_1.getRequiredServerEnvVar)('DISCORD_SCOPES');
var DISCORD_BOT_TOKEN = (0, misc_tsx_1.getRequiredServerEnvVar)('DISCORD_BOT_TOKEN');
var DISCORD_GUILD_ID = (0, misc_tsx_1.getRequiredServerEnvVar)('DISCORD_GUILD_ID');
var DISCORD_RED_ROLE = (0, misc_tsx_1.getRequiredServerEnvVar)('DISCORD_RED_ROLE');
var DISCORD_YELLOW_ROLE = (0, misc_tsx_1.getRequiredServerEnvVar)('DISCORD_YELLOW_ROLE');
var DISCORD_BLUE_ROLE = (0, misc_tsx_1.getRequiredServerEnvVar)('DISCORD_BLUE_ROLE');
var DISCORD_MEMBER_ROLE = (0, misc_tsx_1.getRequiredServerEnvVar)('DISCORD_MEMBER_ROLE');
var discordRoleTeams = {
    RED: DISCORD_RED_ROLE,
    YELLOW: DISCORD_YELLOW_ROLE,
    BLUE: DISCORD_BLUE_ROLE,
};
function fetchAsDiscordBot(endpoint, config) {
    return __awaiter(this, void 0, void 0, function () {
        var url, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = new URL("https://discord.com/api/".concat(endpoint));
                    return [4 /*yield*/, fetch(url.toString(), __assign(__assign({}, config), { headers: __assign({ Authorization: "Bot ".concat(DISCORD_BOT_TOKEN) }, config === null || config === void 0 ? void 0 : config.headers) }))];
                case 1:
                    res = _a.sent();
                    return [2 /*return*/, res];
            }
        });
    });
}
function fetchJsonAsDiscordBot(endpoint, config) {
    return __awaiter(this, void 0, void 0, function () {
        var res, json;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchAsDiscordBot(endpoint, __assign(__assign({}, config), { headers: __assign({ 'Content-Type': 'application/json' }, config === null || config === void 0 ? void 0 : config.headers) }))];
                case 1:
                    res = _a.sent();
                    return [4 /*yield*/, res.json()];
                case 2:
                    json = (_a.sent());
                    return [2 /*return*/, json];
            }
        });
    });
}
function sendMessageFromDiscordBot(channelId, content) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchAsDiscordBot("channels/".concat(channelId, "/messages"), {
                        method: 'POST',
                        body: JSON.stringify({ content: content }),
                        headers: { 'Content-Type': 'application/json' },
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function getUserToken(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var tokenUrl, params, tokenRes, discordToken, userUrl, userRes, discordUser;
        var code = _b.code, domainUrl = _b.domainUrl;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    tokenUrl = new URL('https://discord.com/api/oauth2/token');
                    params = new URLSearchParams({
                        client_id: DISCORD_CLIENT_ID,
                        client_secret: DISCORD_CLIENT_SECRET,
                        grant_type: 'authorization_code',
                        code: code,
                        redirect_uri: "".concat(domainUrl, "/discord/callback"),
                        scope: DISCORD_SCOPES,
                    });
                    return [4 /*yield*/, fetch(tokenUrl.toString(), {
                            method: 'POST',
                            body: params,
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                        })];
                case 1:
                    tokenRes = _c.sent();
                    return [4 /*yield*/, tokenRes.json()];
                case 2:
                    discordToken = (_c.sent());
                    userUrl = new URL('https://discord.com/api/users/@me');
                    return [4 /*yield*/, fetch(userUrl.toString(), {
                            headers: {
                                authorization: "".concat(discordToken.token_type, " ").concat(discordToken.access_token),
                            },
                        })];
                case 3:
                    userRes = _c.sent();
                    return [4 /*yield*/, userRes.json()];
                case 4:
                    discordUser = (_c.sent());
                    return [2 /*return*/, { discordUser: discordUser, discordToken: discordToken }];
            }
        });
    });
}
function getDiscordUser(discordUserId) {
    return __awaiter(this, void 0, void 0, function () {
        var user;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJsonAsDiscordBot("users/".concat(discordUserId))];
                case 1:
                    user = _a.sent();
                    return [2 /*return*/, user];
            }
        });
    });
}
function getMember(discordUserId) {
    return __awaiter(this, void 0, void 0, function () {
        var member;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchJsonAsDiscordBot("guilds/".concat(DISCORD_GUILD_ID, "/members/").concat(discordUserId))];
                case 1:
                    member = _a.sent();
                    return [2 /*return*/, member];
            }
        });
    });
}
function updateDiscordRolesForUser(discordMember, user) {
    return __awaiter(this, void 0, void 0, function () {
        var team, teamRole;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma_server_ts_1.prisma.user.update({
                        where: { id: user.id },
                        data: { discordId: discordMember.user.id },
                    })];
                case 1:
                    _a.sent();
                    team = (0, misc_tsx_1.getTeam)(user.team);
                    if (!team) {
                        return [2 /*return*/];
                    }
                    teamRole = discordRoleTeams[team];
                    if (!!discordMember.roles.includes(teamRole)) return [3 /*break*/, 3];
                    return [4 /*yield*/, fetchAsDiscordBot("guilds/".concat(DISCORD_GUILD_ID, "/members/").concat(discordMember.user.id), {
                            method: 'PATCH',
                            body: JSON.stringify({
                                roles: Array.from(new Set(__spreadArray(__spreadArray([], discordMember.roles, true), [DISCORD_MEMBER_ROLE, teamRole], false))),
                            }),
                            // note using fetchJsonAsDiscordBot because this API doesn't return JSON.
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        })];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function addUserToDiscordServer(discordUser, discordToken) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: 
                // there's no harm inviting someone who's already in the server,
                // so we invite them without bothering to check whether they're in the
                // server already
                return [4 /*yield*/, fetchAsDiscordBot("guilds/".concat(DISCORD_GUILD_ID, "/members/").concat(discordUser.id), {
                        method: 'PUT',
                        body: JSON.stringify({ access_token: discordToken.access_token }),
                        headers: { 'Content-Type': 'application/json' },
                    })];
                case 1:
                    // there's no harm inviting someone who's already in the server,
                    // so we invite them without bothering to check whether they're in the
                    // server already
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function connectDiscord(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var _c, discordUser, discordToken, discordMember;
        var user = _b.user, code = _b.code, domainUrl = _b.domainUrl;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, getUserToken({ code: code, domainUrl: domainUrl })];
                case 1:
                    _c = _d.sent(), discordUser = _c.discordUser, discordToken = _c.discordToken;
                    return [4 /*yield*/, addUserToDiscordServer(discordUser, discordToken)
                        // give the server bot a little time to handle the new user
                        // it's not a disaster if the bot doesn't manage to handle it
                        // faster, but it's better if the bot adds the right roles etc
                        // before we retrieve the member.
                    ];
                case 2:
                    _d.sent();
                    // give the server bot a little time to handle the new user
                    // it's not a disaster if the bot doesn't manage to handle it
                    // faster, but it's better if the bot adds the right roles etc
                    // before we retrieve the member.
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 300); })];
                case 3:
                    // give the server bot a little time to handle the new user
                    // it's not a disaster if the bot doesn't manage to handle it
                    // faster, but it's better if the bot adds the right roles etc
                    // before we retrieve the member.
                    _d.sent();
                    return [4 /*yield*/, getMember(discordUser.id)];
                case 4:
                    discordMember = _d.sent();
                    if (!('user' in discordMember)) return [3 /*break*/, 6];
                    return [4 /*yield*/, updateDiscordRolesForUser(discordMember, user)];
                case 5:
                    _d.sent();
                    return [3 /*break*/, 7];
                case 6:
                    if ('message' in discordMember) {
                        throw new Error("Discord Error (".concat(discordMember.code, "): ").concat(discordMember.message));
                    }
                    _d.label = 7;
                case 7: return [2 /*return*/, discordMember];
            }
        });
    });
}
