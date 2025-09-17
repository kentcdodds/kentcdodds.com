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
exports.updatePrimaryCacheValue = void 0;
exports.action = action;
var node_1 = require("@remix-run/node");
var vite_env_only_1 = require("vite-env-only");
var cache_server_ts_1 = require("#app/utils/cache.server.ts");
var litefs_js_server_ts_1 = require("#app/utils/litefs-js.server.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
function action(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var _c, currentIsPrimary, primaryInstance, token, isAuthorized, _d, key, cacheValue;
        var request = _b.request;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, (0, litefs_js_server_ts_1.getInstanceInfo)()];
                case 1:
                    _c = _e.sent(), currentIsPrimary = _c.currentIsPrimary, primaryInstance = _c.primaryInstance;
                    if (!currentIsPrimary) {
                        throw new Error("".concat(request.url, " should only be called on the primary instance (").concat(primaryInstance, ")}"));
                    }
                    token = (0, misc_tsx_1.getRequiredServerEnvVar)('INTERNAL_COMMAND_TOKEN');
                    isAuthorized = request.headers.get('Authorization') === "Bearer ".concat(token);
                    if (!isAuthorized) {
                        console.log("Unauthorized request to ".concat(request.url, ", redirecting to solid tunes \uD83C\uDFB6"));
                        // rick roll them
                        return [2 /*return*/, (0, node_1.redirect)('https://www.youtube.com/watch?v=dQw4w9WgXcQ')];
                    }
                    return [4 /*yield*/, request.json()];
                case 2:
                    _d = (_e.sent()), key = _d.key, cacheValue = _d.cacheValue;
                    if (!(cacheValue === undefined)) return [3 /*break*/, 4];
                    console.log("Deleting ".concat(key, " from the cache from remote"));
                    return [4 /*yield*/, cache_server_ts_1.cache.delete(key)];
                case 3:
                    _e.sent();
                    return [3 /*break*/, 6];
                case 4:
                    console.log("Setting ".concat(key, " in the cache from remote"));
                    return [4 /*yield*/, cache_server_ts_1.cache.set(key, cacheValue)];
                case 5:
                    _e.sent();
                    _e.label = 6;
                case 6: return [2 /*return*/, (0, node_1.json)({ success: true })];
            }
        });
    });
}
exports.updatePrimaryCacheValue = (0, vite_env_only_1.serverOnly$)(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var _c, currentIsPrimary, primaryInstance, domain, token;
    var key = _b.key, cacheValue = _b.cacheValue;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0: return [4 /*yield*/, (0, litefs_js_server_ts_1.getInstanceInfo)()];
            case 1:
                _c = _d.sent(), currentIsPrimary = _c.currentIsPrimary, primaryInstance = _c.primaryInstance;
                if (currentIsPrimary) {
                    throw new Error("updatePrimaryCacheValue should not be called on the primary instance (".concat(primaryInstance, ")}"));
                }
                domain = (0, litefs_js_server_ts_1.getInternalInstanceDomain)(primaryInstance);
                token = (0, misc_tsx_1.getRequiredServerEnvVar)('INTERNAL_COMMAND_TOKEN');
                return [2 /*return*/, fetch("".concat(domain, "/resources/cache/sqlite"), {
                        method: 'POST',
                        headers: {
                            Authorization: "Bearer ".concat(token),
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ key: key, cacheValue: cacheValue }),
                    })];
        }
    });
}); });
