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
var vitest_1 = require("vitest");
var prisma_server_ts_1 = require("../prisma.server.ts");
var verification_server_ts_1 = require("../verification.server.ts");
// Mock the prisma client
vitest_1.vi.mock('../prisma.server.ts', function () { return ({
    prisma: {
        verification: {
            create: vitest_1.vi.fn(),
            findFirst: vitest_1.vi.fn(),
            delete: vitest_1.vi.fn(),
            deleteMany: vitest_1.vi.fn(),
        },
    },
}); });
// Mock the session storage
vitest_1.vi.mock('@remix-run/node', function () { return ({
    createCookieSessionStorage: vitest_1.vi.fn(function () { return ({
        getSession: vitest_1.vi.fn(),
        commitSession: vitest_1.vi.fn(),
        destroySession: vitest_1.vi.fn(),
    }); }),
}); });
// Mock URL constructor for testing
var mockRequest = {
    url: 'https://example.com/test',
};
(0, vitest_1.describe)('verification.server', function () {
    (0, vitest_1.beforeEach)(function () {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('prepareVerification', function () {
        (0, vitest_1.test)('creates verification record and returns verify URL', function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockVerification, result, verifyUrl;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockVerification = {
                            id: 'verification-123',
                            type: 'reset-password',
                            target: 'test@example.com',
                            secret: '123456',
                            expiresAt: new Date(Date.now() + 600000),
                        };
                        vitest_1.vi.mocked(prisma_server_ts_1.prisma.verification.deleteMany).mockResolvedValueOnce({
                            count: 0,
                        });
                        vitest_1.vi.mocked(prisma_server_ts_1.prisma.verification.create).mockResolvedValueOnce(mockVerification);
                        return [4 /*yield*/, (0, verification_server_ts_1.prepareVerification)({
                                period: 600,
                                request: mockRequest,
                                type: 'reset-password',
                                target: 'test@example.com',
                            })];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toEqual({
                            otp: vitest_1.expect.stringMatching(/^\d{6}$/),
                            verifyUrl: vitest_1.expect.any(URL),
                            redirectTo: vitest_1.expect.any(URL),
                        });
                        verifyUrl = result.verifyUrl;
                        (0, vitest_1.expect)(verifyUrl.pathname).toBe('/verify');
                        (0, vitest_1.expect)(verifyUrl.searchParams.get('code')).toMatch(/^\d{6}$/);
                        (0, vitest_1.expect)(verifyUrl.searchParams.get('type')).toBe('reset-password');
                        (0, vitest_1.expect)(verifyUrl.searchParams.get('target')).toBe('test@example.com');
                        (0, vitest_1.expect)(prisma_server_ts_1.prisma.verification.deleteMany).toHaveBeenCalledWith({
                            where: { target: 'test@example.com', type: 'reset-password' },
                        });
                        (0, vitest_1.expect)(prisma_server_ts_1.prisma.verification.create).toHaveBeenCalledWith({
                            data: {
                                type: 'reset-password',
                                target: 'test@example.com',
                                secret: vitest_1.expect.stringMatching(/^\d{6}$/), // 6-digit code
                                algorithm: 'SHA256',
                                digits: 6,
                                period: 600,
                                charSet: '0123456789',
                                expiresAt: vitest_1.expect.any(Date),
                            },
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.test)('generates different codes for different requests', function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockVerification1, mockVerification2, result1, result2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockVerification1 = {
                            id: 'verification-1',
                            type: 'reset-password',
                            target: 'test1@example.com',
                            secret: '123456',
                            expiresAt: new Date(Date.now() + 600000),
                        };
                        mockVerification2 = {
                            id: 'verification-2',
                            type: 'reset-password',
                            target: 'test2@example.com',
                            secret: '654321',
                            expiresAt: new Date(Date.now() + 600000),
                        };
                        vitest_1.vi.mocked(prisma_server_ts_1.prisma.verification.create)
                            .mockResolvedValueOnce(mockVerification1)
                            .mockResolvedValueOnce(mockVerification2);
                        return [4 /*yield*/, (0, verification_server_ts_1.prepareVerification)({
                                period: 600,
                                request: mockRequest,
                                type: 'reset-password',
                                target: 'test1@example.com',
                            })];
                    case 1:
                        result1 = _a.sent();
                        return [4 /*yield*/, (0, verification_server_ts_1.prepareVerification)({
                                period: 600,
                                request: mockRequest,
                                type: 'reset-password',
                                target: 'test2@example.com',
                            })];
                    case 2:
                        result2 = _a.sent();
                        (0, vitest_1.expect)(result1.verifyUrl.searchParams.get('code')).toBe('123456');
                        (0, vitest_1.expect)(result2.verifyUrl.searchParams.get('code')).toBe('654321');
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.test)('sets correct expiration time based on period', function () { return __awaiter(void 0, void 0, void 0, function () {
            var period, beforeTime, afterTime, createCall, expiresAt;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        period = 300 // 5 minutes
                        ;
                        beforeTime = Date.now();
                        vitest_1.vi.mocked(prisma_server_ts_1.prisma.verification.create).mockResolvedValueOnce({
                            id: 'verification-123',
                            type: 'reset-password',
                            target: 'test@example.com',
                            secret: '123456',
                            expiresAt: new Date(beforeTime + period * 1000),
                        });
                        return [4 /*yield*/, (0, verification_server_ts_1.prepareVerification)({
                                period: period,
                                request: mockRequest,
                                type: 'reset-password',
                                target: 'test@example.com',
                            })];
                    case 1:
                        _a.sent();
                        afterTime = Date.now();
                        createCall = vitest_1.vi.mocked(prisma_server_ts_1.prisma.verification.create).mock.calls[0][0];
                        expiresAt = createCall.data.expiresAt.getTime();
                        // Allow for some timing variance (within 1 second)
                        (0, vitest_1.expect)(expiresAt).toBeGreaterThanOrEqual(beforeTime + period * 1000);
                        (0, vitest_1.expect)(expiresAt).toBeLessThanOrEqual(afterTime + period * 1000);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)('isCodeValid', function () {
        (0, vitest_1.test)('returns true for valid, non-expired code', function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockVerification, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockVerification = {
                            id: 'verification-123',
                            type: 'reset-password',
                            target: 'test@example.com',
                            secret: '123456',
                            expiresAt: new Date(Date.now() + 600000), // 10 minutes from now
                        };
                        vitest_1.vi.mocked(prisma_server_ts_1.prisma.verification.findFirst).mockResolvedValueOnce(mockVerification);
                        vitest_1.vi.mocked(prisma_server_ts_1.prisma.verification.delete).mockResolvedValueOnce(mockVerification);
                        return [4 /*yield*/, (0, verification_server_ts_1.isCodeValid)({
                                code: '123456',
                                type: 'reset-password',
                                target: 'test@example.com',
                            })];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toBe(true);
                        (0, vitest_1.expect)(prisma_server_ts_1.prisma.verification.findFirst).toHaveBeenCalledWith({
                            where: {
                                target: 'test@example.com',
                                type: 'reset-password',
                                expiresAt: { gt: vitest_1.expect.any(Date) },
                            },
                            select: {
                                id: true,
                                secret: true,
                                expiresAt: true,
                            },
                        });
                        (0, vitest_1.expect)(prisma_server_ts_1.prisma.verification.delete).toHaveBeenCalledWith({
                            where: { id: 'verification-123' },
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.test)('returns false for non-existent code', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        vitest_1.vi.mocked(prisma_server_ts_1.prisma.verification.findFirst).mockResolvedValueOnce(null);
                        return [4 /*yield*/, (0, verification_server_ts_1.isCodeValid)({
                                code: '999999',
                                type: 'reset-password',
                                target: 'test@example.com',
                            })];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toBe(false);
                        (0, vitest_1.expect)(prisma_server_ts_1.prisma.verification.delete).not.toHaveBeenCalled();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.test)('returns false for expired code', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // The query includes expiresAt: { gt: new Date() }, so expired codes won't be found
                        vitest_1.vi.mocked(prisma_server_ts_1.prisma.verification.findFirst).mockResolvedValueOnce(null);
                        return [4 /*yield*/, (0, verification_server_ts_1.isCodeValid)({
                                code: '123456',
                                type: 'reset-password',
                                target: 'test@example.com',
                            })];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toBe(false);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.test)('returns false for wrong type', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        vitest_1.vi.mocked(prisma_server_ts_1.prisma.verification.findFirst).mockResolvedValueOnce(null);
                        return [4 /*yield*/, (0, verification_server_ts_1.isCodeValid)({
                                code: '123456',
                                type: 'onboarding',
                                target: 'test@example.com',
                            })];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toBe(false);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.test)('returns false for wrong target', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        vitest_1.vi.mocked(prisma_server_ts_1.prisma.verification.findFirst).mockResolvedValueOnce(null);
                        return [4 /*yield*/, (0, verification_server_ts_1.isCodeValid)({
                                code: '123456',
                                type: 'reset-password',
                                target: 'wrong@example.com',
                            })];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toBe(false);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, vitest_1.test)('handles database errors gracefully', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        vitest_1.vi.mocked(prisma_server_ts_1.prisma.verification.findFirst).mockRejectedValueOnce(new Error('Database error'));
                        return [4 /*yield*/, (0, verification_server_ts_1.isCodeValid)({
                                code: '123456',
                                type: 'reset-password',
                                target: 'test@example.com',
                            })];
                    case 1:
                        result = _a.sent();
                        (0, vitest_1.expect)(result).toBe(false);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, vitest_1.describe)('verifySessionStorage', function () {
        (0, vitest_1.test)('is properly configured', function () {
            (0, vitest_1.expect)(verification_server_ts_1.verifySessionStorage).toBeDefined();
            (0, vitest_1.expect)(verification_server_ts_1.verifySessionStorage.getSession).toBeInstanceOf(Function);
            (0, vitest_1.expect)(verification_server_ts_1.verifySessionStorage.commitSession).toBeInstanceOf(Function);
            (0, vitest_1.expect)(verification_server_ts_1.verifySessionStorage.destroySession).toBeInstanceOf(Function);
        });
    });
});
