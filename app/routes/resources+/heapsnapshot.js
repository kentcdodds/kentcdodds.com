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
var fs_1 = require("fs");
var os_1 = require("os");
var path_1 = require("path");
var stream_1 = require("stream");
var v8_1 = require("v8");
var node_1 = require("@remix-run/node");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var session_server_ts_1 = require("#app/utils/session.server.ts");
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var host, tempDir, filepath, snapshotPath, body, stream, _c, _d, _e;
        var _f, _g;
        var _h;
        var request = _b.request;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0: return [4 /*yield*/, (0, session_server_ts_1.requireAdminUser)(request)];
                case 1:
                    _j.sent();
                    host = (_h = request.headers.get('X-Forwarded-Host')) !== null && _h !== void 0 ? _h : request.headers.get('host');
                    tempDir = os_1.default.tmpdir();
                    filepath = path_1.default.join(tempDir, "".concat(host, "-").concat((0, misc_tsx_1.formatDate)(new Date(), 'yyyy-MM-dd HH_mm_ss_SSS'), ".heapsnapshot"));
                    snapshotPath = v8_1.default.writeHeapSnapshot(filepath);
                    if (!snapshotPath) {
                        throw new Response('No snapshot saved', { status: 500 });
                    }
                    body = new stream_1.PassThrough();
                    stream = fs_1.default.createReadStream(snapshotPath);
                    stream.on('open', function () { return stream.pipe(body); });
                    stream.on('error', function (err) { return body.end(err); });
                    stream.on('end', function () { return body.end(); });
                    _c = Response.bind;
                    _d = [void 0, (0, node_1.createReadableStreamFromReadable)(body)];
                    _f = {
                        status: 200
                    };
                    _g = {
                        'Content-Type': 'application/octet-stream',
                        'Content-Disposition': "attachment; filename=\"".concat(path_1.default.basename(snapshotPath), "\"")
                    };
                    _e = 'Content-Length';
                    return [4 /*yield*/, fs_1.default.promises.stat(snapshotPath)];
                case 2: return [2 /*return*/, new (_c.apply(Response, _d.concat([(_f.headers = (_g[_e] = (_j.sent()).size.toString(),
                            _g),
                            _f)])))()];
            }
        });
    });
}
