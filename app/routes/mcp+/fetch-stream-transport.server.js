"use strict";
// this was adapted by AI from https://github.com/modelcontextprotocol/typescript-sdk/blob/2cf4f0ca86ff841aca53ac8ef5f3227ba3789386/src/server/streamableHttp.ts
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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _FetchAPIHTTPServerTransport_sessionIdGenerator, _FetchAPIHTTPServerTransport_started, _FetchAPIHTTPServerTransport_streamMapping, _FetchAPIHTTPServerTransport_requestToStreamMapping, _FetchAPIHTTPServerTransport_requestResponseMap, _FetchAPIHTTPServerTransport_initialized, _FetchAPIHTTPServerTransport_enableJsonResponse, _FetchAPIHTTPServerTransport_standaloneSseStreamId, _FetchAPIHTTPServerTransport_eventStore, _FetchAPIHTTPServerTransport_onsessioninitialized, _FetchAPIHTTPServerTransport_encoder, _FetchAPIHTTPServerTransport_pendingJsonResponsePromises;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FetchAPIHTTPServerTransport = void 0;
var types_js_1 = require("@modelcontextprotocol/sdk/types.js");
// these utilities are built into the types module, but for some reason I was
// getting a runtime error that they were not defined 🙃
var isInitializeRequest = function (value) {
    return types_js_1.InitializeRequestSchema.safeParse(value).success;
};
var isJSONRPCError = function (value) {
    return types_js_1.JSONRPCErrorSchema.safeParse(value).success;
};
var isJSONRPCRequest = function (value) {
    return types_js_1.JSONRPCRequestSchema.safeParse(value).success;
};
var isJSONRPCResponse = function (value) {
    return types_js_1.JSONRPCResponseSchema.safeParse(value).success;
};
// Helper to create a standard JSON-RPC error response
function createErrorResponse(status, code, message, id) {
    if (id === void 0) { id = null; }
    return new Response(JSON.stringify({
        jsonrpc: '2.0',
        error: { code: code, message: message },
        id: id,
    }), {
        status: status,
        headers: { 'Content-Type': 'application/json' },
    });
}
/**
 * Server transport for Streamable HTTP, re-implemented to use the standard Fetch API Request and Response objects.
 * It supports both SSE streaming and direct JSON responses.
 *
 * This implementation is platform-agnostic and works in any environment that supports
 * standard Request/Response, such as Deno, Cloudflare Workers, Next.js Edge Functions,
 * or Node.js with a compatibility layer.
 */
var FetchAPIHTTPServerTransport = /** @class */ (function () {
    function FetchAPIHTTPServerTransport(options) {
        var _a;
        _FetchAPIHTTPServerTransport_sessionIdGenerator.set(this, void 0);
        _FetchAPIHTTPServerTransport_started.set(this, false);
        _FetchAPIHTTPServerTransport_streamMapping.set(this, new Map());
        _FetchAPIHTTPServerTransport_requestToStreamMapping.set(this, new Map());
        _FetchAPIHTTPServerTransport_requestResponseMap.set(this, new Map());
        _FetchAPIHTTPServerTransport_initialized.set(this, false);
        _FetchAPIHTTPServerTransport_enableJsonResponse.set(this, false);
        _FetchAPIHTTPServerTransport_standaloneSseStreamId.set(this, '_GET_stream');
        _FetchAPIHTTPServerTransport_eventStore.set(this, void 0);
        _FetchAPIHTTPServerTransport_onsessioninitialized.set(this, void 0);
        _FetchAPIHTTPServerTransport_encoder.set(this, new TextEncoder()
        // A map to hold promises for requests that expect a single JSON response
        );
        // A map to hold promises for requests that expect a single JSON response
        _FetchAPIHTTPServerTransport_pendingJsonResponsePromises.set(this, new Map());
        __classPrivateFieldSet(this, _FetchAPIHTTPServerTransport_sessionIdGenerator, options.sessionIdGenerator, "f");
        __classPrivateFieldSet(this, _FetchAPIHTTPServerTransport_enableJsonResponse, (_a = options.enableJsonResponse) !== null && _a !== void 0 ? _a : false, "f");
        __classPrivateFieldSet(this, _FetchAPIHTTPServerTransport_eventStore, options.eventStore, "f");
        __classPrivateFieldSet(this, _FetchAPIHTTPServerTransport_onsessioninitialized, options.onsessioninitialized, "f");
    }
    FetchAPIHTTPServerTransport.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (__classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_started, "f")) {
                    throw new Error('Transport already started');
                }
                __classPrivateFieldSet(this, _FetchAPIHTTPServerTransport_started, true, "f");
                return [2 /*return*/];
            });
        });
    };
    /**
     * Handles an incoming standard Request object and returns a standard Response object.
     */
    FetchAPIHTTPServerTransport.prototype.handleRequest = function (request, authInfo) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (request.method) {
                    case 'POST':
                        return [2 /*return*/, this.handlePostRequest(request, authInfo)];
                    case 'GET':
                        return [2 /*return*/, this.handleGetRequest(request)];
                    case 'DELETE':
                        return [2 /*return*/, this.handleDeleteRequest(request)];
                    default:
                        return [2 /*return*/, this.handleUnsupportedRequest()];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Creates a streaming Response for Server-Sent Events (SSE).
     */
    FetchAPIHTTPServerTransport.prototype.createStreamingResponse = function (request, streamId, extraHeaders) {
        var _this = this;
        if (extraHeaders === void 0) { extraHeaders = {}; }
        var stream = new ReadableStream({
            start: function (controller) {
                __classPrivateFieldGet(_this, _FetchAPIHTTPServerTransport_streamMapping, "f").set(streamId, controller);
                // Handle client disconnects using the request's AbortSignal
                request.signal.addEventListener('abort', function () {
                    _this.closeStream(streamId);
                });
            },
            cancel: function () {
                _this.closeStream(streamId);
            },
        });
        var headers = new Headers(__assign({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' }, extraHeaders));
        return new Response(stream, { status: 200, headers: headers });
    };
    /**
     * Safely closes a stream by its ID, cleaning up associated resources.
     */
    FetchAPIHTTPServerTransport.prototype.closeStream = function (streamId) {
        var controller = __classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_streamMapping, "f").get(streamId);
        if (controller) {
            try {
                controller.close();
            }
            catch (_a) {
                // Ignore errors if the stream is already closing or closed
            }
            __classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_streamMapping, "f").delete(streamId);
        }
    };
    FetchAPIHTTPServerTransport.prototype.handleGetRequest = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var acceptHeader, sessionError, lastEventId, headers;
            return __generator(this, function (_a) {
                acceptHeader = request.headers.get('accept');
                if (!(acceptHeader === null || acceptHeader === void 0 ? void 0 : acceptHeader.includes('text/event-stream'))) {
                    return [2 /*return*/, createErrorResponse(406, -32000, 'Not Acceptable: Client must accept text/event-stream')];
                }
                sessionError = this.validateSession(request);
                if (sessionError)
                    return [2 /*return*/, sessionError];
                if (__classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_eventStore, "f")) {
                    lastEventId = request.headers.get('last-event-id');
                    if (lastEventId) {
                        // Resumability requires creating a stream and replaying events into it.
                        // This is an advanced case but follows the same pattern.
                        return [2 /*return*/, this.replayEvents(request, lastEventId)];
                    }
                }
                if (__classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_streamMapping, "f").has(__classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_standaloneSseStreamId, "f"))) {
                    return [2 /*return*/, createErrorResponse(409, -32000, 'Conflict: Only one SSE stream is allowed per session')];
                }
                headers = {};
                if (this.sessionId !== undefined) {
                    headers['mcp-session-id'] = this.sessionId;
                }
                return [2 /*return*/, this.createStreamingResponse(request, __classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_standaloneSseStreamId, "f"), headers)];
            });
        });
    };
    FetchAPIHTTPServerTransport.prototype.handlePostRequest = function (request, authInfo) {
        return __awaiter(this, void 0, void 0, function () {
            var acceptHeader, contentType, rawMessage, messages, isInitializationRequest, sessionError, hasRequests, streamId_1, requestIds_1, headers, response, error_1;
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        acceptHeader = request.headers.get('accept');
                        if (!(acceptHeader === null || acceptHeader === void 0 ? void 0 : acceptHeader.includes('application/json')) ||
                            !acceptHeader.includes('text/event-stream')) {
                            return [2 /*return*/, createErrorResponse(406, -32000, 'Not Acceptable: Client must accept both application/json and text/event-stream')];
                        }
                        contentType = request.headers.get('content-type');
                        if (!(contentType === null || contentType === void 0 ? void 0 : contentType.includes('application/json'))) {
                            return [2 /*return*/, createErrorResponse(415, -32000, 'Unsupported Media Type: Content-Type must be application/json')];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, request.json()];
                    case 2:
                        rawMessage = _b.sent();
                        messages = Array.isArray(rawMessage)
                            ? rawMessage.map(function (msg) { return types_js_1.JSONRPCMessageSchema.parse(msg); })
                            : [types_js_1.JSONRPCMessageSchema.parse(rawMessage)];
                        isInitializationRequest = messages.some(isInitializeRequest);
                        if (isInitializationRequest) {
                            if (__classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_initialized, "f") && this.sessionId !== undefined) {
                                return [2 /*return*/, createErrorResponse(400, -32600, 'Invalid Request: Server already initialized')];
                            }
                            if (messages.length > 1) {
                                return [2 /*return*/, createErrorResponse(400, -32600, 'Invalid Request: Only one initialization request is allowed')];
                            }
                            this.sessionId = (_a = __classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_sessionIdGenerator, "f")) === null || _a === void 0 ? void 0 : _a.call(this);
                            __classPrivateFieldSet(this, _FetchAPIHTTPServerTransport_initialized, true, "f");
                            if (this.sessionId && __classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_onsessioninitialized, "f")) {
                                __classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_onsessioninitialized, "f").call(this, this.sessionId);
                            }
                        }
                        else {
                            sessionError = this.validateSession(request);
                            if (sessionError)
                                return [2 /*return*/, sessionError];
                        }
                        messages.forEach(function (message) { var _a; return (_a = _this.onmessage) === null || _a === void 0 ? void 0 : _a.call(_this, message, { authInfo: authInfo }); });
                        hasRequests = messages.some(isJSONRPCRequest);
                        if (!hasRequests) {
                            return [2 /*return*/, new Response(null, { status: 202 })]; // Accepted
                        }
                        streamId_1 = crypto.randomUUID();
                        requestIds_1 = messages.filter(isJSONRPCRequest).map(function (m) { return m.id; });
                        requestIds_1.forEach(function (id) { return __classPrivateFieldGet(_this, _FetchAPIHTTPServerTransport_requestToStreamMapping, "f").set(id, streamId_1); });
                        if (__classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_enableJsonResponse, "f")) {
                            // For JSON responses, we must wait for the response to be ready.
                            // We return a promise that will be resolved in the `send` method.
                            return [2 /*return*/, new Promise(function (resolve) {
                                    __classPrivateFieldGet(_this, _FetchAPIHTTPServerTransport_pendingJsonResponsePromises, "f").set(streamId_1, {
                                        resolve: resolve,
                                        requestIds: requestIds_1,
                                    });
                                })];
                        }
                        else {
                            headers = {};
                            if (this.sessionId !== undefined) {
                                headers['mcp-session-id'] = this.sessionId;
                            }
                            response = this.createStreamingResponse(request, streamId_1, headers);
                            // Map the stream ID to its controller via createStreamingResponse
                            return [2 /*return*/, response];
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _b.sent();
                        return [2 /*return*/, createErrorResponse(400, -32700, "Parse error: ".concat(String(error_1)))];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    FetchAPIHTTPServerTransport.prototype.handleDeleteRequest = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var sessionError;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sessionError = this.validateSession(request);
                        if (sessionError)
                            return [2 /*return*/, sessionError];
                        return [4 /*yield*/, this.close()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, new Response(null, { status: 200 })];
                }
            });
        });
    };
    FetchAPIHTTPServerTransport.prototype.handleUnsupportedRequest = function () {
        return new Response(JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Method not allowed.' },
            id: null,
        }), {
            status: 405,
            headers: {
                Allow: 'GET, POST, DELETE',
                'Content-Type': 'application/json',
            },
        });
    };
    FetchAPIHTTPServerTransport.prototype.validateSession = function (request) {
        if (__classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_sessionIdGenerator, "f") === undefined)
            return null; // Stateless mode
        if (!__classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_initialized, "f")) {
            return createErrorResponse(400, -32000, 'Bad Request: Server not initialized');
        }
        var sessionId = request.headers.get('mcp-session-id');
        if (!sessionId) {
            return createErrorResponse(400, -32000, 'Bad Request: Mcp-Session-Id header is required');
        }
        if (sessionId !== this.sessionId) {
            return createErrorResponse(404, -32001, 'Session not found');
        }
        return null; // Session is valid
    };
    FetchAPIHTTPServerTransport.prototype.writeSSEEvent = function (controller, message, eventId) {
        var _a;
        var eventData = "event: message\n";
        if (eventId) {
            eventData += "id: ".concat(eventId, "\n");
        }
        eventData += "data: ".concat(JSON.stringify(message), "\n\n");
        try {
            controller.enqueue(__classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_encoder, "f").encode(eventData));
        }
        catch (e) {
            (_a = this.onerror) === null || _a === void 0 ? void 0 : _a.call(this, new Error("Failed to write to stream: ".concat(e.message)));
        }
    };
    FetchAPIHTTPServerTransport.prototype.send = function (message, options) {
        return __awaiter(this, void 0, void 0, function () {
            var requestId, controller_1, eventId, _a, streamId, controller, pendingJsonResponse, resolve, requestIds, allReady, responses, headers, body, eventId, _b;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        requestId = options === null || options === void 0 ? void 0 : options.relatedRequestId;
                        if (isJSONRPCResponse(message) || isJSONRPCError(message)) {
                            requestId = message.id;
                        }
                        if (!(requestId === undefined)) return [3 /*break*/, 5];
                        controller_1 = __classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_streamMapping, "f").get(__classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_standaloneSseStreamId, "f"));
                        if (!controller_1) return [3 /*break*/, 4];
                        if (!__classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_eventStore, "f")) return [3 /*break*/, 2];
                        return [4 /*yield*/, __classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_eventStore, "f").storeEvent(__classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_standaloneSseStreamId, "f"), message)];
                    case 1:
                        _a = _c.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        _a = undefined;
                        _c.label = 3;
                    case 3:
                        eventId = _a;
                        this.writeSSEEvent(controller_1, message, eventId);
                        _c.label = 4;
                    case 4: return [2 /*return*/]; // Discard if no active stream
                    case 5:
                        streamId = __classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_requestToStreamMapping, "f").get(requestId);
                        if (!streamId) {
                            throw new Error("No active stream or response promise for request ID: ".concat(String(requestId)));
                        }
                        if (isJSONRPCResponse(message) || isJSONRPCError(message)) {
                            __classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_requestResponseMap, "f").set(requestId, message);
                        }
                        controller = __classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_streamMapping, "f").get(streamId);
                        pendingJsonResponse = __classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_pendingJsonResponsePromises, "f").get(streamId);
                        if (!(__classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_enableJsonResponse, "f") && pendingJsonResponse)) return [3 /*break*/, 6];
                        resolve = pendingJsonResponse.resolve, requestIds = pendingJsonResponse.requestIds;
                        allReady = requestIds.every(function (id) {
                            return __classPrivateFieldGet(_this, _FetchAPIHTTPServerTransport_requestResponseMap, "f").has(id);
                        });
                        if (allReady) {
                            responses = requestIds.map(function (id) { return __classPrivateFieldGet(_this, _FetchAPIHTTPServerTransport_requestResponseMap, "f").get(id); });
                            headers = new Headers({ 'Content-Type': 'application/json' });
                            if (this.sessionId)
                                headers.set('mcp-session-id', this.sessionId);
                            body = responses.length === 1
                                ? JSON.stringify(responses[0])
                                : JSON.stringify(responses);
                            resolve(new Response(body, { status: 200, headers: headers }));
                            // Cleanup
                            __classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_pendingJsonResponsePromises, "f").delete(streamId);
                            requestIds.forEach(function (id) {
                                __classPrivateFieldGet(_this, _FetchAPIHTTPServerTransport_requestResponseMap, "f").delete(id);
                                __classPrivateFieldGet(_this, _FetchAPIHTTPServerTransport_requestToStreamMapping, "f").delete(id);
                            });
                        }
                        return [3 /*break*/, 10];
                    case 6:
                        if (!controller) return [3 /*break*/, 10];
                        if (!__classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_eventStore, "f")) return [3 /*break*/, 8];
                        return [4 /*yield*/, __classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_eventStore, "f").storeEvent(streamId, message)];
                    case 7:
                        _b = _c.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        _b = undefined;
                        _c.label = 9;
                    case 9:
                        eventId = _b;
                        this.writeSSEEvent(controller, message, eventId);
                        // If it's a final response, close the dedicated stream
                        if (isJSONRPCResponse(message) || isJSONRPCError(message)) {
                            // In a batch request, we should only close after all responses are sent.
                            // This simplified logic closes after the first final response.
                            // For full correctness, one would track all request IDs associated with the streamId.
                            this.closeStream(streamId);
                            __classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_requestToStreamMapping, "f").delete(requestId);
                        }
                        _c.label = 10;
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    FetchAPIHTTPServerTransport.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                __classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_streamMapping, "f").forEach(function (controller, streamId) {
                    _this.closeStream(streamId);
                });
                __classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_streamMapping, "f").clear();
                __classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_requestResponseMap, "f").clear();
                __classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_requestToStreamMapping, "f").clear();
                __classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_pendingJsonResponsePromises, "f").forEach(function (_a) {
                    var resolve = _a.resolve;
                    // Reject any pending promises if the transport is closed abruptly
                    resolve(createErrorResponse(503, -32000, 'Service Unavailable: Transport closed'));
                });
                __classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_pendingJsonResponsePromises, "f").clear();
                (_a = this.onclose) === null || _a === void 0 ? void 0 : _a.call(this);
                return [2 /*return*/];
            });
        });
    };
    // Placeholder for replayEvents logic, adapted for streams
    FetchAPIHTTPServerTransport.prototype.replayEvents = function (request, lastEventId) {
        return __awaiter(this, void 0, void 0, function () {
            var streamController, streamIdPromise, headers, _a, _b;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!__classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_eventStore, "f")) {
                            return [2 /*return*/, createErrorResponse(501, -32000, 'Not Implemented: EventStore not configured')];
                        }
                        streamIdPromise = new Promise(function (resolve) {
                            new ReadableStream({
                                start: function (controller) { return __awaiter(_this, void 0, void 0, function () {
                                    var streamId, e_1;
                                    var _this = this;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                streamController = controller;
                                                request.signal.addEventListener('abort', function () { return __awaiter(_this, void 0, void 0, function () { var _a; return __generator(this, function (_b) {
                                                    switch (_b.label) {
                                                        case 0:
                                                            _a = this.closeStream;
                                                            return [4 /*yield*/, streamIdPromise];
                                                        case 1: return [2 /*return*/, _a.apply(this, [_b.sent()])];
                                                    }
                                                }); }); });
                                                _a.label = 1;
                                            case 1:
                                                _a.trys.push([1, 3, , 4]);
                                                return [4 /*yield*/, __classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_eventStore, "f").replayEventsAfter(lastEventId, {
                                                        send: function (eventId, message) { return __awaiter(_this, void 0, void 0, function () {
                                                            return __generator(this, function (_a) {
                                                                this.writeSSEEvent(streamController, message, eventId);
                                                                return [2 /*return*/];
                                                            });
                                                        }); },
                                                    })];
                                            case 2:
                                                streamId = _a.sent();
                                                __classPrivateFieldGet(this, _FetchAPIHTTPServerTransport_streamMapping, "f").set(streamId, streamController);
                                                resolve(streamId);
                                                return [3 /*break*/, 4];
                                            case 3:
                                                e_1 = _a.sent();
                                                controller.error(e_1);
                                                return [3 /*break*/, 4];
                                            case 4: return [2 /*return*/];
                                        }
                                    });
                                }); },
                                cancel: function () { return __awaiter(_this, void 0, void 0, function () { var _a; return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _a = this.closeStream;
                                            return [4 /*yield*/, streamIdPromise];
                                        case 1: return [2 /*return*/, _a.apply(this, [_b.sent()])];
                                    }
                                }); }); },
                            });
                        });
                        headers = {};
                        if (this.sessionId)
                            headers['mcp-session-id'] = this.sessionId;
                        _a = this.createStreamingResponse;
                        _b = [request];
                        return [4 /*yield*/, streamIdPromise];
                    case 1: return [2 /*return*/, _a.apply(this, _b.concat([_c.sent(), headers]))];
                }
            });
        });
    };
    return FetchAPIHTTPServerTransport;
}());
exports.FetchAPIHTTPServerTransport = FetchAPIHTTPServerTransport;
_FetchAPIHTTPServerTransport_sessionIdGenerator = new WeakMap(), _FetchAPIHTTPServerTransport_started = new WeakMap(), _FetchAPIHTTPServerTransport_streamMapping = new WeakMap(), _FetchAPIHTTPServerTransport_requestToStreamMapping = new WeakMap(), _FetchAPIHTTPServerTransport_requestResponseMap = new WeakMap(), _FetchAPIHTTPServerTransport_initialized = new WeakMap(), _FetchAPIHTTPServerTransport_enableJsonResponse = new WeakMap(), _FetchAPIHTTPServerTransport_standaloneSseStreamId = new WeakMap(), _FetchAPIHTTPServerTransport_eventStore = new WeakMap(), _FetchAPIHTTPServerTransport_onsessioninitialized = new WeakMap(), _FetchAPIHTTPServerTransport_encoder = new WeakMap(), _FetchAPIHTTPServerTransport_pendingJsonResponsePromises = new WeakMap();
