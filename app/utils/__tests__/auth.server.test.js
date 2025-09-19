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
var vitest_1 = require("vitest");
var bcrypt_1 = require("bcrypt");
var prisma_server_ts_1 = require("../prisma.server.ts");
var auth_server_ts_1 = require("../auth.server.ts");
// Mock the prisma client
vitest_1.vi.mock('../prisma.server.ts', function () { return ({
    prisma: {
        user: {
            findUnique: vitest_1.vi.fn(),
            create: vitest_1.vi.fn(),
        },
        password: {
            create: vitest_1.vi.fn(),
        },
    },
}); });
// Mock fetch for pwned passwords API
var mockFetch = vitest_1.vi.fn();
vitest_1.vi.stubGlobal('fetch', mockFetch);
(0, vitest_1.describe)('auth.server', function () {
    (0, vitest_1.beforeEach)(function () {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('getPasswordHash', function () {
        (0, vitest_1.test)('hashes password with bcrypt', function () { return __awaiter(void 0, void 0, void 0, function () {
            var password, hash, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        password = 'test-password-123';
                        return [4 /*yield*/, (0, auth_server_ts_1.getPasswordHash)(password)];
                    case 1:
                        hash = _b.sent();
                        (0, vitest_1.expect)(hash).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt hash format
                        _a = vitest_1.expect;
                        return [4 /*yield*/, bcrypt_1.default.compare(password, hash)];
                    case 2:
                        _a.apply(void 0, [_b.sent()]).toBe(true);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.test)('generates different hashes for same password', function () { return __awaiter(void 0, void 0, void 0, function () {
            var password, hash1, hash2, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        password = 'test-password-123';
                        return [4 /*yield*/, (0, auth_server_ts_1.getPasswordHash)(password)];
                    case 1:
                        hash1 = _c.sent();
                        return [4 /*yield*/, (0, auth_server_ts_1.getPasswordHash)(password)];
                    case 2:
                        hash2 = _c.sent();
                        (0, vitest_1.expect)(hash1).not.toBe(hash2);
                        _a = vitest_1.expect;
                        return [4 /*yield*/, bcrypt_1.default.compare(password, hash1)];
                    case 3:
                        _a.apply(void 0, [_c.sent()]).toBe(true);
                        _b = vitest_1.expect;
                        return [4 /*yield*/, bcrypt_1.default.compare(password, hash2)];
                    case 4:
                        _b.apply(void 0, [_c.sent()]).toBe(true);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)('verifyUserPassword', function () {
        (0, vitest_1.test)('returns true for correct password', function () { return __awaiter(void 0, void 0, void 0, function () {
            var password, hash, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        password = 'correct-password';
                        return [4 /*yield*/, bcrypt_1.default.hash(password, 10)];
                    case 1:
                        hash = _a.sent();
                        return [4 /*yield*/, (0, auth_server_ts_1.verifyUserPassword)(password, hash)];
                    case 2:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toBe(true);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.test)('returns false for incorrect password', function () { return __awaiter(void 0, void 0, void 0, function () {
            var correctPassword, wrongPassword, hash, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        correctPassword = 'correct-password';
                        wrongPassword = 'wrong-password';
                        return [4 /*yield*/, bcrypt_1.default.hash(correctPassword, 10)];
                    case 1:
                        hash = _a.sent();
                        return [4 /*yield*/, (0, auth_server_ts_1.verifyUserPassword)(wrongPassword, hash)];
                    case 2:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toBe(false);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)('loginWithPassword', function () {
        (0, vitest_1.test)('returns user data for valid credentials', function () { return __awaiter(void 0, void 0, void 0, function () {
            var email, password, hash, mockUser, mockPassword, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = 'test@example.com';
                        password = 'test-password';
                        return [4 /*yield*/, bcrypt_1.default.hash(password, 10)];
                    case 1:
                        hash = _a.sent();
                        mockUser = {
                            id: 'user-1',
                            email: email,
                            firstName: 'Test',
                        };
                        mockPassword = {
                            hash: hash,
                            userId: 'user-1',
                        };
                        vitest_1.vi.mocked(prisma_server_ts_1.prisma.user.findUnique).mockResolvedValueOnce(__assign(__assign({}, mockUser), { password: mockPassword }));
                        return [4 /*yield*/, (0, auth_server_ts_1.loginWithPassword)({ email: email, password: password })];
                    case 2:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toEqual({
                            user: mockUser,
                        });
                        (0, vitest_1.expect)(prisma_server_ts_1.prisma.user.findUnique).toHaveBeenCalledWith({
                            where: { email: email },
                            include: { password: { select: { hash: true } } },
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.test)('returns null for non-existent user', function () { return __awaiter(void 0, void 0, void 0, function () {
            var email, password, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = 'nonexistent@example.com';
                        password = 'test-password';
                        vitest_1.vi.mocked(prisma_server_ts_1.prisma.user.findUnique).mockResolvedValueOnce(null);
                        return [4 /*yield*/, (0, auth_server_ts_1.loginWithPassword)({ email: email, password: password })];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toBeNull();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.test)('returns null for user without password', function () { return __awaiter(void 0, void 0, void 0, function () {
            var email, password, mockUser, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = 'test@example.com';
                        password = 'test-password';
                        mockUser = {
                            id: 'user-1',
                            email: email,
                            firstName: 'Test',
                            password: null,
                        };
                        vitest_1.vi.mocked(prisma_server_ts_1.prisma.user.findUnique).mockResolvedValueOnce(mockUser);
                        return [4 /*yield*/, (0, auth_server_ts_1.loginWithPassword)({ email: email, password: password })];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toBeNull();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.test)('returns null for incorrect password', function () { return __awaiter(void 0, void 0, void 0, function () {
            var email, correctPassword, wrongPassword, hash, mockUser, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        email = 'test@example.com';
                        correctPassword = 'correct-password';
                        wrongPassword = 'wrong-password';
                        return [4 /*yield*/, bcrypt_1.default.hash(correctPassword, 10)];
                    case 1:
                        hash = _a.sent();
                        mockUser = {
                            id: 'user-1',
                            email: email,
                            firstName: 'Test',
                            password: { hash: hash },
                        };
                        vitest_1.vi.mocked(prisma_server_ts_1.prisma.user.findUnique).mockResolvedValueOnce(mockUser);
                        return [4 /*yield*/, (0, auth_server_ts_1.loginWithPassword)({
                                email: email,
                                password: wrongPassword,
                            })];
                    case 2:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toBeNull();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)('signup', function () {
        (0, vitest_1.test)('creates user with hashed password', function () { return __awaiter(void 0, void 0, void 0, function () {
            var userData, mockUser, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        userData = {
                            email: 'test@example.com',
                            password: 'test-password',
                            firstName: 'Test',
                            team: 'BLUE',
                        };
                        mockUser = {
                            id: 'user-1',
                            email: userData.email,
                            firstName: userData.firstName,
                            team: userData.team,
                        };
                        vitest_1.vi.mocked(prisma_server_ts_1.prisma.user.create).mockResolvedValueOnce(mockUser);
                        vitest_1.vi.mocked(prisma_server_ts_1.prisma.password.create).mockResolvedValueOnce({
                            userId: 'user-1',
                            hash: 'hashed-password',
                        });
                        return [4 /*yield*/, (0, auth_server_ts_1.signup)(userData)];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toEqual({
                            user: mockUser,
                        });
                        (0, vitest_1.expect)(prisma_server_ts_1.prisma.user.create).toHaveBeenCalledWith({
                            data: {
                                email: userData.email,
                                firstName: userData.firstName,
                                team: userData.team,
                            },
                        });
                        (0, vitest_1.expect)(prisma_server_ts_1.prisma.password.create).toHaveBeenCalledWith({
                            data: {
                                userId: 'user-1',
                                hash: vitest_1.expect.stringMatching(/^\$2[ayb]\$.{56}$/),
                            },
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.test)('throws error if user creation fails', function () { return __awaiter(void 0, void 0, void 0, function () {
            var userData, error;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        userData = {
                            email: 'test@example.com',
                            password: 'test-password',
                            firstName: 'Test',
                            team: 'BLUE',
                        };
                        error = new Error('User creation failed');
                        vitest_1.vi.mocked(prisma_server_ts_1.prisma.user.create).mockRejectedValueOnce(error);
                        return [4 /*yield*/, (0, vitest_1.expect)((0, auth_server_ts_1.signup)(userData)).rejects.toThrow('User creation failed')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)('checkIsCommonPassword', function () {
        (0, vitest_1.test)('returns true when password is found in breach database', function () { return __awaiter(void 0, void 0, void 0, function () {
            var password, _a, prefix, suffix, result;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        password = 'testpassword';
                        _a = (0, auth_server_ts_1.getPasswordHashParts)(password), prefix = _a[0], suffix = _a[1];
                        mockFetch.mockResolvedValueOnce({
                            ok: true,
                            text: function () {
                                return Promise.resolve("1234567890123456789012345678901234A:1\n".concat(suffix, ":1234"));
                            },
                        });
                        return [4 /*yield*/, (0, auth_server_ts_1.checkIsCommonPassword)(password)];
                    case 1:
                        result = _b.sent();
                        (0, vitest_1.expect)(result).toBe(true);
                        (0, vitest_1.expect)(mockFetch).toHaveBeenCalledWith("https://api.pwnedpasswords.com/range/".concat(prefix), { signal: vitest_1.expect.any(AbortSignal) });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.test)('returns false when password is not found in breach database', function () { return __awaiter(void 0, void 0, void 0, function () {
            var password, prefix, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        password = 'sup3r-dup3r-s3cret';
                        prefix = (0, auth_server_ts_1.getPasswordHashParts)(password)[0];
                        mockFetch.mockResolvedValueOnce({
                            ok: true,
                            text: function () {
                                return Promise.resolve('1234567890123456789012345678901234A:1\n' +
                                    '1234567890123456789012345678901234B:2');
                            },
                        });
                        return [4 /*yield*/, (0, auth_server_ts_1.checkIsCommonPassword)(password)];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toBe(false);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.test)('returns false when API returns 500', function () { return __awaiter(void 0, void 0, void 0, function () {
            var password, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        password = 'testpassword';
                        mockFetch.mockResolvedValueOnce({
                            ok: false,
                            status: 500,
                        });
                        return [4 /*yield*/, (0, auth_server_ts_1.checkIsCommonPassword)(password)];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toBe(false);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.test)('returns false when request times out', function () { return __awaiter(void 0, void 0, void 0, function () {
            var password, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        password = 'testpassword';
                        mockFetch.mockRejectedValueOnce(new Error('AbortError'));
                        return [4 /*yield*/, (0, auth_server_ts_1.checkIsCommonPassword)(password)];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toBe(false);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.test)('returns false when network error occurs', function () { return __awaiter(void 0, void 0, void 0, function () {
            var password, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        password = 'testpassword';
                        mockFetch.mockRejectedValueOnce(new Error('Network error'));
                        return [4 /*yield*/, (0, auth_server_ts_1.checkIsCommonPassword)(password)];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toBe(false);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)('getPasswordHashParts', function () {
        (0, vitest_1.test)('returns correct prefix and suffix for known password', function () {
            // Using a password with known SHA-1 hash for testing
            var password = 'password';
            var _a = (0, auth_server_ts_1.getPasswordHashParts)(password), prefix = _a[0], suffix = _a[1];
            (0, vitest_1.expect)(prefix).toHaveLength(5);
            (0, vitest_1.expect)(suffix).toHaveLength(35);
            (0, vitest_1.expect)(prefix + suffix).toHaveLength(40); // Full SHA-1 hash length
        });
        (0, vitest_1.test)('generates consistent hash parts for same password', function () {
            var password = 'test-password-123';
            var _a = (0, auth_server_ts_1.getPasswordHashParts)(password), prefix1 = _a[0], suffix1 = _a[1];
            var _b = (0, auth_server_ts_1.getPasswordHashParts)(password), prefix2 = _b[0], suffix2 = _b[1];
            (0, vitest_1.expect)(prefix1).toBe(prefix2);
            (0, vitest_1.expect)(suffix1).toBe(suffix2);
        });
        (0, vitest_1.test)('generates different hash parts for different passwords', function () {
            var password1 = 'password1';
            var password2 = 'password2';
            var _a = (0, auth_server_ts_1.getPasswordHashParts)(password1), prefix1 = _a[0], suffix1 = _a[1];
            var _b = (0, auth_server_ts_1.getPasswordHashParts)(password2), prefix2 = _b[0], suffix2 = _b[1];
            (0, vitest_1.expect)(prefix1).not.toBe(prefix2);
            (0, vitest_1.expect)(suffix1).not.toBe(suffix2);
        });
    });
});
