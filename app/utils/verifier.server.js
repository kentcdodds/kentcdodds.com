"use strict";
// verifier is an email verification service
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
exports.verifyEmailAddress = verifyEmailAddress;
exports.isEmailVerified = isEmailVerified;
var kit_server_js_1 = require("#app/kit/kit.server.js");
var misc_tsx_1 = require("./misc.tsx");
var prisma_server_ts_1 = require("./prisma.server.ts");
var VERIFIER_API_KEY = (0, misc_tsx_1.getRequiredServerEnvVar)('VERIFIER_API_KEY');
function verifyEmailAddress(emailAddress) {
    return __awaiter(this, void 0, void 0, function () {
        var verifierUrl, controller, timeoutId, response, verifierResult, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    verifierUrl = new URL("https://verifyright.co/verify/".concat(emailAddress));
                    verifierUrl.searchParams.append('token', VERIFIER_API_KEY);
                    controller = new AbortController();
                    timeoutId = setTimeout(function () { return controller.abort(); }, 2000);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetch(verifierUrl.toString(), {
                            signal: controller.signal,
                        })];
                case 2:
                    response = _a.sent();
                    clearTimeout(timeoutId);
                    return [4 /*yield*/, response.json()];
                case 3:
                    verifierResult = _a.sent();
                    return [2 /*return*/, verifierResult];
                case 4:
                    error_1 = _a.sent();
                    clearTimeout(timeoutId);
                    if (error_1 instanceof Error && error_1.name === 'AbortError') {
                        console.error('Email verification timed out:', emailAddress);
                    }
                    else {
                        console.error('Error verifying email:', (0, misc_tsx_1.getErrorMessage)(error_1));
                    }
                    // If the request times out, we'll return a default result
                    // we don't I wanna block the user from logging in if we can't verify the email address
                    // is invalid...
                    return [2 /*return*/, {
                            status: true,
                            email: emailAddress,
                            domain: emailAddress.split('@')[1],
                        }];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function isEmailVerified(email) {
    return __awaiter(this, void 0, void 0, function () {
        var userExists, _a, kitSubscriber, verifierResult;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = Boolean;
                    return [4 /*yield*/, prisma_server_ts_1.prisma.user.findUnique({
                            select: { id: true },
                            where: { email: email },
                        })];
                case 1:
                    userExists = _a.apply(void 0, [_b.sent()]);
                    if (userExists)
                        return [2 /*return*/, { verified: true }];
                    return [4 /*yield*/, (0, kit_server_js_1.getKitSubscriber)(email)];
                case 2:
                    kitSubscriber = _b.sent();
                    if (kitSubscriber)
                        return [2 /*return*/, { verified: true }];
                    return [4 /*yield*/, verifyEmailAddress(email)];
                case 3:
                    verifierResult = _b.sent();
                    if (verifierResult.status)
                        return [2 /*return*/, { verified: true }];
                    return [2 /*return*/, { verified: false, message: verifierResult.error.message }];
            }
        });
    });
}
