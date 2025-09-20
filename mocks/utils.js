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
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFixture = updateFixture;
exports.readFixture = readFixture;
exports.requiredParam = requiredParam;
exports.requiredHeader = requiredHeader;
exports.requiredProperty = requiredProperty;
exports.isConnectedToTheInternet = isConnectedToTheInternet;
var dns_1 = require("dns");
var fs_1 = require("fs");
var path_1 = require("path");
var url_1 = require("url");
var connected = null;
function isConnectedToTheInternet() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(connected === null)) return [3 /*break*/, 2];
                    return [4 /*yield*/, new Promise(function (resolve) {
                            dns_1.default.lookupService('8.8.8.8', 53, function (err) {
                                resolve(!err);
                            });
                        })];
                case 1:
                    connected = _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/, connected];
            }
        });
    });
}
var __dirname = path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url));
var mswDataPath = path_1.default.join(__dirname, "./msw.local.json");
// !! side effect !!
var clearingFixture = fs_1.default.promises.writeFile(mswDataPath, '{}');
function updateFixture(updates) {
    return __awaiter(this, void 0, void 0, function () {
        var mswData;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, readFixture()];
                case 1:
                    mswData = _a.sent();
                    return [4 /*yield*/, fs_1.default.promises.writeFile(mswDataPath, JSON.stringify(__assign(__assign({}, mswData), updates), null, 2))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function readFixture() {
    return __awaiter(this, void 0, void 0, function () {
        var mswData, contents, error_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, clearingFixture];
                case 1:
                    _b.sent();
                    mswData = {};
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 6]);
                    return [4 /*yield*/, fs_1.default.promises.readFile(mswDataPath)];
                case 3:
                    contents = _b.sent();
                    mswData = JSON.parse(contents.toString());
                    return [3 /*break*/, 6];
                case 4:
                    error_1 = _b.sent();
                    console.error("Error reading and parsing the msw fixture. Clearing it.", (_a = error_1.stack) !== null && _a !== void 0 ? _a : error_1);
                    return [4 /*yield*/, fs_1.default.promises.writeFile(mswDataPath, '{}')];
                case 5:
                    _b.sent();
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/, mswData];
            }
        });
    });
}
function requiredParam(params, param) {
    if (!params.get(param)) {
        var paramsString = JSON.stringify(Object.fromEntries(params.entries()), null, 2);
        throw new Error("Param \"".concat(param, "\" required, but not found in ").concat(paramsString));
    }
}
function requiredHeader(headers, header) {
    if (!headers.get(header)) {
        var headersString = JSON.stringify(Object.fromEntries(headers.entries()), null, 2);
        throw new Error("Header \"".concat(header, "\" required, but not found in ").concat(headersString));
    }
}
function requiredProperty(object, property) {
    if (!object[property]) {
        var objectString = JSON.stringify(object);
        throw new Error("Property \"".concat(property, "\" required, but not found in ").concat(objectString));
    }
}
