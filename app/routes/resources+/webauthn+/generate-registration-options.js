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
exports.loader = loader;
var node_1 = require("@remix-run/node");
var server_1 = require("@simplewebauthn/server");
var prisma_server_js_1 = require("#app/utils/prisma.server.js");
var session_server_js_1 = require("#app/utils/session.server.js");
var webauthn_server_js_1 = require("#app/utils/webauthn.server.js");
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var user, passkeys, config, options, _c, _d, _e;
        var _f, _g;
        var request = _b.request;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0: return [4 /*yield*/, (0, session_server_js_1.requireUser)(request)];
                case 1:
                    user = _h.sent();
                    return [4 /*yield*/, prisma_server_js_1.prisma.passkey.findMany({
                            where: { userId: user.id },
                            select: { id: true },
                        })];
                case 2:
                    passkeys = _h.sent();
                    config = (0, webauthn_server_js_1.getWebAuthnConfig)(request);
                    return [4 /*yield*/, (0, server_1.generateRegistrationOptions)({
                            rpName: config.rpName,
                            rpID: config.rpID,
                            userName: user.email,
                            userID: new TextEncoder().encode(user.id),
                            userDisplayName: user.firstName,
                            attestationType: 'none',
                            excludeCredentials: passkeys,
                            authenticatorSelection: config.authenticatorSelection,
                        })];
                case 3:
                    options = _h.sent();
                    _c = node_1.json;
                    _d = [{ options: options }];
                    _f = {};
                    _g = {};
                    _e = 'Set-Cookie';
                    return [4 /*yield*/, webauthn_server_js_1.passkeyCookie.serialize(webauthn_server_js_1.PasskeyCookieSchema.parse({
                            challenge: options.challenge,
                            userId: options.user.id,
                        }))];
                case 4: return [2 /*return*/, _c.apply(void 0, _d.concat([(_f.headers = (_g[_e] = _h.sent(),
                            _g),
                            _f)]))];
            }
        });
    });
}
