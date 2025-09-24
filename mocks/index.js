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
var msw_1 = require("msw");
var node_1 = require("msw/node");
var discord_ts_1 = require("./discord.ts");
var github_ts_1 = require("./github.ts");
var kit_ts_1 = require("./kit.ts");
var oauth_ts_1 = require("./oauth.ts");
var oembed_ts_1 = require("./oembed.ts");
var simplecast_ts_1 = require("./simplecast.ts");
var tito_ts_1 = require("./tito.ts");
var transistor_ts_1 = require("./transistor.ts");
var twitter_ts_1 = require("./twitter.ts");
var utils_ts_1 = require("./utils.ts");
var remix = process.env.REMIX_DEV_HTTP_ORIGIN;
// put one-off handlers that don't really need an entire file to themselves here
var miscHandlers = [
    msw_1.http.post("".concat(remix, "/ping"), function () {
        return (0, msw_1.passthrough)();
    }),
    msw_1.http.get('https://res.cloudinary.com/kentcdodds-com/image/upload/w_100,q_auto,f_webp,e_blur:1000/unsplash/:photoId', function () { return __awaiter(void 0, void 0, void 0, function () {
        var base64, buffer;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, utils_ts_1.isConnectedToTheInternet)()];
                case 1:
                    if (_a.sent())
                        return [2 /*return*/, (0, msw_1.passthrough)()];
                    base64 = 'UklGRhoBAABXRUJQVlA4IA4BAABwCgCdASpkAEMAPqVInUq5sy+hqvqpuzAUiWcG+BsvrZQel/iYPLGE154ZiYwzeF8UJRAKZ0oAzLdTpjlp8qBuGwW1ntMTe6iQZbxzyP4gBeg7X7SH7NwyBcUDAAD+8MrTwbAD8OLmsoaL1QDPwEE+GrfqLQPn6xkgFHCB8lyjV3K2RvcQ7pSvgA87LOVuDtMrtkm+tTV0x1RcIe4Uvb6J+yygkV48DSejuyrMWrYgoZyjkf/0/L9+bAZgCam6+oHqjBSWTq5jF7wzBxYwfoGY7OdYZOdeGb4euuuLaCzDHz/QRbDCaIsJWJW3Jo4bkbz44AI/8UfFTGX4tMTRcKLXTDIviU+/u7UnlVaDQAA=';
                    buffer = Buffer.from(base64);
                    return [2 /*return*/, msw_1.HttpResponse.json(buffer)];
            }
        });
    }); }),
    msw_1.http.get(/res.cloudinary.com\/kentcdodds-com\//, function () {
        return (0, msw_1.passthrough)();
    }),
    msw_1.http.post('https://api.mailgun.net/v3/:domain/messages', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var reqBody, body, fixture, randomId, id;
        var _c;
        var request = _b.request, params = _b.params;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, request.text()];
                case 1:
                    reqBody = _d.sent();
                    body = Object.fromEntries(new URLSearchParams(reqBody));
                    console.info('🔶 mocked email contents:', body);
                    if (!(body.text && body.to)) return [3 /*break*/, 4];
                    return [4 /*yield*/, (0, utils_ts_1.readFixture)()];
                case 2:
                    fixture = _d.sent();
                    return [4 /*yield*/, (0, utils_ts_1.updateFixture)({
                            email: __assign(__assign({}, fixture.email), (_c = {}, _c[body.to] = body, _c)),
                        })];
                case 3:
                    _d.sent();
                    _d.label = 4;
                case 4:
                    randomId = '20210321210543.1.E01B8B612C44B41B';
                    id = "<".concat(randomId, ">@").concat(params.domain);
                    return [2 /*return*/, msw_1.HttpResponse.json({ id: id, message: 'Queued. Thank you.' })];
            }
        });
    }); }),
    msw_1.http.head('https://www.gravatar.com/avatar/:md5Hash', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, utils_ts_1.isConnectedToTheInternet)()];
                case 1:
                    if (_a.sent())
                        return [2 /*return*/, (0, msw_1.passthrough)()];
                    return [2 /*return*/, msw_1.HttpResponse.json(null, { status: 404 })];
            }
        });
    }); }),
    msw_1.http.get(/http:\/\/localhost:\d+\/.*/, function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, (0, msw_1.passthrough)()];
    }); }); }),
    msw_1.http.post(/http:\/\/localhost:\d+\/.*/, function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, (0, msw_1.passthrough)()];
    }); }); }),
    msw_1.http.get('https://verifyright.co/verify/:email', function () {
        return msw_1.HttpResponse.json({ status: true });
    }),
];
var server = node_1.setupServer.apply(void 0, __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], github_ts_1.githubHandlers, false), oauth_ts_1.oauthHandlers, false), oembed_ts_1.oembedHandlers, false), twitter_ts_1.twitterHandlers, false), tito_ts_1.tiToHandlers, false), transistor_ts_1.transistorHandlers, false), discord_ts_1.discordHandlers, false), kit_ts_1.kitHandlers, false), simplecast_ts_1.simplecastHandlers, false), miscHandlers, false));
server.listen({
    onUnhandledRequest: function (request, print) {
        // Do not print warnings on unhandled requests to https://<:userId>.ingest.us.sentry.io/api/
        // Note: a request handler with passthrough is not suited with this type of url
        //       until there is a more permissible url catching system
        //       like requested at https://github.com/mswjs/msw/issues/1804
        if (request.url.includes('.sentry.io')) {
            return;
        }
        // Print the regular MSW unhandled request warning otherwise.
        print.warning();
    },
});
console.info('🔶 Mock server installed');
process.once('SIGINT', function () { return server.close(); });
process.once('SIGTERM', function () { return server.close(); });
