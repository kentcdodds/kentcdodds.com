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
exports.sessionExpirationTime = exports.prisma = exports.linkExpirationTime = void 0;
exports.addPostRead = addPostRead;
exports.createSession = createSession;
exports.getAllUserData = getAllUserData;
exports.getMagicLink = getMagicLink;
exports.getUserFromSessionId = getUserFromSessionId;
exports.validateMagicLink = validateMagicLink;
var remember_1 = require("@epic-web/remember");
var client_1 = require("@prisma/client");
var chalk_1 = require("chalk");
var p_props_1 = require("p-props");
var litefs_js_server_ts_1 = require("#app/utils/litefs-js.server.ts");
var encryption_server_ts_1 = require("./encryption.server.ts");
var timing_server_ts_1 = require("./timing.server.ts");
var logThreshold = 500;
var prisma = (0, remember_1.remember)('prisma', getClient);
exports.prisma = prisma;
function getClient() {
    var _this = this;
    // NOTE: during development if you change anything in this function, remember
    // that this only runs once per server restart and won't automatically be
    // re-run per request like everything else is.
    var client = new client_1.PrismaClient({
        log: [
            { level: 'query', emit: 'event' },
            { level: 'error', emit: 'stdout' },
            { level: 'info', emit: 'stdout' },
            { level: 'warn', emit: 'stdout' },
        ],
    });
    client.$on('query', function (e) { return __awaiter(_this, void 0, void 0, function () {
        var color, dur;
        return __generator(this, function (_a) {
            if (e.duration < logThreshold)
                return [2 /*return*/];
            color = e.duration < logThreshold * 1.1
                ? 'green'
                : e.duration < logThreshold * 1.2
                    ? 'blue'
                    : e.duration < logThreshold * 1.3
                        ? 'yellow'
                        : e.duration < logThreshold * 1.4
                            ? 'redBright'
                            : 'red';
            dur = chalk_1.default[color]("".concat(e.duration, "ms"));
            console.info("prisma:query - ".concat(dur, " - ").concat(e.query));
            return [2 /*return*/];
        });
    }); });
    // make the connection eagerly so the first request doesn't have to wait
    void client.$connect();
    return client;
}
var linkExpirationTime = 1000 * 60 * 30;
exports.linkExpirationTime = linkExpirationTime;
var sessionExpirationTime = 1000 * 60 * 60 * 24 * 365;
exports.sessionExpirationTime = sessionExpirationTime;
var magicLinkSearchParam = 'kodyKey';
function getMagicLink(_a) {
    var emailAddress = _a.emailAddress, validateSessionMagicLink = _a.validateSessionMagicLink, domainUrl = _a.domainUrl;
    var payload = {
        emailAddress: emailAddress,
        validateSessionMagicLink: validateSessionMagicLink,
        creationDate: new Date().toISOString(),
    };
    var stringToEncrypt = JSON.stringify(payload);
    var encryptedString = (0, encryption_server_ts_1.encrypt)(stringToEncrypt);
    var url = new URL(domainUrl);
    url.pathname = 'magic';
    url.searchParams.set(magicLinkSearchParam, encryptedString);
    return url.toString();
}
function getMagicLinkCode(link) {
    var _a;
    try {
        var url = new URL(link);
        return (_a = url.searchParams.get(magicLinkSearchParam)) !== null && _a !== void 0 ? _a : '';
    }
    catch (_b) {
        return '';
    }
}
function validateMagicLink(link, sessionMagicLink) {
    return __awaiter(this, void 0, void 0, function () {
        var linkCode, sessionLinkCode, emailAddress, linkCreationDateString, validateSessionMagicLink, decryptedString, payload, linkCreationDate, expirationTime;
        return __generator(this, function (_a) {
            linkCode = getMagicLinkCode(link);
            sessionLinkCode = sessionMagicLink
                ? getMagicLinkCode(sessionMagicLink)
                : null;
            try {
                decryptedString = (0, encryption_server_ts_1.decrypt)(linkCode);
                payload = JSON.parse(decryptedString);
                emailAddress = payload.emailAddress;
                linkCreationDateString = payload.creationDate;
                validateSessionMagicLink = payload.validateSessionMagicLink;
            }
            catch (error) {
                console.error(error);
                throw new Error('Sign in link invalid (link payload is invalid). Please request a new one.');
            }
            if (typeof emailAddress !== 'string') {
                console.error("Email is not a string. Maybe wasn't set in the session?");
                throw new Error('Sign in link invalid (email is not a string). Please request a new one.');
            }
            if (validateSessionMagicLink) {
                if (!sessionLinkCode) {
                    console.error('Must validate session magic link but no session link provided');
                    throw new Error('Sign in link invalid. No link validation cookie was found (does your browser block cookies or did you open the link in a different browser?). Please request a new link.');
                }
                if (linkCode !== sessionLinkCode) {
                    console.error("Magic link does not match sessionMagicLink");
                    throw new Error("You must open the magic link on the same device it was created from for security reasons. Please request a new link.");
                }
            }
            if (typeof linkCreationDateString !== 'string') {
                console.error('Link expiration is not a string.');
                throw new Error('Sign in link invalid (link expiration is not a string). Please request a new one.');
            }
            linkCreationDate = new Date(linkCreationDateString);
            expirationTime = linkCreationDate.getTime() + linkExpirationTime;
            if (Date.now() > expirationTime) {
                throw new Error('Magic link expired. Please request a new one.');
            }
            return [2 /*return*/, emailAddress];
        });
    });
}
function createSession(sessionData) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, litefs_js_server_ts_1.ensurePrimary)()];
                case 1:
                    _a.sent();
                    return [2 /*return*/, prisma.session.create({
                            data: __assign(__assign({}, sessionData), { expirationDate: new Date(Date.now() + sessionExpirationTime) }),
                        })];
            }
        });
    });
}
function getUserFromSessionId(sessionId_1) {
    return __awaiter(this, arguments, void 0, function (sessionId, _a) {
        var session, twoWeeks, newExpirationDate;
        var _b = _a === void 0 ? {} : _a, timings = _b.timings;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, timing_server_ts_1.time)(prisma.session.findUnique({
                        where: { id: sessionId },
                        include: { user: true },
                    }), { timings: timings, type: 'getUserFromSessionId' })];
                case 1:
                    session = _c.sent();
                    if (!session) {
                        throw new Error('No user found');
                    }
                    if (!(Date.now() > session.expirationDate.getTime())) return [3 /*break*/, 4];
                    return [4 /*yield*/, (0, litefs_js_server_ts_1.ensurePrimary)()];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, prisma.session.delete({ where: { id: sessionId } })];
                case 3:
                    _c.sent();
                    throw new Error('Session expired. Please request a new magic link.');
                case 4:
                    twoWeeks = 1000 * 60 * 60 * 24 * 30 * 6;
                    if (!(Date.now() + twoWeeks > session.expirationDate.getTime())) return [3 /*break*/, 7];
                    return [4 /*yield*/, (0, litefs_js_server_ts_1.ensurePrimary)()];
                case 5:
                    _c.sent();
                    newExpirationDate = new Date(Date.now() + sessionExpirationTime);
                    return [4 /*yield*/, prisma.session.update({
                            data: { expirationDate: newExpirationDate },
                            where: { id: sessionId },
                        })];
                case 6:
                    _c.sent();
                    _c.label = 7;
                case 7: return [2 /*return*/, session.user];
            }
        });
    });
}
function getAllUserData(userId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, (0, p_props_1.default)({
                    user: prisma.user.findUnique({ where: { id: userId } }),
                    calls: prisma.call.findMany({ where: { userId: userId } }),
                    postReads: prisma.postRead.findMany({ where: { userId: userId } }),
                    sessions: prisma.session.findMany({ where: { userId: userId } }),
                })];
        });
    });
}
function addPostRead(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var id, readInLastWeek, postRead;
        var slug = _b.slug, userId = _b.userId, clientId = _b.clientId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    id = userId ? { userId: userId } : { clientId: clientId };
                    return [4 /*yield*/, prisma.postRead.findFirst({
                            select: { id: true },
                            where: __assign(__assign({}, id), { postSlug: slug, createdAt: { gt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) } }),
                        })];
                case 1:
                    readInLastWeek = _c.sent();
                    if (!readInLastWeek) return [3 /*break*/, 2];
                    return [2 /*return*/, null];
                case 2: return [4 /*yield*/, prisma.postRead.create({
                        data: __assign({ postSlug: slug }, id),
                        select: { id: true },
                    })];
                case 3:
                    postRead = _c.sent();
                    return [2 /*return*/, postRead];
            }
        });
    });
}
