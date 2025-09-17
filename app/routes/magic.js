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
exports.handle = void 0;
exports.loader = loader;
exports.default = Magic;
var node_1 = require("@remix-run/node");
var litefs_js_server_ts_1 = require("#app/utils/litefs-js.server.ts");
var client_server_ts_1 = require("#app/utils/client.server.ts");
var login_server_ts_1 = require("#app/utils/login.server.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var prisma_server_ts_1 = require("#app/utils/prisma.server.ts");
var session_server_ts_1 = require("#app/utils/session.server.ts");
exports.handle = {
    getSitemapEntries: function () { return null; },
};
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var loginInfoSession, session, headers, user, clientSession, clientId, _c, _d, error_1, _e, _f;
        var _g, _h;
        var request = _b.request;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0: return [4 /*yield*/, (0, litefs_js_server_ts_1.ensurePrimary)()];
                case 1:
                    _j.sent();
                    return [4 /*yield*/, (0, login_server_ts_1.getLoginInfoSession)(request)];
                case 2:
                    loginInfoSession = _j.sent();
                    _j.label = 3;
                case 3:
                    _j.trys.push([3, 16, , 18]);
                    return [4 /*yield*/, (0, session_server_ts_1.getUserSessionFromMagicLink)(request)];
                case 4:
                    session = _j.sent();
                    loginInfoSession.setMagicLinkVerified(true);
                    if (!session) return [3 /*break*/, 13];
                    headers = new Headers();
                    loginInfoSession.clean();
                    return [4 /*yield*/, loginInfoSession.getHeaders(headers)];
                case 5:
                    _j.sent();
                    return [4 /*yield*/, session.getHeaders(headers)];
                case 6:
                    _j.sent();
                    return [4 /*yield*/, session.getUser()];
                case 7:
                    user = _j.sent();
                    if (!user) return [3 /*break*/, 12];
                    return [4 /*yield*/, (0, client_server_ts_1.getClientSession)(request, null)
                        // update all PostReads from clientId to userId
                    ];
                case 8:
                    clientSession = _j.sent();
                    clientId = clientSession.getClientId();
                    if (!clientId) return [3 /*break*/, 11];
                    return [4 /*yield*/, prisma_server_ts_1.prisma.postRead.updateMany({
                            data: { userId: user.id, clientId: null },
                            where: { clientId: clientId },
                        })];
                case 9:
                    _j.sent();
                    clientSession.setUser(user);
                    return [4 /*yield*/, clientSession.getHeaders(headers)];
                case 10:
                    _j.sent();
                    _j.label = 11;
                case 11: return [3 /*break*/, 12];
                case 12: return [2 /*return*/, (0, node_1.redirect)('/me', { headers: headers })];
                case 13:
                    loginInfoSession.setMagicLink(request.url);
                    _c = node_1.redirect;
                    _d = ['/signup'];
                    _g = {};
                    return [4 /*yield*/, loginInfoSession.getHeaders()];
                case 14: return [2 /*return*/, _c.apply(void 0, _d.concat([(_g.headers = _j.sent(),
                            _g)]))];
                case 15: return [3 /*break*/, 18];
                case 16:
                    error_1 = _j.sent();
                    if ((0, misc_tsx_1.isResponse)(error_1))
                        throw error_1;
                    console.error(error_1);
                    loginInfoSession.clean();
                    loginInfoSession.flashError((0, misc_tsx_1.getErrorMessage)(error_1) ||
                        'Sign in link invalid. Please request a new one.');
                    _e = node_1.redirect;
                    _f = ['/login'];
                    _h = {};
                    return [4 /*yield*/, loginInfoSession.getHeaders()];
                case 17: return [2 /*return*/, _e.apply(void 0, _f.concat([(_h.headers = _j.sent(),
                            _h)]))];
                case 18: return [2 /*return*/];
            }
        });
    });
}
function Magic() {
    return (<div>
			{"Congrats! You're seeing something you shouldn't ever be able to see because you should have been redirected. Good job!"}
		</div>);
}
