"use strict";
// This just allows us to track individual clients so we can keep track of
// the posts they've read and make useful suggestions even if they're not logged in.
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
exports.getClientSession = getClientSession;
var node_1 = require("@remix-run/node");
var uuid = require("uuid");
var misc_tsx_1 = require("./misc.tsx");
var clientStorage = (0, node_1.createCookieSessionStorage)({
    cookie: {
        name: 'KCD_client_id',
        secure: true,
        secrets: [(0, misc_tsx_1.getRequiredServerEnvVar)('SESSION_SECRET')],
        sameSite: 'lax',
        path: '/',
        httpOnly: true,
    },
});
function getClientSession(request, user) {
    return __awaiter(this, void 0, void 0, function () {
        function commit() {
            return __awaiter(this, void 0, void 0, function () {
                var value, currentValue;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!user) return [3 /*break*/, 4];
                            if (!initialValue) return [3 /*break*/, 2];
                            return [4 /*yield*/, clientStorage.destroySession(session)];
                        case 1:
                            value = _a.sent();
                            return [2 /*return*/, value];
                        case 2: return [2 /*return*/, null];
                        case 3: return [3 /*break*/, 6];
                        case 4: return [4 /*yield*/, clientStorage.commitSession(session, {
                                expires: expires,
                            })];
                        case 5:
                            currentValue = _a.sent();
                            return [2 /*return*/, currentValue === initialValue ? null : currentValue];
                        case 6: return [2 /*return*/];
                    }
                });
            });
        }
        function getClientId() {
            if (user)
                return null;
            var clientId = session.get('clientId');
            if (typeof clientId === 'string')
                return clientId;
            clientId = uuid.v4();
            session.set('clientId', clientId);
            return clientId;
        }
        var session, expires, initialValue, _a;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, clientStorage.getSession(request.headers.get('Cookie'))
                    // no client ID for you on my 100th birthday! 😂
                ];
                case 1:
                    session = _b.sent();
                    expires = new Date('2088-10-18');
                    if (!user) return [3 /*break*/, 2];
                    _a = null;
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, clientStorage.commitSession(session, { expires: expires })];
                case 3:
                    _a = _b.sent();
                    _b.label = 4;
                case 4:
                    initialValue = _a;
                    // get the clientId set if it's not already
                    getClientId();
                    return [2 /*return*/, {
                            getClientId: getClientId,
                            commit: commit,
                            setUser: function (usr) {
                                user = usr;
                            },
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
