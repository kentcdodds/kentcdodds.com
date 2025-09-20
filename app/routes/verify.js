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
exports.loader = loader;
exports.action = action;
exports.default = Verify;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var React = require("react");
var button_tsx_1 = require("#app/components/button.tsx");
var form_elements_tsx_1 = require("#app/components/form-elements.tsx");
var grid_tsx_1 = require("#app/components/grid.tsx");
var header_section_tsx_1 = require("#app/components/sections/header-section.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var verification_server_ts_1 = require("#app/utils/verification.server.ts");
var codeQueryParam = 'code';
var typeQueryParam = 'type';
var targetQueryParam = 'target';
var redirectToQueryParam = 'redirectTo';
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var url, code, type, target, redirectTo, codeIsValid, verifySession, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        var _m, _o, _p, _q, _r, _s;
        var request = _b.request;
        return __generator(this, function (_t) {
            switch (_t.label) {
                case 0:
                    url = new URL(request.url);
                    code = url.searchParams.get(codeQueryParam);
                    type = url.searchParams.get(typeQueryParam);
                    target = url.searchParams.get(targetQueryParam);
                    redirectTo = url.searchParams.get(redirectToQueryParam);
                    if (!type || !target) {
                        throw new Response('Invalid verification link', { status: 400 });
                    }
                    if (!code) return [3 /*break*/, 8];
                    return [4 /*yield*/, (0, verification_server_ts_1.isCodeValid)({ code: code, type: type, target: target })];
                case 1:
                    codeIsValid = _t.sent();
                    if (!codeIsValid) return [3 /*break*/, 8];
                    return [4 /*yield*/, verification_server_ts_1.verifySessionStorage.getSession()];
                case 2:
                    verifySession = _t.sent();
                    verifySession.set('verified', { type: type, target: target });
                    if (!(type === 'reset-password')) return [3 /*break*/, 4];
                    _c = node_1.redirect;
                    _d = ['/reset-password'];
                    _m = {};
                    _o = {};
                    _e = 'Set-Cookie';
                    return [4 /*yield*/, verification_server_ts_1.verifySessionStorage.commitSession(verifySession)];
                case 3: return [2 /*return*/, _c.apply(void 0, _d.concat([(_m.headers = (_o[_e] = _t.sent(),
                            _o),
                            _m)]))];
                case 4:
                    if (!(type === 'onboarding')) return [3 /*break*/, 6];
                    _f = node_1.redirect;
                    _g = ['/signup'];
                    _p = {};
                    _q = {};
                    _h = 'Set-Cookie';
                    return [4 /*yield*/, verification_server_ts_1.verifySessionStorage.commitSession(verifySession)];
                case 5: return [2 /*return*/, _f.apply(void 0, _g.concat([(_p.headers = (_q[_h] = _t.sent(),
                            _q),
                            _p)]))];
                case 6:
                    _j = node_1.redirect;
                    _k = [redirectTo || '/me'];
                    _r = {};
                    _s = {};
                    _l = 'Set-Cookie';
                    return [4 /*yield*/, verification_server_ts_1.verifySessionStorage.commitSession(verifySession)];
                case 7: return [2 /*return*/, _j.apply(void 0, _k.concat([(_r.headers = (_s[_l] = _t.sent(),
                            _s),
                            _r)]))];
                case 8: return [2 /*return*/, (0, node_1.json)({ type: type, target: target, redirectTo: redirectTo })];
            }
        });
    });
}
function action(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var formData, code, type, target, redirectTo, codeIsValid, verifySession, _c, _d, _e, _f, _g, _h, _j, _k, _l, error_1;
        var _m, _o, _p, _q, _r, _s;
        var request = _b.request;
        return __generator(this, function (_t) {
            switch (_t.label) {
                case 0: return [4 /*yield*/, request.formData()];
                case 1:
                    formData = _t.sent();
                    code = formData.get('code');
                    type = formData.get('type');
                    target = formData.get('target');
                    redirectTo = formData.get('redirectTo');
                    if (typeof code !== 'string' || !code) {
                        return [2 /*return*/, (0, node_1.json)({ error: 'Code is required' }, { status: 400 })];
                    }
                    if (typeof type !== 'string' || !type) {
                        return [2 /*return*/, (0, node_1.json)({ error: 'Type is required' }, { status: 400 })];
                    }
                    if (typeof target !== 'string' || !target) {
                        return [2 /*return*/, (0, node_1.json)({ error: 'Target is required' }, { status: 400 })];
                    }
                    _t.label = 2;
                case 2:
                    _t.trys.push([2, 10, , 11]);
                    return [4 /*yield*/, (0, verification_server_ts_1.isCodeValid)({ code: code, type: type, target: target })];
                case 3:
                    codeIsValid = _t.sent();
                    if (!codeIsValid) {
                        return [2 /*return*/, (0, node_1.json)({ error: 'Invalid or expired code' }, { status: 400 })];
                    }
                    return [4 /*yield*/, verification_server_ts_1.verifySessionStorage.getSession()];
                case 4:
                    verifySession = _t.sent();
                    verifySession.set('verified', { type: type, target: target });
                    if (!(type === 'reset-password')) return [3 /*break*/, 6];
                    _c = node_1.redirect;
                    _d = ['/reset-password'];
                    _m = {};
                    _o = {};
                    _e = 'Set-Cookie';
                    return [4 /*yield*/, verification_server_ts_1.verifySessionStorage.commitSession(verifySession)];
                case 5: return [2 /*return*/, _c.apply(void 0, _d.concat([(_m.headers = (_o[_e] = _t.sent(),
                            _o),
                            _m)]))];
                case 6:
                    if (!(type === 'onboarding')) return [3 /*break*/, 8];
                    _f = node_1.redirect;
                    _g = ['/signup'];
                    _p = {};
                    _q = {};
                    _h = 'Set-Cookie';
                    return [4 /*yield*/, verification_server_ts_1.verifySessionStorage.commitSession(verifySession)];
                case 7: return [2 /*return*/, _f.apply(void 0, _g.concat([(_p.headers = (_q[_h] = _t.sent(),
                            _q),
                            _p)]))];
                case 8:
                    _j = node_1.redirect;
                    _k = [typeof redirectTo === 'string' ? redirectTo : '/me'];
                    _r = {};
                    _s = {};
                    _l = 'Set-Cookie';
                    return [4 /*yield*/, verification_server_ts_1.verifySessionStorage.commitSession(verifySession)];
                case 9: return [2 /*return*/, _j.apply(void 0, _k.concat([(_r.headers = (_s[_l] = _t.sent(),
                            _s),
                            _r)]))];
                case 10:
                    error_1 = _t.sent();
                    return [2 /*return*/, (0, node_1.json)({ error: (0, misc_tsx_1.getErrorMessage)(error_1) }, { status: 500 })];
                case 11: return [2 /*return*/];
            }
        });
    });
}
function Verify() {
    var data = (0, react_1.useLoaderData)();
    var actionData = (0, react_1.useActionData)();
    var codeRef = React.useRef(null);
    var _a = React.useState(''), code = _a[0], setCode = _a[1];
    return (<div className="mt-24 pt-6">
			<header_section_tsx_1.HeaderSection as="header" title="Verify your email" subTitle="Enter the verification code sent to your email." className="mb-16"/>
			<main>
				<grid_tsx_1.Grid>
					<div className="col-span-full lg:col-span-6">
						<react_1.Form method="POST">
							<input type="hidden" name="type" value={data.type}/>
							<input type="hidden" name="target" value={data.target}/>
							<input type="hidden" name="redirectTo" value={data.redirectTo || ''}/>

							<div className="mb-6">
								<form_elements_tsx_1.Label htmlFor="code">Verification Code</form_elements_tsx_1.Label>
								<form_elements_tsx_1.Input ref={codeRef} id="code" name="code" type="text" value={code} onChange={function (e) { return setCode(e.target.value); }} placeholder="Enter 6-digit code" autoComplete="one-time-code" autoFocus required/>
								{(actionData === null || actionData === void 0 ? void 0 : actionData.error) ? (<form_elements_tsx_1.InputError id="code-error">{actionData.error}</form_elements_tsx_1.InputError>) : null}
							</div>

							<button_tsx_1.Button type="submit" disabled={code.length !== 6}>
								Verify
							</button_tsx_1.Button>
						</react_1.Form>

						<div className="mt-8">
							<typography_tsx_1.H2 variant="secondary">
								Check your email for a 6-digit verification code.
							</typography_tsx_1.H2>
							<p className="mt-4 text-gray-600">
								The code was sent to <strong>{data.target}</strong>
							</p>
						</div>
					</div>
				</grid_tsx_1.Grid>
			</main>
		</div>);
}
