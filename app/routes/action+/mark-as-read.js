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
exports.action = action;
exports.markAsRead = markAsRead;
var node_1 = require("@remix-run/node");
var blog_server_ts_1 = require("#app/utils/blog.server.ts");
var blog_ts_1 = require("#app/utils/blog.ts");
var client_server_ts_1 = require("#app/utils/client.server.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var prisma_server_ts_1 = require("#app/utils/prisma.server.ts");
var session_server_ts_1 = require("#app/utils/session.server.ts");
function action(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var formData, slug, session, user, _c, beforePostLeader, beforeOverallLeader, client, clientId, _d, afterPostLeader, afterOverallLeader;
        var request = _b.request;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, request.formData()];
                case 1:
                    formData = _e.sent();
                    slug = formData.get('slug');
                    (0, misc_tsx_1.invariantResponse)(typeof slug === 'string', 'Missing slug');
                    return [4 /*yield*/, (0, session_server_ts_1.getSession)(request)];
                case 2:
                    session = _e.sent();
                    return [4 /*yield*/, session.getUser()];
                case 3:
                    user = _e.sent();
                    return [4 /*yield*/, Promise.all([
                            (0, blog_server_ts_1.getBlogReadRankings)({ request: request, slug: slug }).then(blog_ts_1.getRankingLeader),
                            (0, blog_server_ts_1.getBlogReadRankings)({ request: request }).then(blog_ts_1.getRankingLeader),
                        ])];
                case 4:
                    _c = _e.sent(), beforePostLeader = _c[0], beforeOverallLeader = _c[1];
                    if (!user) return [3 /*break*/, 6];
                    return [4 /*yield*/, (0, prisma_server_ts_1.addPostRead)({
                            slug: slug,
                            userId: user.id,
                        })];
                case 5:
                    _e.sent();
                    return [3 /*break*/, 9];
                case 6: return [4 /*yield*/, (0, client_server_ts_1.getClientSession)(request, user)];
                case 7:
                    client = _e.sent();
                    clientId = client.getClientId();
                    if (!clientId) return [3 /*break*/, 9];
                    return [4 /*yield*/, (0, prisma_server_ts_1.addPostRead)({ slug: slug, clientId: clientId })];
                case 8:
                    _e.sent();
                    _e.label = 9;
                case 9: return [4 /*yield*/, Promise.all([
                        (0, blog_server_ts_1.getBlogReadRankings)({
                            request: request,
                            slug: slug,
                            forceFresh: true,
                        }).then(blog_ts_1.getRankingLeader),
                        (0, blog_server_ts_1.getBlogReadRankings)({ request: request, forceFresh: true }).then(blog_ts_1.getRankingLeader),
                    ])];
                case 10:
                    _d = _e.sent(), afterPostLeader = _d[0], afterOverallLeader = _d[1];
                    if ((afterPostLeader === null || afterPostLeader === void 0 ? void 0 : afterPostLeader.team) &&
                        afterPostLeader.team !== (beforePostLeader === null || beforePostLeader === void 0 ? void 0 : beforePostLeader.team)) {
                        // fire and forget notification because the user doesn't care whether this finishes
                        void (0, blog_server_ts_1.notifyOfTeamLeaderChangeOnPost)({
                            request: request,
                            postSlug: slug,
                            reader: user,
                            newLeader: afterPostLeader.team,
                            prevLeader: beforePostLeader === null || beforePostLeader === void 0 ? void 0 : beforePostLeader.team,
                        });
                    }
                    if ((afterOverallLeader === null || afterOverallLeader === void 0 ? void 0 : afterOverallLeader.team) &&
                        afterOverallLeader.team !== (beforeOverallLeader === null || beforeOverallLeader === void 0 ? void 0 : beforeOverallLeader.team)) {
                        // fire and forget notification because the user doesn't care whether this finishes
                        void (0, blog_server_ts_1.notifyOfOverallTeamLeaderChange)({
                            request: request,
                            postSlug: slug,
                            reader: user,
                            newLeader: afterOverallLeader.team,
                            prevLeader: beforeOverallLeader === null || beforeOverallLeader === void 0 ? void 0 : beforeOverallLeader.team,
                        });
                    }
                    return [2 /*return*/, (0, node_1.json)({ success: true })];
            }
        });
    });
}
function markAsRead(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var slug = _b.slug;
        return __generator(this, function (_c) {
            return [2 /*return*/, fetch('/action/mark-as-read', {
                    method: 'POST',
                    body: new URLSearchParams({ slug: slug }),
                })];
        });
    });
}
