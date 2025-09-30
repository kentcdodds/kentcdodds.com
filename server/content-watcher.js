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
exports.contentWatcher = contentWatcher;
var path_1 = require("path");
var chokidar_1 = require("chokidar");
var ws_1 = require("ws");
var utils_js_1 = require("../other/utils.js");
var safePath = function (s) { return s.replace(/\\/g, '/'); };
function refreshOnContentChanges(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var http;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('http'); })];
                case 1:
                    http = _a.sent();
                    return [2 /*return*/, (0, utils_js_1.postRefreshCache)({
                            http: http,
                            options: {
                                hostname: 'localhost',
                                port: 3000,
                            },
                            postData: {
                                contentPaths: [
                                    safePath(filePath).replace("".concat(safePath(process.cwd()), "/content/"), ''),
                                ],
                            },
                        }).then(function (response) {
                            return console.log("Content change request finished.", { response: response });
                        }, function (error) {
                            return console.error("Content change request errored", { error: error });
                        })];
            }
        });
    });
}
function addWatcher(wss) {
    var _this = this;
    var contentDir = safePath(path_1.default.join(process.cwd(), 'content'));
    var watcher = chokidar_1.default.watch(contentDir, { ignoreInitial: true });
    watcher.on('change', function (filePath) { return __awaiter(_this, void 0, void 0, function () {
        var _i, _a, client, relativePath;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, refreshOnContentChanges(filePath)];
                case 1:
                    _b.sent();
                    for (_i = 0, _a = wss.clients; _i < _a.length; _i++) {
                        client = _a[_i];
                        if (client.readyState === ws_1.WebSocket.OPEN) {
                            relativePath = safePath("/".concat(path_1.default.relative(contentDir, filePath.replace(path_1.default.extname(filePath), ''))));
                            client.send(JSON.stringify({
                                type: 'kentcdodds.com:file-change',
                                data: { filePath: filePath, relativePath: relativePath },
                            }));
                        }
                    }
                    return [2 /*return*/];
            }
        });
    }); });
}
function contentWatcher(server) {
    var wss = new ws_1.WebSocketServer({ server: server, path: '/__ws' });
    addWatcher(wss);
    return wss;
}
