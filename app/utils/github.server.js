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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadMdxFileOrDirectory = downloadMdxFileOrDirectory;
exports.downloadDirList = downloadDirList;
exports.downloadFile = downloadFile;
var path_1 = require("path");
var plugin_throttling_1 = require("@octokit/plugin-throttling");
var rest_1 = require("@octokit/rest");
var ref = (_a = process.env.GITHUB_REF) !== null && _a !== void 0 ? _a : 'main';
var safePath = function (s) { return s.replace(/\\/g, '/'); };
var Octokit = rest_1.Octokit.plugin(plugin_throttling_1.throttling);
var octokit = new Octokit({
    auth: process.env.BOT_GITHUB_TOKEN,
    throttle: {
        onRateLimit: function (retryAfter, options) {
            var method = 'method' in options ? options.method : 'METHOD_UNKNOWN';
            var url = 'url' in options ? options.url : 'URL_UNKNOWN';
            console.warn("Request quota exhausted for request ".concat(method, " ").concat(url, ". Retrying after ").concat(retryAfter, " seconds."));
            return true;
        },
        onSecondaryRateLimit: function (retryAfter, options) {
            var method = 'method' in options ? options.method : 'METHOD_UNKNOWN';
            var url = 'url' in options ? options.url : 'URL_UNKNOWN';
            // does not retry, only logs a warning
            octokit.log.warn("Abuse detected for request ".concat(method, " ").concat(url));
        },
    },
});
function downloadFirstMdxFile(list) {
    return __awaiter(this, void 0, void 0, function () {
        var filesOnly, _loop_1, _i, _a, extension, state_1;
        return __generator(this, function (_b) {
            filesOnly = list.filter(function (_a) {
                var type = _a.type;
                return type === 'file';
            });
            _loop_1 = function (extension) {
                var file = filesOnly.find(function (_a) {
                    var name = _a.name;
                    return name.endsWith(extension);
                });
                if (file)
                    return { value: downloadFileBySha(file.sha) };
            };
            for (_i = 0, _a = ['.mdx', '.md']; _i < _a.length; _i++) {
                extension = _a[_i];
                state_1 = _loop_1(extension);
                if (typeof state_1 === "object")
                    return [2 /*return*/, state_1.value];
            }
            return [2 /*return*/, null];
        });
    });
}
/**
 *
 * @param relativeMdxFileOrDirectory the path to the content. For example:
 * content/workshops/react-fundamentals.mdx (pass "workshops/react-fudnamentals")
 * content/workshops/react-hooks/index.mdx (pass "workshops/react-hooks")
 * @returns A promise that resolves to an Array of GitHubFiles for the necessary files
 */
function downloadMdxFileOrDirectory(relativeMdxFileOrDirectory) {
    return __awaiter(this, void 0, void 0, function () {
        var mdxFileOrDirectory, parentDir, dirList, basename, mdxFileWithoutExt, potentials, exactMatch, dirPotential, content, files, entry;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mdxFileOrDirectory = "content/".concat(relativeMdxFileOrDirectory);
                    parentDir = path_1.default.dirname(mdxFileOrDirectory);
                    return [4 /*yield*/, downloadDirList(parentDir)];
                case 1:
                    dirList = _a.sent();
                    basename = path_1.default.basename(mdxFileOrDirectory);
                    mdxFileWithoutExt = path_1.default.parse(mdxFileOrDirectory).name;
                    potentials = dirList.filter(function (_a) {
                        var name = _a.name;
                        return name.startsWith(basename);
                    });
                    exactMatch = potentials.find(function (_a) {
                        var name = _a.name;
                        return path_1.default.parse(name).name === mdxFileWithoutExt;
                    });
                    dirPotential = potentials.find(function (_a) {
                        var type = _a.type;
                        return type === 'dir';
                    });
                    return [4 /*yield*/, downloadFirstMdxFile(exactMatch ? [exactMatch] : potentials)];
                case 2:
                    content = _a.sent();
                    files = [];
                    entry = mdxFileOrDirectory;
                    if (!content) return [3 /*break*/, 3];
                    // technically you can get the blog post by adding .mdx at the end... Weird
                    // but may as well handle it since that's easy...
                    entry = mdxFileOrDirectory.endsWith('.mdx')
                        ? mdxFileOrDirectory
                        : "".concat(mdxFileOrDirectory, ".mdx");
                    // /content/about.mdx => entry is about.mdx, but compileMdx needs
                    // the entry to be called "/content/index.mdx" so we'll set it to that
                    // because this is the entry for this path
                    files = [
                        {
                            path: safePath(path_1.default.join(mdxFileOrDirectory, 'index.mdx')),
                            content: content,
                        },
                    ];
                    return [3 /*break*/, 5];
                case 3:
                    if (!dirPotential) return [3 /*break*/, 5];
                    entry = dirPotential.path;
                    return [4 /*yield*/, downloadDirectory(mdxFileOrDirectory)];
                case 4:
                    files = _a.sent();
                    _a.label = 5;
                case 5: return [2 /*return*/, { entry: entry, files: files }];
            }
        });
    });
}
/**
 *
 * @param dir the directory to download.
 * This will recursively download all content at the given path.
 * @returns An array of file paths with their content
 */
function downloadDirectory(dir) {
    return __awaiter(this, void 0, void 0, function () {
        var dirList, result;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, downloadDirList(dir)];
                case 1:
                    dirList = _a.sent();
                    return [4 /*yield*/, Promise.all(dirList.map(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                            var _c, content;
                            var fileDir = _b.path, type = _b.type, sha = _b.sha;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        _c = type;
                                        switch (_c) {
                                            case 'file': return [3 /*break*/, 1];
                                            case 'dir': return [3 /*break*/, 3];
                                        }
                                        return [3 /*break*/, 4];
                                    case 1: return [4 /*yield*/, downloadFileBySha(sha)];
                                    case 2:
                                        content = _d.sent();
                                        return [2 /*return*/, { path: safePath(fileDir), content: content }];
                                    case 3:
                                        {
                                            return [2 /*return*/, downloadDirectory(fileDir)];
                                        }
                                        _d.label = 4;
                                    case 4:
                                        {
                                            throw new Error("Unexpected repo file type: ".concat(type));
                                        }
                                        _d.label = 5;
                                    case 5: return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result.flat()];
            }
        });
    });
}
/**
 *
 * @param sha the hash for the file (retrieved via `downloadDirList`)
 * @returns a promise that resolves to a string of the contents of the file
 */
function downloadFileBySha(sha) {
    return __awaiter(this, void 0, void 0, function () {
        var data, encoding;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, octokit.git.getBlob({
                        owner: 'kentcdodds',
                        repo: 'kentcdodds.com',
                        file_sha: sha,
                    })];
                case 1:
                    data = (_a.sent()).data;
                    encoding = data.encoding;
                    return [2 /*return*/, Buffer.from(data.content, encoding).toString()];
            }
        });
    });
}
// IDEA: possibly change this to a regular fetch since all my content is public anyway:
// https://raw.githubusercontent.com/{owner}/{repo}/{ref}/{path}
// nice thing is it's not rate limited
function downloadFile(path) {
    return __awaiter(this, void 0, void 0, function () {
        var data, encoding;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, octokit.repos.getContent({
                        owner: 'kentcdodds',
                        repo: 'kentcdodds.com',
                        path: path,
                        ref: ref,
                    })];
                case 1:
                    data = (_a.sent()).data;
                    if ('content' in data && 'encoding' in data) {
                        encoding = data.encoding;
                        return [2 /*return*/, Buffer.from(data.content, encoding).toString()];
                    }
                    console.error(data);
                    throw new Error("Tried to get ".concat(path, " but got back something that was unexpected. It doesn't have a content or encoding property"));
            }
        });
    });
}
/**
 *
 * @param path the full path to list
 * @returns a promise that resolves to a file ListItem of the files/directories in the given directory (not recursive)
 */
function downloadDirList(path) {
    return __awaiter(this, void 0, void 0, function () {
        var resp, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, octokit.repos.getContent({
                        owner: 'kentcdodds',
                        repo: 'kentcdodds.com',
                        path: path,
                        ref: ref,
                    })];
                case 1:
                    resp = _a.sent();
                    data = resp.data;
                    if (!Array.isArray(data)) {
                        throw new Error("Tried to download content from ".concat(path, ". GitHub did not return an array of files. This should never happen..."));
                    }
                    return [2 /*return*/, data];
            }
        });
    });
}
