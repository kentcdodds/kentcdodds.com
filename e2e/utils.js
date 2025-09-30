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
exports.expect = exports.test = void 0;
exports.readEmail = readEmail;
exports.extractUrl = extractUrl;
exports.insertNewUser = insertNewUser;
exports.deleteUserByEmail = deleteUserByEmail;
var path_1 = require("path");
var test_1 = require("@playwright/test");
var client_1 = require("@prisma/client");
var cookie_1 = require("cookie");
var fs_extra_1 = require("fs-extra");
var tiny_invariant_1 = require("tiny-invariant");
require("../app/entry.server.tsx");
var session_server_ts_1 = require("../app/utils/session.server.ts");
var seed_utils_ts_1 = require("../prisma/seed-utils.ts");
function readEmail(recipientOrFilter) {
    return __awaiter(this, void 0, void 0, function () {
        var mswOutput, emails;
        return __generator(this, function (_a) {
            try {
                mswOutput = fs_extra_1.default.readJsonSync(path_1.default.join(process.cwd(), './mocks/msw.local.json'));
                emails = Object.values(mswOutput.email).reverse() // reverse so we get the most recent email first
                ;
                // TODO: add validation
                if (typeof recipientOrFilter === 'string') {
                    return [2 /*return*/, emails.find(function (email) { return email.to === recipientOrFilter; })];
                }
                else {
                    return [2 /*return*/, emails.find(recipientOrFilter)];
                }
            }
            catch (error) {
                console.error("Error reading the email fixture", error);
                return [2 /*return*/, null];
            }
            return [2 /*return*/];
        });
    });
}
function extractUrl(text) {
    var _a;
    var urlRegex = /(?<url>https?:\/\/[^\s$.?#].[^\s]*)/;
    var match = text.match(urlRegex);
    return (_a = match === null || match === void 0 ? void 0 : match.groups) === null || _a === void 0 ? void 0 : _a.url;
}
var users = new Set();
function insertNewUser(userOverrides) {
    return __awaiter(this, void 0, void 0, function () {
        var prisma, user;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = new client_1.PrismaClient();
                    return [4 /*yield*/, prisma.user.create({
                            data: __assign(__assign({}, (0, seed_utils_ts_1.createUser)()), userOverrides),
                        })];
                case 1:
                    user = _a.sent();
                    return [4 /*yield*/, prisma.$disconnect()];
                case 2:
                    _a.sent();
                    users.add(user);
                    return [2 /*return*/, user];
            }
        });
    });
}
function deleteUserByEmail(email) {
    return __awaiter(this, void 0, void 0, function () {
        var prisma;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = new client_1.PrismaClient();
                    return [4 /*yield*/, prisma.user.delete({ where: { email: email } })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, prisma.$disconnect()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.test = test_1.test.extend({
    login: [
        function (_a, use_1) { return __awaiter(void 0, [_a, use_1], void 0, function (_b, use) {
            var page = _b.page, baseURL = _b.baseURL;
            return __generator(this, function (_c) {
                (0, tiny_invariant_1.default)(baseURL, 'baseURL is required playwright config');
                return [2 /*return*/, use(function (userOverrides) { return __awaiter(void 0, void 0, void 0, function () {
                        var user, session, cookieValue, KCD_root_session;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, insertNewUser(userOverrides)];
                                case 1:
                                    user = _a.sent();
                                    return [4 /*yield*/, (0, session_server_ts_1.getSession)(new Request(baseURL))];
                                case 2:
                                    session = _a.sent();
                                    return [4 /*yield*/, session.signIn(user)];
                                case 3:
                                    _a.sent();
                                    return [4 /*yield*/, session.commit()];
                                case 4:
                                    cookieValue = _a.sent();
                                    (0, tiny_invariant_1.default)(cookieValue, 'Something weird happened creating a session for a new user. No cookie value given from session.commit()');
                                    KCD_root_session = (0, cookie_1.parse)(cookieValue).KCD_root_session;
                                    (0, tiny_invariant_1.default)(KCD_root_session, 'No KCD_root_session cookie found');
                                    return [4 /*yield*/, page.context().addCookies([
                                            {
                                                name: 'KCD_root_session',
                                                sameSite: 'Lax',
                                                url: baseURL,
                                                httpOnly: true,
                                                secure: process.env.NODE_ENV === 'production',
                                                value: KCD_root_session,
                                            },
                                        ])];
                                case 5:
                                    _a.sent();
                                    return [2 /*return*/, user];
                            }
                        });
                    }); })];
            });
        }); },
        { auto: true },
    ],
});
exports.expect = exports.test.expect;
exports.test.afterEach(function () { return __awaiter(void 0, void 0, void 0, function () {
    var prisma;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                prisma = new client_1.PrismaClient();
                return [4 /*yield*/, prisma.user.deleteMany({
                        where: { id: { in: __spreadArray([], users, true).map(function (u) { return u.id; }) } },
                    })];
            case 1:
                _a.sent();
                return [4 /*yield*/, prisma.$disconnect()];
            case 2:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
