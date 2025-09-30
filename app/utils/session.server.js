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
exports.getAuthInfoFromOAuthFromRequest = getAuthInfoFromOAuthFromRequest;
exports.getSession = getSession;
exports.deleteOtherSessions = deleteOtherSessions;
exports.getUserSessionFromMagicLink = getUserSessionFromMagicLink;
exports.requireUser = requireUser;
exports.requireAdminUser = requireAdminUser;
exports.getUser = getUser;
exports.sendToken = sendToken;
var node_1 = require("@remix-run/node");
var zod_1 = require("zod");
var litefs_js_server_ts_1 = require("#app/utils/litefs-js.server.ts");
var login_server_ts_1 = require("./login.server.ts");
var misc_tsx_1 = require("./misc.tsx");
var prisma_server_ts_1 = require("./prisma.server.ts");
var send_email_server_ts_1 = require("./send-email.server.ts");
var timing_server_ts_1 = require("./timing.server.ts");
var sessionIdKey = '__session_id__';
var sessionStorage = (0, node_1.createCookieSessionStorage)({
    cookie: {
        name: 'KCD_root_session',
        secure: true,
        secrets: [(0, misc_tsx_1.getRequiredServerEnvVar)('SESSION_SECRET')],
        sameSite: 'lax',
        path: '/',
        maxAge: prisma_server_ts_1.sessionExpirationTime / 1000,
        httpOnly: true,
    },
});
function sendToken(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var magicLink, user;
        var emailAddress = _b.emailAddress, domainUrl = _b.domainUrl;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    magicLink = (0, prisma_server_ts_1.getMagicLink)({
                        emailAddress: emailAddress,
                        validateSessionMagicLink: true,
                        domainUrl: domainUrl,
                    });
                    return [4 /*yield*/, prisma_server_ts_1.prisma.user
                            .findUnique({ where: { email: emailAddress } })
                            .catch(function () {
                            /* ignore... */
                            return null;
                        })];
                case 1:
                    user = _c.sent();
                    return [4 /*yield*/, (0, send_email_server_ts_1.sendMagicLinkEmail)({
                            emailAddress: emailAddress,
                            magicLink: magicLink,
                            user: user,
                            domainUrl: domainUrl,
                        })];
                case 2:
                    _c.sent();
                    return [2 /*return*/, magicLink];
            }
        });
    });
}
function getSession(request) {
    return __awaiter(this, void 0, void 0, function () {
        var session, initialValue, getSessionId, unsetSessionId, commit;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, sessionStorage.getSession(request.headers.get('Cookie'))];
                case 1:
                    session = _a.sent();
                    return [4 /*yield*/, sessionStorage.commitSession(session)];
                case 2:
                    initialValue = _a.sent();
                    getSessionId = function () { return session.get(sessionIdKey); };
                    unsetSessionId = function () { return session.unset(sessionIdKey); };
                    commit = function () { return __awaiter(_this, void 0, void 0, function () {
                        var currentValue;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, sessionStorage.commitSession(session)];
                                case 1:
                                    currentValue = _a.sent();
                                    return [2 /*return*/, currentValue === initialValue ? null : currentValue];
                            }
                        });
                    }); };
                    return [2 /*return*/, {
                            session: session,
                            getUser: function () {
                                var args_1 = [];
                                for (var _i = 0; _i < arguments.length; _i++) {
                                    args_1[_i] = arguments[_i];
                                }
                                return __awaiter(_this, __spreadArray([], args_1, true), void 0, function (_a) {
                                    var token;
                                    var _b = _a === void 0 ? {} : _a, timings = _b.timings;
                                    return __generator(this, function (_c) {
                                        token = getSessionId();
                                        if (!token)
                                            return [2 /*return*/, null];
                                        return [2 /*return*/, (0, prisma_server_ts_1.getUserFromSessionId)(token, { timings: timings }).catch(function (error) {
                                                unsetSessionId();
                                                console.error("Failure getting user from session ID:", error);
                                                return null;
                                            })];
                                    });
                                });
                            },
                            getSessionId: getSessionId,
                            unsetSessionId: unsetSessionId,
                            signIn: function (user) { return __awaiter(_this, void 0, void 0, function () {
                                var userSession;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, (0, prisma_server_ts_1.createSession)({ userId: user.id })];
                                        case 1:
                                            userSession = _a.sent();
                                            session.set(sessionIdKey, userSession.id);
                                            return [2 /*return*/];
                                    }
                                });
                            }); },
                            signOut: function () { return __awaiter(_this, void 0, void 0, function () {
                                var sessionId;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            sessionId = getSessionId();
                                            if (!sessionId) return [3 /*break*/, 2];
                                            return [4 /*yield*/, (0, litefs_js_server_ts_1.ensurePrimary)()];
                                        case 1:
                                            _a.sent();
                                            unsetSessionId();
                                            prisma_server_ts_1.prisma.session
                                                .delete({ where: { id: sessionId } })
                                                .catch(function (error) {
                                                console.error("Failure deleting user session: ", error);
                                            });
                                            _a.label = 2;
                                        case 2: return [2 /*return*/];
                                    }
                                });
                            }); },
                            commit: commit,
                            /**
                             * This will initialize a Headers object if one is not provided.
                             * It will set the 'Set-Cookie' header value on that headers object.
                             * It will then return that Headers object.
                             */
                            getHeaders: function () {
                                var args_1 = [];
                                for (var _i = 0; _i < arguments.length; _i++) {
                                    args_1[_i] = arguments[_i];
                                }
                                return __awaiter(_this, __spreadArray([], args_1, true), void 0, function (headers) {
                                    var value;
                                    if (headers === void 0) { headers = new Headers(); }
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, commit()];
                                            case 1:
                                                value = _a.sent();
                                                if (!value)
                                                    return [2 /*return*/, headers];
                                                if (headers instanceof Headers) {
                                                    headers.append('Set-Cookie', value);
                                                }
                                                else if (Array.isArray(headers)) {
                                                    headers.push(['Set-Cookie', value]);
                                                }
                                                else {
                                                    headers['Set-Cookie'] = value;
                                                }
                                                return [2 /*return*/, headers];
                                        }
                                    });
                                });
                            },
                        }];
            }
        });
    });
}
function deleteOtherSessions(request) {
    return __awaiter(this, void 0, void 0, function () {
        var session, token, user;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getSession(request)];
                case 1:
                    session = (_a.sent()).session;
                    token = session.get(sessionIdKey);
                    if (!token) {
                        console.warn("Trying to delete other sessions, but the request came from someone who has no sessions");
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, (0, prisma_server_ts_1.getUserFromSessionId)(token)];
                case 2:
                    user = _a.sent();
                    return [4 /*yield*/, (0, litefs_js_server_ts_1.ensurePrimary)()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, prisma_server_ts_1.prisma.session.deleteMany({
                            where: { userId: user.id, NOT: { id: token } },
                        })];
                case 4:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function getAuthInfoFromOAuthFromRequest(request) {
    return __awaiter(this, void 0, void 0, function () {
        var authHeader, token, validateUrl, resp, data, _a, _b, userId, clientId, scopes, expiresAt;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    authHeader = request.headers.get('authorization');
                    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer ')))
                        return [2 /*return*/, undefined];
                    token = authHeader.slice('Bearer '.length);
                    validateUrl = 'https://kcd-oauth-provider.kentcdodds.workers.dev/api/validate-token';
                    return [4 /*yield*/, fetch(validateUrl, {
                            headers: { authorization: "Bearer ".concat(token) },
                        })];
                case 1:
                    resp = _c.sent();
                    if (!resp.ok)
                        return [2 /*return*/, undefined];
                    _b = (_a = zod_1.z
                        .object({
                        userId: zod_1.z.string(),
                        clientId: zod_1.z.string().default(''),
                        scopes: zod_1.z.array(zod_1.z.string()).default([]),
                        expiresAt: zod_1.z.number().optional(),
                    }))
                        .parse;
                    return [4 /*yield*/, resp.json()];
                case 2:
                    data = _b.apply(_a, [_c.sent()]);
                    userId = data.userId, clientId = data.clientId, scopes = data.scopes, expiresAt = data.expiresAt;
                    return [2 /*return*/, {
                            token: token,
                            clientId: clientId,
                            scopes: scopes,
                            expiresAt: expiresAt,
                            extra: { userId: userId },
                        }];
            }
        });
    });
}
function getUser(request_1) {
    return __awaiter(this, arguments, void 0, function (request, _a) {
        var authInfo, session, token;
        var _b = _a === void 0 ? {} : _a, timings = _b.timings;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, timing_server_ts_1.time)(getAuthInfoFromOAuthFromRequest(request), {
                        timings: timings,
                        type: 'getAuthInfoFromOAuthFromRequest',
                    })];
                case 1:
                    authInfo = _c.sent();
                    if (authInfo === null || authInfo === void 0 ? void 0 : authInfo.extra.userId) {
                        return [2 /*return*/, prisma_server_ts_1.prisma.user.findUnique({ where: { id: authInfo.extra.userId } })];
                    }
                    return [4 /*yield*/, getSession(request)];
                case 2:
                    session = (_c.sent()).session;
                    token = session.get(sessionIdKey);
                    if (!token)
                        return [2 /*return*/, null];
                    return [2 /*return*/, (0, prisma_server_ts_1.getUserFromSessionId)(token, { timings: timings }).catch(function (error) {
                            console.error("Failure getting user from session ID:", error);
                            return null;
                        })];
            }
        });
    });
}
function getUserSessionFromMagicLink(request) {
    return __awaiter(this, void 0, void 0, function () {
        var loginInfoSession, email, user, session;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, login_server_ts_1.getLoginInfoSession)(request)];
                case 1:
                    loginInfoSession = _a.sent();
                    return [4 /*yield*/, (0, prisma_server_ts_1.validateMagicLink)(request.url, loginInfoSession.getMagicLink())];
                case 2:
                    email = _a.sent();
                    return [4 /*yield*/, prisma_server_ts_1.prisma.user.findUnique({ where: { email: email } })];
                case 3:
                    user = _a.sent();
                    if (!user)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, getSession(request)];
                case 4:
                    session = _a.sent();
                    return [4 /*yield*/, session.signIn(user)];
                case 5:
                    _a.sent();
                    return [2 /*return*/, session];
            }
        });
    });
}
function requireAdminUser(request) {
    return __awaiter(this, void 0, void 0, function () {
        var user, session, _a, _b;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, getUser(request)];
                case 1:
                    user = _d.sent();
                    if (!!user) return [3 /*break*/, 5];
                    return [4 /*yield*/, getSession(request)];
                case 2:
                    session = _d.sent();
                    return [4 /*yield*/, session.signOut()];
                case 3:
                    _d.sent();
                    _a = node_1.redirect;
                    _b = ['/login'];
                    _c = {};
                    return [4 /*yield*/, session.getHeaders()];
                case 4: throw _a.apply(void 0, _b.concat([(_c.headers = _d.sent(), _c)]));
                case 5:
                    if (user.role !== 'ADMIN') {
                        throw (0, node_1.redirect)('/');
                    }
                    return [2 /*return*/, user];
            }
        });
    });
}
function requireUser(request_1) {
    return __awaiter(this, arguments, void 0, function (request, _a) {
        var user, session, _b, _c;
        var _d;
        var _e = _a === void 0 ? {} : _a, timings = _e.timings;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0: return [4 /*yield*/, getUser(request, { timings: timings })];
                case 1:
                    user = _f.sent();
                    if (!!user) return [3 /*break*/, 5];
                    return [4 /*yield*/, getSession(request)];
                case 2:
                    session = _f.sent();
                    return [4 /*yield*/, session.signOut()];
                case 3:
                    _f.sent();
                    _b = node_1.redirect;
                    _c = ['/login'];
                    _d = {};
                    return [4 /*yield*/, session.getHeaders()];
                case 4: throw _b.apply(void 0, _c.concat([(_d.headers = _f.sent(), _d)]));
                case 5: return [2 /*return*/, user];
            }
        });
    });
}
