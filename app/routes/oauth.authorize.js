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
exports.loader = loader;
exports.action = action;
exports.default = OAuthAuthorizeRoute;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var button_tsx_1 = require("#app/components/button.tsx");
var session_server_ts_1 = require("#app/utils/session.server.ts");
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var user, url, clientId, redirectUri;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, session_server_ts_1.requireUser)(request)];
                case 1:
                    user = _c.sent();
                    url = new URL(request.url);
                    clientId = url.searchParams.get('client_id');
                    redirectUri = url.searchParams.get('redirect_uri');
                    if (!clientId || !redirectUri) {
                        throw new Response('Missing client_id or redirect_uri', { status: 400 });
                    }
                    return [2 /*return*/, (0, node_1.json)({ clientId: clientId, user: user })];
            }
        });
    });
}
function action(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var user, url, requestParams, formData, decision, params, response, _c, _d, _e, redirectTo, data, e_1, redirectUrl, params;
        var _f, _g;
        var request = _b.request;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0: return [4 /*yield*/, (0, session_server_ts_1.requireUser)(request)];
                case 1:
                    user = _h.sent();
                    url = new URL(request.url);
                    requestParams = Object.fromEntries(url.searchParams);
                    return [4 /*yield*/, request.formData()];
                case 2:
                    formData = _h.sent();
                    decision = formData.get('decision');
                    if (!requestParams.client_id || !requestParams.redirect_uri) {
                        return [2 /*return*/, (0, node_1.json)({
                                status: 'error',
                                message: 'Missing client_id or redirect_uri',
                            }, { status: 400 })];
                    }
                    if (!(decision === 'approve')) return [3 /*break*/, 10];
                    params = Object.fromEntries(url.searchParams);
                    return [4 /*yield*/, fetch('https://kcd-oauth-provider.kentcdodds.workers.dev/internal/complete-authorization', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                authorization: "Bearer ".concat(process.env.CF_INTERNAL_SECRET),
                            },
                            body: JSON.stringify({
                                requestParams: __assign(__assign({ state: '' }, params), { scope: (_g = (_f = params.scope) === null || _f === void 0 ? void 0 : _f.split(' ')) !== null && _g !== void 0 ? _g : [] }),
                                userId: user.id,
                                props: { userId: user.id },
                                metadata: {},
                            }),
                        })];
                case 3:
                    response = _h.sent();
                    if (!!response.ok) return [3 /*break*/, 5];
                    _d = (_c = console).error;
                    _e = ['Authorization failed'];
                    return [4 /*yield*/, response.text()];
                case 4:
                    _d.apply(_c, _e.concat([_h.sent()]));
                    return [2 /*return*/, (0, node_1.json)({
                            status: 'error',
                            message: 'Failed to complete authorization',
                        }, { status: 500 })];
                case 5:
                    redirectTo = undefined;
                    _h.label = 6;
                case 6:
                    _h.trys.push([6, 8, , 9]);
                    return [4 /*yield*/, response.json()];
                case 7:
                    data = (_h.sent());
                    if (typeof data.redirectTo === 'string') {
                        redirectTo = data.redirectTo;
                    }
                    return [3 /*break*/, 9];
                case 8:
                    e_1 = _h.sent();
                    console.error('Invalid response from authorization server', e_1);
                    return [3 /*break*/, 9];
                case 9:
                    if (!redirectTo) {
                        return [2 /*return*/, (0, node_1.json)({
                                status: 'error',
                                message: 'Invalid response from authorization server',
                            }, { status: 500 })];
                    }
                    redirectUrl = new URL(redirectTo);
                    if (requestParams.state) {
                        redirectUrl.searchParams.set('state', requestParams.state);
                    }
                    return [2 /*return*/, (0, node_1.redirect)(redirectUrl.toString())];
                case 10:
                    params = new URLSearchParams({ error: 'access_denied' });
                    if (requestParams.state) {
                        params.set('state', requestParams.state);
                    }
                    throw (0, node_1.redirect)("".concat(requestParams.redirect_uri, "?").concat(params.toString()));
            }
        });
    });
}
function OAuthAuthorizeRoute() {
    var _a = (0, react_1.useLoaderData)(), clientId = _a.clientId, user = _a.user;
    var actionData = (0, react_1.useActionData)();
    return (<div className="mx-auto max-w-md py-8">
			<h1 className="mb-4 text-2xl font-bold">Authorize Application</h1>
			<p className="mb-4">
				<strong>Application:</strong> {clientId}
			</p>
			<p className="mb-4">
				<strong>User:</strong> {user.email || user.firstName || user.id}
			</p>
			<p className="mb-6">
				This application is requesting <strong>full access</strong> to your
				account.
			</p>
			<react_1.Form method="post">
				<div className="flex gap-4">
					<button_tsx_1.Button type="submit" name="decision" value="approve" variant="primary">
						Approve
					</button_tsx_1.Button>
					<button_tsx_1.Button type="submit" name="decision" value="deny" variant="danger">
						Deny
					</button_tsx_1.Button>
				</div>
			</react_1.Form>

			{(actionData === null || actionData === void 0 ? void 0 : actionData.status) === 'error' ? (<div className="mt-4 rounded border px-4 py-2 text-sm text-red-500">
					{actionData.message}
				</div>) : null}
		</div>);
}
