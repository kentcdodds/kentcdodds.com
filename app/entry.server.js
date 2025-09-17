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
exports.default = handleDocumentRequest;
exports.handleDataRequest = handleDataRequest;
exports.handleError = handleError;
var stream_1 = require("stream");
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var Sentry = require("@sentry/remix");
var chalk_1 = require("chalk");
var isbot_1 = require("isbot");
var server_1 = require("react-dom/server");
var litefs_js_server_ts_1 = require("#app/utils/litefs-js.server.ts");
var other_routes_server_ts_1 = require("./other-routes.server.ts");
var env_server_ts_1 = require("./utils/env.server.ts");
var nonce_provider_ts_1 = require("./utils/nonce-provider.ts");
global.ENV = (0, env_server_ts_1.getEnv)();
var ABORT_DELAY = 5000;
function handleDocumentRequest() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return __awaiter(this, void 0, void 0, function () {
        var request, responseStatusCode, responseHeaders, remixContext, loadContext, _a, otherRoutes_1, handler, otherRouteResponse;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    request = args[0], responseStatusCode = args[1], responseHeaders = args[2], remixContext = args[3], loadContext = args[4];
                    if (!(responseStatusCode >= 500)) return [3 /*break*/, 2];
                    // if we had an error, let's just send this over to the primary and see
                    // if it can handle it.
                    return [4 /*yield*/, (0, litefs_js_server_ts_1.ensurePrimary)()];
                case 1:
                    // if we had an error, let's just send this over to the primary and see
                    // if it can handle it.
                    _b.sent();
                    _b.label = 2;
                case 2:
                    _a = 0, otherRoutes_1 = other_routes_server_ts_1.routes;
                    _b.label = 3;
                case 3:
                    if (!(_a < otherRoutes_1.length)) return [3 /*break*/, 6];
                    handler = otherRoutes_1[_a];
                    return [4 /*yield*/, handler(request, remixContext)];
                case 4:
                    otherRouteResponse = _b.sent();
                    if (otherRouteResponse)
                        return [2 /*return*/, otherRouteResponse];
                    _b.label = 5;
                case 5:
                    _a++;
                    return [3 /*break*/, 3];
                case 6:
                    if (process.env.NODE_ENV !== 'production') {
                        responseHeaders.set('Cache-Control', 'no-store');
                    }
                    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
                        responseHeaders.append('Document-Policy', 'js-profiling');
                    }
                    responseHeaders.append('Link', '<https://res.cloudinary.com>; rel="preconnect"');
                    // If the request is from a bot, we want to wait for the full
                    // response to render before sending it to the client. This
                    // ensures that bots can see the full page content.
                    if ((0, isbot_1.isbot)(request.headers.get('user-agent'))) {
                        return [2 /*return*/, serveTheBots(request, responseStatusCode, responseHeaders, remixContext, loadContext)];
                    }
                    return [2 /*return*/, serveBrowsers(request, responseStatusCode, responseHeaders, remixContext, loadContext)];
            }
        });
    });
}
function serveTheBots() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var request = args[0], responseStatusCode = args[1], responseHeaders = args[2], remixContext = args[3], loadContext = args[4];
    var nonce = loadContext.cspNonce ? String(loadContext.cspNonce) : '';
    return new Promise(function (resolve, reject) {
        var stream = (0, server_1.renderToPipeableStream)(<nonce_provider_ts_1.NonceProvider value={nonce}>
				<react_1.RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY}/>
			</nonce_provider_ts_1.NonceProvider>, {
            nonce: nonce,
            // Use onAllReady to wait for the entire document to be ready
            onAllReady: function () {
                responseHeaders.set('Content-Type', 'text/html; charset=UTF-8');
                var body = new stream_1.PassThrough();
                // find/replace all instances of the string "data-evt-" with ""
                // this is a bit of a hack because React won't render the "onload"
                // prop, which we use for blurrable image
                var dataEvtTransform = new stream_1.Transform({
                    transform: function (chunk, encoding, callback) {
                        var string = chunk.toString();
                        var replaced = string.replace(/data-evt-/g, "nonce=\"".concat(nonce, "\" "));
                        callback(null, replaced);
                    },
                });
                stream.pipe(dataEvtTransform).pipe(body);
                resolve(new Response((0, node_1.createReadableStreamFromReadable)(body), {
                    status: responseStatusCode,
                    headers: responseHeaders,
                }));
            },
            onShellError: function (err) {
                reject(err);
            },
        });
        setTimeout(function () { return stream.abort(); }, ABORT_DELAY);
    });
}
function serveBrowsers() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var request = args[0], responseStatusCode = args[1], responseHeaders = args[2], remixContext = args[3], loadContext = args[4];
    var nonce = loadContext.cspNonce ? String(loadContext.cspNonce) : '';
    return new Promise(function (resolve, reject) {
        var didError = false;
        var stream = (0, server_1.renderToPipeableStream)(<nonce_provider_ts_1.NonceProvider value={nonce}>
				<react_1.RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY}/>
			</nonce_provider_ts_1.NonceProvider>, {
            nonce: nonce,
            // use onShellReady to wait until a suspense boundary is triggered
            onShellReady: function () {
                responseHeaders.set('Content-Type', 'text/html; charset=UTF-8');
                var body = new stream_1.PassThrough();
                // find/replace all instances of the string "data-evt-" with ""
                // this is a bit of a hack because React won't render the "onload"
                // prop, which we use for blurrable image
                var dataEvtTransform = new stream_1.Transform({
                    transform: function (chunk, encoding, callback) {
                        var string = chunk.toString();
                        var replaced = string.replace(/data-evt-/g, "nonce=\"".concat(nonce, "\" "));
                        callback(null, replaced);
                    },
                });
                stream.pipe(dataEvtTransform).pipe(body);
                resolve(new Response((0, node_1.createReadableStreamFromReadable)(body), {
                    status: didError ? 500 : responseStatusCode,
                    headers: responseHeaders,
                }));
            },
            onShellError: function (err) {
                reject(err);
            },
            onError: function (err) {
                didError = true;
                console.error(err);
            },
        });
        setTimeout(function () { return stream.abort(); }, ABORT_DELAY);
    });
}
function handleDataRequest(response) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(response.status >= 500)) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, litefs_js_server_ts_1.ensurePrimary)()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/, response];
            }
        });
    });
}
function handleError(error, _a) {
    var request = _a.request;
    // Skip capturing if the request is aborted as Remix docs suggest
    // Ref: https://remix.run/docs/en/main/file-conventions/entry.server#handleerror
    if (request.signal.aborted) {
        return;
    }
    if (error instanceof Error) {
        console.error(chalk_1.default.red(error.stack));
        Sentry.captureException(error);
    }
    else {
        console.error(chalk_1.default.red(error));
        Sentry.captureException(error);
    }
}
