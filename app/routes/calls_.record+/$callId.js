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
exports.headers = exports.handle = void 0;
exports.action = action;
exports.loader = loader;
exports.default = Screen;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var React = require("react");
var button_tsx_1 = require("#app/components/button.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var prisma_server_ts_1 = require("#app/utils/prisma.server.ts");
var session_server_ts_1 = require("#app/utils/session.server.ts");
exports.handle = {
    getSitemapEntries: function () { return null; },
};
var actionTypes = {
    DELETE_RECORDING: 'delete recording',
};
function action(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var user, call;
        var params = _b.params, request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!params.callId) {
                        throw new Error('params.callId is not defined');
                    }
                    return [4 /*yield*/, (0, session_server_ts_1.requireUser)(request)];
                case 1:
                    user = _c.sent();
                    return [4 /*yield*/, prisma_server_ts_1.prisma.call.findFirst({
                            // NOTE: this is how we ensure the user is the owner of the call
                            // and is therefore authorized to delete it.
                            where: { userId: user.id, id: params.callId },
                        })];
                case 2:
                    call = _c.sent();
                    if (!call) {
                        // Maybe they tried to delete a call they don't own?
                        console.warn("Failed to get a call to delete by userId: ".concat(user.id, " and callId: ").concat(params.callId));
                        return [2 /*return*/, (0, node_1.redirect)('/calls/record')];
                    }
                    return [4 /*yield*/, prisma_server_ts_1.prisma.call.delete({ where: { id: params.callId } })];
                case 3:
                    _c.sent();
                    return [2 /*return*/, (0, node_1.redirect)('/calls/record')];
            }
        });
    });
}
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var user, call;
        var params = _b.params, request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!params.callId) {
                        throw new Error('params.callId is not defined');
                    }
                    return [4 /*yield*/, (0, session_server_ts_1.requireUser)(request)];
                case 1:
                    user = _c.sent();
                    return [4 /*yield*/, prisma_server_ts_1.prisma.call.findFirst({
                            // NOTE: this is how we ensure the user is the owner of the call
                            // and is therefore authorized to delete it.
                            where: { userId: user.id, id: params.callId },
                        })];
                case 2:
                    call = _c.sent();
                    if (!call) {
                        return [2 /*return*/, (0, node_1.redirect)('/calls/record')];
                    }
                    return [2 /*return*/, (0, node_1.json)({ call: call }, {
                            headers: {
                                'Cache-Control': 'public, max-age=10',
                            },
                        })];
            }
        });
    });
}
exports.headers = misc_tsx_1.reuseUsefulLoaderHeaders;
function Screen() {
    var data = (0, react_1.useLoaderData)();
    var _a = React.useState(null), audioURL = _a[0], setAudioURL = _a[1];
    var dc = (0, misc_tsx_1.useDoubleCheck)();
    React.useEffect(function () {
        var audio = new Audio(data.call.base64);
        setAudioURL(audio.src);
    }, [data.call.base64]);
    return (<section>
			<typography_tsx_1.Paragraph className="mb-8">{data.call.description}</typography_tsx_1.Paragraph>
			<div className="flex flex-wrap gap-4">
				<div className="w-full flex-1" style={{ minWidth: '16rem' }}>
					{audioURL ? (<audio src={audioURL} controls preload="metadata" className="w-full"/>) : null}
				</div>
				<react_1.Form method="delete">
					<input type="hidden" name="actionType" value={actionTypes.DELETE_RECORDING}/>
					<input type="hidden" name="callId" value={data.call.id}/>
					<button_tsx_1.Button type="submit" variant="danger" size="medium" autoFocus {...dc.getButtonProps()}>
						{dc.doubleCheck ? 'You sure?' : 'Delete'}
					</button_tsx_1.Button>
				</react_1.Form>
			</div>
		</section>);
}
