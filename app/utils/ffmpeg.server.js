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
exports.createEpisodeAudio = createEpisodeAudio;
var child_process_1 = require("child_process");
var fs_1 = require("fs");
var path_1 = require("path");
var fs_extra_1 = require("fs-extra");
var uuid = require("uuid");
var asset = function () {
    var p = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        p[_i] = arguments[_i];
    }
    return path_1.default.join.apply(path_1.default, __spreadArray([process.cwd(), 'app/assets'], p, false));
};
var cache = function () {
    var p = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        p[_i] = arguments[_i];
    }
    return path_1.default.join.apply(path_1.default, __spreadArray([process.cwd(), '.cache/calls'], p, false));
};
function createEpisodeAudio(callBase64, responseBase64) {
    return __awaiter(this, void 0, void 0, function () {
        var id, cacheDir, callPath, responsePath, outputPath, callBuffer, responseBuffer, buffer;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    id = uuid.v4();
                    cacheDir = cache(id);
                    fs_extra_1.default.ensureDirSync(cacheDir);
                    callPath = cache(id, 'call.mp3');
                    responsePath = cache(id, 'response.mp3');
                    outputPath = cache(id, 'output.mp3');
                    callBuffer = Buffer.from(callBase64.split(',')[1], 'base64');
                    responseBuffer = Buffer.from(responseBase64.split(',')[1], 'base64');
                    return [4 /*yield*/, fs_1.default.promises.writeFile(callPath, callBuffer)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, fs_1.default.promises.writeFile(responsePath, responseBuffer)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            // prettier-ignore
                            var args = [
                                '-i', asset('call-kent/intro.mp3'),
                                '-i', callPath,
                                '-i', asset('call-kent/interstitial.mp3'),
                                '-i', responsePath,
                                '-i', asset('call-kent/outro.mp3'),
                                '-filter_complex',
                                "\n        [1]silenceremove=1:0:-50dB[trimmedCall];\n        [3]silenceremove=1:0:-50dB[trimmedResponse];\n    \n        [trimmedCall]silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-50dB[noSilenceCall];\n        [trimmedResponse]silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-50dB[noSilenceResponse];\n    \n        [noSilenceCall]loudnorm=I=-16:LRA=11:TP=0.0[call];\n        [noSilenceResponse]loudnorm=I=-16:LRA=11:TP=0.0[response];\n    \n        [0][call]acrossfade=d=1:c2=nofade[a01];\n        [a01][2]acrossfade=d=1:c1=nofade[a02];\n        [a02][response]acrossfade=d=1:c2=nofade[a03];\n        [a03][4]acrossfade=d=1:c1=nofade\n      ",
                                outputPath,
                            ];
                            (0, child_process_1.spawn)('ffmpeg', args, { stdio: 'inherit' }).on('close', function (code) {
                                if (code === 0)
                                    resolve(null);
                                else
                                    reject(null);
                            });
                        })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, fs_1.default.promises.readFile(outputPath)];
                case 4:
                    buffer = _a.sent();
                    return [4 /*yield*/, fs_1.default.promises.rmdir(cacheDir, { recursive: true })];
                case 5:
                    _a.sent();
                    return [2 /*return*/, buffer];
            }
        });
    });
}
