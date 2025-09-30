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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
exports.cache = exports.lruCache = void 0;
exports.getAllCacheKeys = getAllCacheKeys;
exports.searchCacheKeys = searchCacheKeys;
exports.shouldForceFresh = shouldForceFresh;
exports.cachified = cachified;
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var node_sqlite_1 = require("node:sqlite");
var cachified_1 = require("@epic-web/cachified");
var remember_1 = require("@epic-web/remember");
var lru_cache_1 = require("lru-cache");
var cache_sqlite_ts_1 = require("#app/routes/resources+/cache.sqlite.ts");
var litefs_js_server_js_1 = require("./litefs-js.server.js");
var misc_tsx_1 = require("./misc.tsx");
var session_server_ts_1 = require("./session.server.ts");
var timing_server_ts_1 = require("./timing.server.ts");
var CACHE_DATABASE_PATH = (0, misc_tsx_1.getRequiredServerEnvVar)('CACHE_DATABASE_PATH');
var cacheDb = (0, remember_1.remember)('cacheDb', createDatabase);
function createDatabase(tryAgain) {
    if (tryAgain === void 0) { tryAgain = true; }
    var parentDir = node_path_1.default.dirname(CACHE_DATABASE_PATH);
    node_fs_1.default.mkdirSync(parentDir, { recursive: true });
    var db = new node_sqlite_1.DatabaseSync(CACHE_DATABASE_PATH);
    var currentIsPrimary = (0, litefs_js_server_js_1.getInstanceInfoSync)().currentIsPrimary;
    if (!currentIsPrimary)
        return db;
    try {
        // create cache table with metadata JSON column and value JSON column if it does not exist already
        db.exec("\n      CREATE TABLE IF NOT EXISTS cache (\n        key TEXT PRIMARY KEY,\n        metadata TEXT,\n        value TEXT\n      )\n    ");
    }
    catch (error) {
        node_fs_1.default.unlinkSync(CACHE_DATABASE_PATH);
        if (tryAgain) {
            console.error("Error creating cache database, deleting the file at \"".concat(CACHE_DATABASE_PATH, "\" and trying again..."));
            return createDatabase(false);
        }
        throw error;
    }
    return db;
}
var lruInstance = (0, remember_1.remember)('lru-cache', function () { return new lru_cache_1.LRUCache({ max: 5000 }); });
exports.lruCache = {
    set: function (key, value) {
        var ttl = (0, cachified_1.totalTtl)(value.metadata);
        return lruInstance.set(key, value, {
            ttl: ttl === Infinity ? undefined : ttl,
            start: value.metadata.createdTime,
        });
    },
    get: function (key) {
        return lruInstance.get(key);
    },
    delete: function (key) {
        return lruInstance.delete(key);
    },
};
var isBuffer = function (obj) {
    return Buffer.isBuffer(obj) || obj instanceof Uint8Array;
};
function bufferReplacer(_key, value) {
    if (isBuffer(value)) {
        return {
            __isBuffer: true,
            data: value.toString('base64'),
        };
    }
    return value;
}
function bufferReviver(_key, value) {
    if (value &&
        typeof value === 'object' &&
        '__isBuffer' in value &&
        value.data) {
        return Buffer.from(value.data, 'base64');
    }
    return value;
}
var preparedGet = cacheDb.prepare('SELECT value, metadata FROM cache WHERE key = ?');
var preparedSet = cacheDb.prepare('INSERT OR REPLACE INTO cache (key, value, metadata) VALUES (?, ?, ?)');
var preparedDelete = cacheDb.prepare('DELETE FROM cache WHERE key = ?');
exports.cache = {
    name: 'SQLite cache',
    get: function (key) {
        var result = preparedGet.get(key);
        if (!result)
            return null;
        return {
            metadata: JSON.parse(result.metadata),
            value: JSON.parse(result.value, bufferReviver),
        };
    },
    set: function (key, entry) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, currentIsPrimary, primaryInstance;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, (0, litefs_js_server_js_1.getInstanceInfo)()];
                    case 1:
                        _a = _b.sent(), currentIsPrimary = _a.currentIsPrimary, primaryInstance = _a.primaryInstance;
                        if (currentIsPrimary) {
                            preparedSet.run(key, JSON.stringify(entry.value, bufferReplacer), JSON.stringify(entry.metadata));
                        }
                        else {
                            // fire-and-forget cache update
                            void cache_sqlite_ts_1.updatePrimaryCacheValue({
                                key: key,
                                cacheValue: entry,
                            }).then(function (response) {
                                if (!response.ok) {
                                    console.error("Error updating cache value for key \"".concat(key, "\" on primary instance (").concat(primaryInstance, "): ").concat(response.status, " ").concat(response.statusText), { entry: entry });
                                }
                            });
                        }
                        return [2 /*return*/];
                }
            });
        });
    },
    delete: function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, currentIsPrimary, primaryInstance;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, (0, litefs_js_server_js_1.getInstanceInfo)()];
                    case 1:
                        _a = _b.sent(), currentIsPrimary = _a.currentIsPrimary, primaryInstance = _a.primaryInstance;
                        if (currentIsPrimary) {
                            preparedDelete.run(key);
                        }
                        else {
                            // fire-and-forget cache update
                            void cache_sqlite_ts_1.updatePrimaryCacheValue({
                                key: key,
                                cacheValue: undefined,
                            }).then(function (response) {
                                if (!response.ok) {
                                    console.error("Error deleting cache value for key \"".concat(key, "\" on primary instance (").concat(primaryInstance, "): ").concat(response.status, " ").concat(response.statusText));
                                }
                            });
                        }
                        return [2 /*return*/];
                }
            });
        });
    },
};
var preparedAllKeys = cacheDb.prepare('SELECT key FROM cache LIMIT ?');
function getAllCacheKeys(limit) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, {
                    sqlite: preparedAllKeys
                        .all(limit)
                        .map(function (row) { return row.key; }),
                    lru: __spreadArray([], lruInstance.keys(), true),
                }];
        });
    });
}
var preparedKeySearch = cacheDb.prepare('SELECT key FROM cache WHERE key LIKE ? LIMIT ?');
function searchCacheKeys(search, limit) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, {
                    sqlite: preparedKeySearch
                        .all("%".concat(search, "%"), limit)
                        .map(function (row) { return row.key; }),
                    lru: __spreadArray([], lruInstance.keys(), true).filter(function (key) { return key.includes(search); }),
                }];
        });
    });
}
function shouldForceFresh(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var fresh;
        var _c;
        var forceFresh = _b.forceFresh, request = _b.request, key = _b.key;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (typeof forceFresh === 'boolean')
                        return [2 /*return*/, forceFresh];
                    if (typeof forceFresh === 'string')
                        return [2 /*return*/, forceFresh.split(',').includes(key)];
                    if (!request)
                        return [2 /*return*/, false];
                    fresh = new URL(request.url).searchParams.get('fresh');
                    if (typeof fresh !== 'string')
                        return [2 /*return*/, false];
                    return [4 /*yield*/, (0, session_server_ts_1.getUser)(request)];
                case 1:
                    if (((_c = (_d.sent())) === null || _c === void 0 ? void 0 : _c.role) !== 'ADMIN')
                        return [2 /*return*/, false];
                    if (fresh === '')
                        return [2 /*return*/, true];
                    return [2 /*return*/, fresh.split(',').includes(key)];
            }
        });
    });
}
function cachified(_a) {
    return __awaiter(this, void 0, void 0, function () {
        var cachifiedResolved, cachifiedPromise, _b, _c, result;
        var _d;
        var _this = this;
        var request = _a.request, timings = _a.timings, options = __rest(_a, ["request", "timings"]);
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    cachifiedResolved = false;
                    _b = cachified_1.cachified;
                    _c = [__assign({}, options)];
                    _d = {};
                    return [4 /*yield*/, shouldForceFresh({
                            forceFresh: options.forceFresh,
                            request: request,
                            key: options.key,
                        })];
                case 1:
                    cachifiedPromise = _b.apply(void 0, [__assign.apply(void 0, _c.concat([(_d.forceFresh = _e.sent(), _d.getFreshValue = function (context) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    // if we've already retrieved the cached value, then this may be called
                                    // after the response has already been sent so there's no point in timing
                                    // how long this is going to take
                                    if (!cachifiedResolved && timings) {
                                        return [2 /*return*/, (0, timing_server_ts_1.time)(function () { return options.getFreshValue(context); }, {
                                                timings: timings,
                                                type: "getFreshValue:".concat(options.key),
                                                desc: "request forced to wait for a fresh ".concat(options.key, " value"),
                                            })];
                                    }
                                    return [2 /*return*/, options.getFreshValue(context)];
                                });
                            }); }, _d)])), (0, cachified_1.verboseReporter)()]);
                    return [4 /*yield*/, (0, timing_server_ts_1.time)(cachifiedPromise, {
                            timings: timings,
                            type: "cache:".concat(options.key),
                            desc: "".concat(options.key, " cache retrieval"),
                        })];
                case 2:
                    result = _e.sent();
                    cachifiedResolved = true;
                    return [2 /*return*/, result];
            }
        });
    });
}
