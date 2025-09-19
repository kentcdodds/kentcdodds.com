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
exports.oauthHandlers = void 0;
var node_net_1 = require("node:net");
var msw_1 = require("msw");
exports.oauthHandlers = [
    // https://kcd-oauth-provider.kentcdodds.workers.dev/.well-known/oauth-authorization-server
    msw_1.http.get('https://kcd-oauth-provider.kentcdodds.workers.dev/.well-known/oauth-authorization-server', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var localIsRunning, newUrl, clonedRequest, response, headers, body, text, newText;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, isPortOpen('localhost', 8787)];
                case 1:
                    localIsRunning = _c.sent();
                    if (!localIsRunning) return [3 /*break*/, 4];
                    newUrl = new URL(request.url);
                    newUrl.protocol = 'http:';
                    newUrl.host = 'localhost:8787';
                    clonedRequest = new Request(newUrl.toString(), request);
                    return [4 /*yield*/, fetch(clonedRequest)
                        // Remove 'content-encoding' header if present
                    ];
                case 2:
                    response = _c.sent();
                    headers = new Headers(response.headers);
                    headers.delete('content-encoding');
                    return [4 /*yield*/, response.arrayBuffer()];
                case 3:
                    body = _c.sent();
                    text = new TextDecoder().decode(body);
                    newText = text.replaceAll(/https?:\/\/kcd-oauth-provider\.kentcdodds\.workers\.dev/g, 'http://localhost:8787');
                    return [2 /*return*/, new Response(newText, {
                            status: response.status,
                            headers: headers,
                        })];
                case 4: return [2 /*return*/, (0, msw_1.passthrough)()];
            }
        });
    }); }),
    msw_1.http.all('https://kcd-oauth-provider.kentcdodds.workers.dev/*', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var localIsRunning, newUrl, clonedRequest, response, headers, body;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, isPortOpen('localhost', 8787)];
                case 1:
                    localIsRunning = _c.sent();
                    if (!localIsRunning) return [3 /*break*/, 4];
                    newUrl = new URL(request.url);
                    newUrl.protocol = 'http:';
                    newUrl.host = 'localhost:8787';
                    clonedRequest = new Request(newUrl.toString(), request);
                    return [4 /*yield*/, fetch(clonedRequest)
                        // Remove 'content-encoding' header if present
                    ];
                case 2:
                    response = _c.sent();
                    headers = new Headers(response.headers);
                    headers.delete('content-encoding');
                    return [4 /*yield*/, response.arrayBuffer()];
                case 3:
                    body = _c.sent();
                    return [2 /*return*/, new Response(body, {
                            status: response.status,
                            statusText: response.statusText,
                            headers: headers,
                        })];
                case 4: return [2 /*return*/, (0, msw_1.passthrough)()];
            }
        });
    }); }),
];
function isPortOpen(host, port, timeout) {
    if (timeout === void 0) { timeout = 500; }
    return new Promise(function (resolve) {
        var socket = new node_net_1.default.Socket();
        var onError = function () {
            socket.destroy();
            resolve(false);
        };
        socket.setTimeout(timeout);
        socket.once('error', onError);
        socket.once('timeout', onError);
        socket.connect(port, host, function () {
            socket.end();
            resolve(true);
        });
    });
}
