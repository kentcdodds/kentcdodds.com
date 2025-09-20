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
exports.githubHandlers = void 0;
var fs_1 = require("fs");
var nodePath = require("path");
var url_1 = require("url");
var msw_1 = require("msw");
var __dirname = nodePath.dirname((0, url_1.fileURLToPath)(import.meta.url));
function isDirectory(d) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fs_1.promises.lstat(d)];
                case 1: return [2 /*return*/, (_b.sent()).isDirectory()];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function isFile(d) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fs_1.promises.lstat(d)];
                case 1: return [2 /*return*/, (_b.sent()).isFile()];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
var githubHandlers = [
    msw_1.http.get("https://api.github.com/repos/:owner/:repo/contents/:path", function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var url, owner, repo, path, isMockable, message, localPath, isLocalDir, isLocalFile, encoding, content, dirList, contentDescriptions;
        var request = _b.request, params = _b.params;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    url = new URL(request.url);
                    owner = params.owner, repo = params.repo;
                    if (typeof params.path !== 'string') {
                        throw new Error('req.params.path must be a string');
                    }
                    path = decodeURIComponent(params.path).trim();
                    isMockable = owner === 'kentcdodds' &&
                        repo === 'kentcdodds.com' &&
                        path.startsWith('content');
                    if (!isMockable) {
                        message = "Attempting to get content description for unmockable resource: ".concat(owner, "/").concat(repo, "/").concat(path);
                        console.error(message);
                        throw new Error(message);
                    }
                    localPath = nodePath.join(__dirname, '..', path);
                    return [4 /*yield*/, isDirectory(localPath)];
                case 1:
                    isLocalDir = _c.sent();
                    return [4 /*yield*/, isFile(localPath)];
                case 2:
                    isLocalFile = _c.sent();
                    if (!isLocalDir && !isLocalFile) {
                        return [2 /*return*/, msw_1.HttpResponse.json({
                                message: 'Not Found',
                                documentation_url: 'https://docs.github.com/rest/reference/repos#get-repository-content',
                            }, { status: 404 })];
                    }
                    if (!isLocalFile) return [3 /*break*/, 4];
                    encoding = 'base64';
                    return [4 /*yield*/, fs_1.promises.readFile(localPath, { encoding: 'utf-8' })];
                case 3:
                    content = _c.sent();
                    return [2 /*return*/, msw_1.HttpResponse.json({
                            content: Buffer.from(content, 'utf-8').toString(encoding),
                            encoding: encoding,
                        }, { status: 200 })];
                case 4: return [4 /*yield*/, fs_1.promises.readdir(localPath)];
                case 5:
                    dirList = _c.sent();
                    return [4 /*yield*/, Promise.all(dirList.map(function (name) { return __awaiter(void 0, void 0, void 0, function () {
                            var relativePath, sha, fullPath, isDir, size, _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        relativePath = nodePath.join(path, name);
                                        sha = relativePath;
                                        fullPath = nodePath.join(localPath, name);
                                        return [4 /*yield*/, isDirectory(fullPath)];
                                    case 1:
                                        isDir = _b.sent();
                                        if (!isDir) return [3 /*break*/, 2];
                                        _a = 0;
                                        return [3 /*break*/, 4];
                                    case 2: return [4 /*yield*/, fs_1.promises.stat(fullPath)];
                                    case 3:
                                        _a = (_b.sent()).size;
                                        _b.label = 4;
                                    case 4:
                                        size = _a;
                                        return [2 /*return*/, {
                                                name: name,
                                                path: relativePath,
                                                sha: sha,
                                                size: size,
                                                url: "https://api.github.com/repos/".concat(owner, "/").concat(repo, "/contents/").concat(path, "?").concat(url.searchParams),
                                                html_url: "https://github.com/".concat(owner, "/").concat(repo, "/tree/main/").concat(path),
                                                git_url: "https://api.github.com/repos/".concat(owner, "/").concat(repo, "/git/trees/").concat(sha),
                                                download_url: null,
                                                type: isDir ? 'dir' : 'file',
                                                _links: {
                                                    self: "https://api.github.com/repos/".concat(owner, "/").concat(repo, "/contents/").concat(path).concat(url.searchParams),
                                                    git: "https://api.github.com/repos/".concat(owner, "/").concat(repo, "/git/trees/").concat(sha),
                                                    html: "https://github.com/".concat(owner, "/").concat(repo, "/tree/main/").concat(path),
                                                },
                                            }];
                                }
                            });
                        }); }))];
                case 6:
                    contentDescriptions = _c.sent();
                    return [2 /*return*/, msw_1.HttpResponse.json(contentDescriptions)];
            }
        });
    }); }),
    msw_1.http.get("https://api.github.com/repos/:owner/:repo/git/blobs/:sha", function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var owner, repo, sha, message, relativePath, fullPath, encoding, size, content, resource;
        var params = _b.params;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    owner = params.owner, repo = params.repo;
                    if (typeof params.sha !== 'string') {
                        throw new Error('req.params.sha must be a string');
                    }
                    sha = decodeURIComponent(params.sha).trim().replace(/\\/g, '/');
                    // if the sha includes a "/" that means it's not a sha but a relativePath
                    // and therefore the client is getting content it got from the local
                    // mock environment, not the actual github API.
                    if (!sha.includes('/')) {
                        message = "Attempting to get content for sha, but no sha exists locally: ".concat(sha);
                        console.error(message);
                        throw new Error(message);
                    }
                    relativePath = sha;
                    fullPath = nodePath.join(__dirname, '..', relativePath);
                    encoding = 'base64';
                    return [4 /*yield*/, fs_1.promises.stat(fullPath)];
                case 1:
                    size = (_c.sent()).size;
                    return [4 /*yield*/, fs_1.promises.readFile(fullPath, { encoding: 'utf-8' })];
                case 2:
                    content = _c.sent();
                    resource = {
                        sha: sha,
                        node_id: "".concat(sha, "_node_id"),
                        size: size,
                        url: "https://api.github.com/repos/".concat(owner, "/").concat(repo, "/git/blobs/").concat(sha),
                        content: Buffer.from(content, 'utf-8').toString(encoding),
                        encoding: encoding,
                    };
                    return [2 /*return*/, msw_1.HttpResponse.json(resource)];
            }
        });
    }); }),
    msw_1.http.get("https://api.github.com/repos/:owner/:repo/contents/:path*", function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var owner, repo, relativePath, fullPath, encoding, size, content, sha, resource;
        var params = _b.params;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    owner = params.owner, repo = params.repo;
                    relativePath = params.path;
                    if (typeof relativePath !== 'string') {
                        throw new Error('req.params.path must be a string');
                    }
                    fullPath = nodePath.join(__dirname, '..', relativePath);
                    encoding = 'base64';
                    return [4 /*yield*/, fs_1.promises.stat(fullPath)];
                case 1:
                    size = (_c.sent()).size;
                    return [4 /*yield*/, fs_1.promises.readFile(fullPath, { encoding: 'utf-8' })];
                case 2:
                    content = _c.sent();
                    sha = "".concat(relativePath, "_sha");
                    resource = {
                        sha: sha,
                        node_id: "".concat(params.path, "_node_id"),
                        size: size,
                        url: "https://api.github.com/repos/".concat(owner, "/").concat(repo, "/git/blobs/").concat(sha),
                        content: Buffer.from(content, 'utf-8').toString(encoding),
                        encoding: encoding,
                    };
                    return [2 /*return*/, msw_1.HttpResponse.json(resource)];
            }
        });
    }); }),
];
exports.githubHandlers = githubHandlers;
