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
exports.action = action;
var node_1 = require("@remix-run/node");
var server_1 = require("@simplewebauthn/server");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var prisma_server_ts_1 = require("#app/utils/prisma.server.ts");
var session_server_ts_1 = require("#app/utils/session.server.ts");
var webauthn_server_js_1 = require("#app/utils/webauthn.server.js");
function action(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var user, body, result, data, passkeyCookieData, parsedPasskeyCookieData, _c, challenge, webauthnUserId, domain, rpID, origin, verification, error_1, verified, registrationInfo, credential, credentialDeviceType, credentialBackedUp, aaguid, existingPasskey, _d, _e, _f;
        var _g, _h;
        var _j;
        var request = _b.request;
        return __generator(this, function (_k) {
            switch (_k.label) {
                case 0: return [4 /*yield*/, (0, session_server_ts_1.requireUser)(request)];
                case 1:
                    user = _k.sent();
                    if (request.method !== 'POST') {
                        return [2 /*return*/, (0, node_1.json)({ status: 'error', error: 'Method not allowed' }, 405)];
                    }
                    return [4 /*yield*/, request.json()];
                case 2:
                    body = _k.sent();
                    result = webauthn_server_js_1.RegistrationResponseSchema.safeParse(body);
                    if (!result.success) {
                        return [2 /*return*/, (0, node_1.json)({ status: 'error', error: 'Invalid registration response' }, 400)];
                    }
                    data = result.data;
                    return [4 /*yield*/, webauthn_server_js_1.passkeyCookie.parse(request.headers.get('Cookie'))];
                case 3:
                    passkeyCookieData = _k.sent();
                    parsedPasskeyCookieData = webauthn_server_js_1.PasskeyCookieSchema.safeParse(passkeyCookieData);
                    if (!parsedPasskeyCookieData.success) {
                        return [2 /*return*/, (0, node_1.json)({ status: 'error', error: 'No challenge found' }, 400)];
                    }
                    _c = parsedPasskeyCookieData.data, challenge = _c.challenge, webauthnUserId = _c.userId;
                    domain = new URL((0, misc_tsx_1.getDomainUrl)(request)).hostname;
                    rpID = domain;
                    origin = (0, misc_tsx_1.getDomainUrl)(request);
                    _k.label = 4;
                case 4:
                    _k.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, (0, server_1.verifyRegistrationResponse)({
                            response: data,
                            expectedChallenge: challenge,
                            expectedOrigin: origin,
                            expectedRPID: rpID,
                            requireUserVerification: true,
                        })];
                case 5:
                    verification = _k.sent();
                    return [3 /*break*/, 7];
                case 6:
                    error_1 = _k.sent();
                    console.error(error_1);
                    return [2 /*return*/, (0, node_1.json)({ status: 'error', error: (0, misc_tsx_1.getErrorMessage)(error_1) }, 400)];
                case 7:
                    verified = verification.verified, registrationInfo = verification.registrationInfo;
                    if (!verified || !registrationInfo) {
                        return [2 /*return*/, (0, node_1.json)({ status: 'error', error: 'Registration verification failed' }, 400)];
                    }
                    credential = registrationInfo.credential, credentialDeviceType = registrationInfo.credentialDeviceType, credentialBackedUp = registrationInfo.credentialBackedUp, aaguid = registrationInfo.aaguid;
                    return [4 /*yield*/, prisma_server_ts_1.prisma.passkey.findUnique({
                            where: { id: credential.id },
                            select: { id: true },
                        })];
                case 8:
                    existingPasskey = _k.sent();
                    if (existingPasskey) {
                        return [2 /*return*/, (0, node_1.json)({
                                status: 'error',
                                error: 'This passkey has already been registered',
                            }, 400)];
                    }
                    // Create new passkey in database
                    return [4 /*yield*/, prisma_server_ts_1.prisma.passkey.create({
                            data: {
                                id: credential.id,
                                aaguid: aaguid,
                                publicKey: Buffer.from(credential.publicKey),
                                userId: user.id,
                                webauthnUserId: webauthnUserId,
                                counter: credential.counter,
                                deviceType: credentialDeviceType,
                                backedUp: credentialBackedUp,
                                transports: (_j = credential.transports) === null || _j === void 0 ? void 0 : _j.join(','),
                            },
                        })
                        // Clear the challenge cookie
                    ];
                case 9:
                    // Create new passkey in database
                    _k.sent();
                    _d = node_1.json;
                    _e = [{ status: 'success' }];
                    _g = {};
                    _h = {};
                    _f = 'Set-Cookie';
                    return [4 /*yield*/, webauthn_server_js_1.passkeyCookie.serialize('', { maxAge: 0 })];
                case 10: 
                // Clear the challenge cookie
                return [2 /*return*/, _d.apply(void 0, _e.concat([(_g.headers = (_h[_f] = _k.sent(),
                            _h),
                            _g)]))];
            }
        });
    });
}
