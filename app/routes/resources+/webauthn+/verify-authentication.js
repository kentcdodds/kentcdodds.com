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
var zod_1 = require("zod");
var prisma_server_ts_1 = require("#app/utils/prisma.server.ts");
var session_server_ts_1 = require("#app/utils/session.server.ts");
var webauthn_server_ts_1 = require("#app/utils/webauthn.server.ts");
var AuthenticationResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    rawId: zod_1.z.string(),
    response: zod_1.z.object({
        clientDataJSON: zod_1.z.string(),
        authenticatorData: zod_1.z.string(),
        signature: zod_1.z.string(),
        userHandle: zod_1.z.string().optional(),
    }),
    type: zod_1.z.literal('public-key'),
    clientExtensionResults: zod_1.z.object({
        appid: zod_1.z.boolean().optional(),
        credProps: zod_1.z
            .object({
            rk: zod_1.z.boolean().optional(),
        })
            .optional(),
        hmacCreateSecret: zod_1.z.boolean().optional(),
    }),
});
function action(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var cookieHeader, cookie, deletePasskeyCookie, body, result, passkey, config, verification, session, _c, _d, error_1;
        var _e;
        var request = _b.request;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    cookieHeader = request.headers.get('Cookie');
                    return [4 /*yield*/, webauthn_server_ts_1.passkeyCookie.parse(cookieHeader)];
                case 1:
                    cookie = _f.sent();
                    return [4 /*yield*/, webauthn_server_ts_1.passkeyCookie.serialize('', { maxAge: 0 })];
                case 2:
                    deletePasskeyCookie = _f.sent();
                    _f.label = 3;
                case 3:
                    _f.trys.push([3, 11, , 12]);
                    if (!(cookie === null || cookie === void 0 ? void 0 : cookie.challenge)) {
                        throw new Error('Authentication challenge not found');
                    }
                    return [4 /*yield*/, request.json()];
                case 4:
                    body = _f.sent();
                    result = AuthenticationResponseSchema.safeParse(body);
                    if (!result.success) {
                        throw new Error('Invalid authentication response');
                    }
                    return [4 /*yield*/, prisma_server_ts_1.prisma.passkey.findUnique({
                            where: { id: result.data.id },
                            include: { user: true },
                        })];
                case 5:
                    passkey = _f.sent();
                    if (!passkey) {
                        throw new Error('Passkey not found');
                    }
                    config = (0, webauthn_server_ts_1.getWebAuthnConfig)(request);
                    return [4 /*yield*/, (0, server_1.verifyAuthenticationResponse)({
                            response: result.data,
                            expectedChallenge: cookie.challenge,
                            expectedOrigin: config.origin,
                            expectedRPID: config.rpID,
                            credential: {
                                id: result.data.id,
                                publicKey: passkey.publicKey,
                                counter: Number(passkey.counter),
                            },
                        })];
                case 6:
                    verification = _f.sent();
                    if (!verification.verified) {
                        throw new Error('Authentication verification failed');
                    }
                    // Update the authenticator's counter in the DB to the newest count
                    return [4 /*yield*/, prisma_server_ts_1.prisma.passkey.update({
                            where: { id: passkey.id },
                            data: { counter: BigInt(verification.authenticationInfo.newCounter) },
                        })];
                case 7:
                    // Update the authenticator's counter in the DB to the newest count
                    _f.sent();
                    return [4 /*yield*/, (0, session_server_ts_1.getSession)(request)];
                case 8:
                    session = _f.sent();
                    return [4 /*yield*/, session.signIn(passkey.user)];
                case 9:
                    _f.sent();
                    _c = node_1.json;
                    _d = [{ status: 'success' }];
                    _e = {};
                    return [4 /*yield*/, session.getHeaders({ 'Set-Cookie': deletePasskeyCookie })];
                case 10: return [2 /*return*/, _c.apply(void 0, _d.concat([(_e.headers = _f.sent(),
                            _e)]))];
                case 11:
                    error_1 = _f.sent();
                    console.error('Error during authentication verification:', error_1);
                    return [2 /*return*/, (0, node_1.json)({
                            status: 'error',
                            error: error_1 instanceof Error ? error_1.message : 'Verification failed',
                        }, { status: 400, headers: { 'Set-Cookie': deletePasskeyCookie } })];
                case 12: return [2 /*return*/];
            }
        });
    });
}
