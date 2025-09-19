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
exports.handle = void 0;
exports.action = action;
exports.loader = loader;
exports.default = CallListScreen;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var prisma_server_ts_1 = require("#app/utils/prisma.server.ts");
var session_server_ts_1 = require("#app/utils/session.server.ts");
var use_root_data_ts_1 = require("#app/utils/use-root-data.ts");
exports.handle = {
    getSitemapEntries: function () { return null; },
};
function action(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var requestText, form, callId, call;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, session_server_ts_1.requireAdminUser)(request)];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, request.text()];
                case 2:
                    requestText = _c.sent();
                    form = new URLSearchParams(requestText);
                    callId = form.get('callId');
                    if (!callId) {
                        // this should be impossible
                        console.warn("No callId provided to call delete action.");
                        return [2 /*return*/, (0, node_1.redirect)(new URL(request.url).pathname)];
                    }
                    return [4 /*yield*/, prisma_server_ts_1.prisma.call.findFirst({
                            // NOTE: since we require an admin user, we don't need to check
                            // whether this user is the creator of the call
                            where: { id: callId },
                        })];
                case 3:
                    call = _c.sent();
                    if (!call) {
                        // Maybe they tried to delete a call they don't own?
                        console.warn("Failed to get a call to delete by callId: ".concat(callId));
                        return [2 /*return*/, (0, node_1.redirect)(new URL(request.url).pathname)];
                    }
                    return [4 /*yield*/, prisma_server_ts_1.prisma.call.delete({ where: { id: callId } })];
                case 4:
                    _c.sent();
                    return [2 /*return*/, (0, node_1.redirect)(new URL(request.url).pathname)];
            }
        });
    });
}
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var calls;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, session_server_ts_1.requireAdminUser)(request)];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, prisma_server_ts_1.prisma.call.findMany({
                            select: {
                                id: true,
                                title: true,
                                description: true,
                                updatedAt: true,
                                user: { select: { firstName: true, team: true, email: true } },
                            },
                            orderBy: { updatedAt: 'desc' },
                        })];
                case 2:
                    calls = _c.sent();
                    return [2 /*return*/, (0, node_1.json)({ calls: calls })];
            }
        });
    });
}
function CallListScreen() {
    var data = (0, react_1.useLoaderData)();
    var requestInfo = (0, use_root_data_ts_1.useRootData)().requestInfo;
    return (<div className="px-6">
			<main className="flex gap-8">
				<div className="w-52 overscroll-auto">
					{data.calls.length ? (<ul>
							{data.calls.map(function (call) {
                var avatar = (0, misc_tsx_1.getAvatarForUser)(call.user, {
                    origin: requestInfo.origin,
                });
                return (<li key={call.id} className={"mb-6 set-color-team-current-".concat(call.user.team.toLowerCase())}>
										<react_1.Link to={call.id} className="mb-1 block">
											<img alt={avatar.alt} src={avatar.src} className="block h-16 rounded-full"/>
											{call.title}
										</react_1.Link>
										<small>
											{call.description.slice(0, 30)}
											{call.description.length > 30 ? '...' : null}
										</small>
									</li>);
            })}
						</ul>) : (<p>No calls.</p>)}
				</div>
				<div className="flex-1">
					<react_1.Outlet />
				</div>
			</main>
		</div>);
}
