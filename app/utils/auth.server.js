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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionExpirationDate = exports.SESSION_EXPIRATION_TIME = void 0;
exports.getPasswordHash = getPasswordHash;
exports.verifyUserPassword = verifyUserPassword;
exports.loginWithPassword = loginWithPassword;
exports.getUserById = getUserById;
exports.getPasswordHashParts = getPasswordHashParts;
exports.checkIsCommonPassword = checkIsCommonPassword;
exports.signup = signup;
var node_crypto_1 = require("node:crypto");
var bcrypt_1 = require("bcrypt");
var prisma_server_ts_1 = require("./prisma.server.ts");
exports.SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30;
var getSessionExpirationDate = function () {
    return new Date(Date.now() + exports.SESSION_EXPIRATION_TIME);
};
exports.getSessionExpirationDate = getSessionExpirationDate;
function getPasswordHash(password) {
    return __awaiter(this, void 0, void 0, function () {
        var hash;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, bcrypt_1.default.hash(password, 10)];
                case 1:
                    hash = _a.sent();
                    return [2 /*return*/, hash];
            }
        });
    });
}
function verifyUserPassword(password, hash) {
    return __awaiter(this, void 0, void 0, function () {
        var isValid;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, bcrypt_1.default.compare(password, hash)];
                case 1:
                    isValid = _a.sent();
                    return [2 /*return*/, isValid];
            }
        });
    });
}
function loginWithPassword(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var user, isValid;
        var email = _b.email, password = _b.password;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, prisma_server_ts_1.prisma.user.findUnique({
                        where: { email: email },
                        include: { password: { select: { hash: true } } },
                    })];
                case 1:
                    user = _c.sent();
                    if (!user || !user.password) {
                        return [2 /*return*/, null];
                    }
                    return [4 /*yield*/, verifyUserPassword(password, user.password.hash)];
                case 2:
                    isValid = _c.sent();
                    if (!isValid) {
                        return [2 /*return*/, null];
                    }
                    return [2 /*return*/, { user: { id: user.id, email: user.email, firstName: user.firstName } }];
            }
        });
    });
}
function getUserById(id) {
    return __awaiter(this, void 0, void 0, function () {
        var user;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma_server_ts_1.prisma.user.findUnique({
                        where: { id: id },
                        select: { id: true, email: true, firstName: true, team: true },
                    })];
                case 1:
                    user = _a.sent();
                    return [2 /*return*/, user];
            }
        });
    });
}
function getPasswordHashParts(password) {
    var hash = node_crypto_1.default
        .createHash('sha1')
        .update(password, 'utf8')
        .digest('hex')
        .toUpperCase();
    return [hash.slice(0, 5), hash.slice(5)];
}
function checkIsCommonPassword(password) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, prefix, suffix, response, data, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = getPasswordHashParts(password), prefix = _a[0], suffix = _a[1];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetch("https://api.pwnedpasswords.com/range/".concat(prefix), { signal: AbortSignal.timeout(1000) })];
                case 2:
                    response = _b.sent();
                    if (!response.ok)
                        return [2 /*return*/, false];
                    return [4 /*yield*/, response.text()];
                case 3:
                    data = _b.sent();
                    return [2 /*return*/, data.split(/\r?\n/).some(function (line) {
                            var _a = line.split(':'), hashSuffix = _a[0], ignoredPrevalenceCount = _a[1];
                            return hashSuffix === suffix;
                        })];
                case 4:
                    error_1 = _b.sent();
                    if (error_1 instanceof DOMException && error_1.name === 'TimeoutError') {
                        console.warn('Password check timed out');
                        return [2 /*return*/, false];
                    }
                    console.warn('Unknown error during password check', error_1);
                    return [2 /*return*/, false];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function signup(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var hashedPassword, user;
        var email = _b.email, password = _b.password, firstName = _b.firstName, team = _b.team;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, getPasswordHash(password)];
                case 1:
                    hashedPassword = _c.sent();
                    return [4 /*yield*/, prisma_server_ts_1.prisma.user.create({
                            data: {
                                email: email.toLowerCase(),
                                firstName: firstName,
                                team: team,
                            },
                            select: { id: true, email: true, firstName: true, team: true },
                        })
                        // Create password separately
                    ];
                case 2:
                    user = _c.sent();
                    // Create password separately
                    return [4 /*yield*/, prisma_server_ts_1.prisma.password.create({
                            data: {
                                userId: user.id,
                                hash: hashedPassword,
                            },
                        })];
                case 3:
                    // Create password separately
                    _c.sent();
                    return [2 /*return*/, { user: user }];
            }
        });
    });
}
