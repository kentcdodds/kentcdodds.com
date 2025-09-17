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
exports.meta = exports.headers = void 0;
exports.loader = loader;
exports.action = action;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var browser_1 = require("@simplewebauthn/browser");
var clsx_1 = require("clsx");
var framer_motion_1 = require("framer-motion");
var React = require("react");
var tiny_invariant_1 = require("tiny-invariant");
var zod_1 = require("zod");
var button_tsx_1 = require("#app/components/button.tsx");
var form_elements_tsx_1 = require("#app/components/form-elements.tsx");
var grid_tsx_1 = require("#app/components/grid.tsx");
var icons_js_1 = require("#app/components/icons.js");
var hero_section_tsx_1 = require("#app/components/sections/hero-section.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var images_tsx_1 = require("#app/images.tsx");
var login_server_ts_1 = require("#app/utils/login.server.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var seo_ts_1 = require("#app/utils/seo.ts");
var session_server_ts_1 = require("#app/utils/session.server.ts");
var verifier_server_ts_1 = require("#app/utils/verifier.server.ts");
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var user, loginSession, headers;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, session_server_ts_1.getUser)(request)];
                case 1:
                    user = _c.sent();
                    if (user)
                        return [2 /*return*/, (0, node_1.redirect)('/me')];
                    return [4 /*yield*/, (0, login_server_ts_1.getLoginInfoSession)(request)];
                case 2:
                    loginSession = _c.sent();
                    headers = new Headers({
                        'Cache-Control': 'private, max-age=3600',
                        Vary: 'Cookie',
                    });
                    return [4 /*yield*/, loginSession.getHeaders(headers)];
                case 3:
                    _c.sent();
                    return [2 /*return*/, (0, node_1.json)({
                            email: loginSession.getEmail(),
                            error: loginSession.getError(),
                        }, { headers: headers })];
            }
        });
    });
}
exports.headers = misc_tsx_1.reuseUsefulLoaderHeaders;
var meta = function (_a) {
    var _b;
    var matches = _a.matches;
    var requestInfo = (_b = matches.find(function (m) { return m.id === 'root'; })) === null || _b === void 0 ? void 0 : _b.data.requestInfo;
    var domain = new URL((0, misc_tsx_1.getOrigin)(requestInfo)).host;
    return (0, seo_ts_1.getSocialMetas)({
        title: "Login to ".concat(domain),
        description: "Sign up or login to ".concat(domain, " to join a team and learn together."),
        url: (0, misc_tsx_1.getUrl)(requestInfo),
        image: (0, images_tsx_1.getGenericSocialImage)({
            url: (0, misc_tsx_1.getDisplayUrl)(requestInfo),
            featuredImage: images_tsx_1.images.skis.id,
            words: "Login to your account on ".concat(domain),
        }),
    });
};
exports.meta = meta;
function action(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var formData, loginSession, emailAddress, _c, _d, failedHoneypot, _e, _f, verifiedStatus, errorMessage, _g, _h, error_1, domainUrl, magicLink, _j, _k, e_1, _l, _m;
        var _o, _p, _q, _r, _s;
        var request = _b.request;
        return __generator(this, function (_t) {
            switch (_t.label) {
                case 0: return [4 /*yield*/, request.formData()];
                case 1:
                    formData = _t.sent();
                    return [4 /*yield*/, (0, login_server_ts_1.getLoginInfoSession)(request)];
                case 2:
                    loginSession = _t.sent();
                    emailAddress = formData.get('email');
                    (0, tiny_invariant_1.default)(typeof emailAddress === 'string', 'Form submitted incorrectly');
                    if (emailAddress)
                        loginSession.setEmail(emailAddress);
                    if (!!emailAddress.match(/.+@.+/)) return [3 /*break*/, 4];
                    loginSession.flashError('A valid email is required');
                    _c = node_1.redirect;
                    _d = ["/login"];
                    _o = {
                        status: 400
                    };
                    return [4 /*yield*/, loginSession.getHeaders()];
                case 3: return [2 /*return*/, _c.apply(void 0, _d.concat([(_o.headers = _t.sent(),
                            _o)]))];
                case 4:
                    failedHoneypot = Boolean(formData.get('password'));
                    if (!failedHoneypot) return [3 /*break*/, 6];
                    console.info("FAILED HONEYPOT ON LOGIN", Object.fromEntries(formData.entries()));
                    _e = node_1.redirect;
                    _f = ["/login"];
                    _p = {};
                    return [4 /*yield*/, loginSession.getHeaders()];
                case 5: return [2 /*return*/, _e.apply(void 0, _f.concat([(_p.headers = _t.sent(),
                            _p)]))];
                case 6:
                    _t.trys.push([6, 10, , 11]);
                    return [4 /*yield*/, (0, verifier_server_ts_1.isEmailVerified)(emailAddress)];
                case 7:
                    verifiedStatus = _t.sent();
                    if (!!verifiedStatus.verified) return [3 /*break*/, 9];
                    errorMessage = "I tried to verify that email and got this error message: \"".concat(verifiedStatus.message, "\". If you think this is wrong, sign up for Kent's mailing list first (using the form on the bottom of the page) and once that's confirmed you'll be able to sign up.");
                    loginSession.flashError(errorMessage);
                    _g = node_1.redirect;
                    _h = ["/login"];
                    _q = {
                        status: 400
                    };
                    return [4 /*yield*/, loginSession.getHeaders()];
                case 8: return [2 /*return*/, _g.apply(void 0, _h.concat([(_q.headers = _t.sent(),
                            _q)]))];
                case 9: return [3 /*break*/, 11];
                case 10:
                    error_1 = _t.sent();
                    console.error("There was an error verifying an email address:", error_1);
                    return [3 /*break*/, 11];
                case 11:
                    _t.trys.push([11, 14, , 16]);
                    domainUrl = (0, misc_tsx_1.getDomainUrl)(request);
                    return [4 /*yield*/, (0, session_server_ts_1.sendToken)({ emailAddress: emailAddress, domainUrl: domainUrl })];
                case 12:
                    magicLink = _t.sent();
                    loginSession.setMagicLink(magicLink);
                    _j = node_1.redirect;
                    _k = ["/login"];
                    _r = {};
                    return [4 /*yield*/, loginSession.getHeaders()];
                case 13: return [2 /*return*/, _j.apply(void 0, _k.concat([(_r.headers = _t.sent(),
                            _r)]))];
                case 14:
                    e_1 = _t.sent();
                    loginSession.flashError((0, misc_tsx_1.getErrorMessage)(e_1));
                    _l = node_1.redirect;
                    _m = ["/login"];
                    _s = {
                        status: 400
                    };
                    return [4 /*yield*/, loginSession.getHeaders()];
                case 15: return [2 /*return*/, _l.apply(void 0, _m.concat([(_s.headers = _t.sent(),
                            _s)]))];
                case 16: return [2 /*return*/];
            }
        });
    });
}
var AuthenticationOptionsSchema = zod_1.z.object({
    options: zod_1.z.object({ challenge: zod_1.z.string() }),
});
function Login() {
    var _a;
    var data = (0, react_1.useLoaderData)();
    var inputRef = React.useRef(null);
    var navigate = (0, react_1.useNavigate)();
    var revalidate = (0, react_1.useRevalidator)().revalidate;
    var _b = React.useState(), error = _b[0], setError = _b[1];
    var _c = React.useState(null), passkeyMessage = _c[0], setPasskeyMessage = _c[1];
    var _d = React.useState({
        email: (_a = data.email) !== null && _a !== void 0 ? _a : '',
    }), formValues = _d[0], setFormValues = _d[1];
    var formIsValid = formValues.email.match(/.+@.+/);
    function handlePasskeyLogin() {
        return __awaiter(this, void 0, void 0, function () {
            var optionsResponse, json_1, options, authResponse, verificationResponse, verificationJson, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        setPasskeyMessage('Generating Authentication Options');
                        return [4 /*yield*/, fetch('/resources/webauthn/generate-authentication-options', { method: 'POST' })];
                    case 1:
                        optionsResponse = _a.sent();
                        return [4 /*yield*/, optionsResponse.json()];
                    case 2:
                        json_1 = _a.sent();
                        options = AuthenticationOptionsSchema.parse(json_1).options;
                        setPasskeyMessage('Requesting your authorization');
                        return [4 /*yield*/, (0, browser_1.startAuthentication)({ optionsJSON: options })];
                    case 3:
                        authResponse = _a.sent();
                        setPasskeyMessage('Verifying your passkey');
                        return [4 /*yield*/, fetch('/resources/webauthn/verify-authentication', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(authResponse),
                            })];
                    case 4:
                        verificationResponse = _a.sent();
                        return [4 /*yield*/, verificationResponse.json()];
                    case 5:
                        verificationJson = (_a.sent());
                        if (verificationJson.status === 'error') {
                            throw new Error(verificationJson.error);
                        }
                        setPasskeyMessage("You're logged in! Navigating to your account page.");
                        revalidate();
                        navigate('/me');
                        return [3 /*break*/, 7];
                    case 6:
                        e_2 = _a.sent();
                        setPasskeyMessage(null);
                        console.error(e_2);
                        setError(e_2 instanceof Error ? e_2.message : 'Failed to authenticate with passkey');
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    }
    return (<>
			<hero_section_tsx_1.HeroSection imageBuilder={images_tsx_1.images.skis} imageSize="medium" title="Log in to your account." subtitle="Or sign up for an account." action={<main>
						<div className="mb-8">
							<button_tsx_1.Button onClick={handlePasskeyLogin} id="passkey-login-button" type="submit" className="w-full justify-center">
								Login with Passkey <icons_js_1.PasskeyIcon />
							</button_tsx_1.Button>
							{error ? (<div className="mt-2">
									<form_elements_tsx_1.InputError id="passkey-login-error">{error}</form_elements_tsx_1.InputError>
								</div>) : null}
						</div>

						<div className="relative">
							<div className={(0, clsx_1.default)('transition-opacity duration-200', passkeyMessage ? 'opacity-0' : 'opacity-100')} {...(passkeyMessage ? { inert: true } : {})}>
								<div className="relative mb-8">
									<div className="absolute inset-0 flex items-center">
										<div className="w-full border-t border-gray-300"/>
									</div>
									<div className="relative flex justify-center text-sm">
										<span className="bg-white px-2 text-gray-500">
											Or continue with email
										</span>
									</div>
								</div>

								<react_1.Form onChange={function (event) {
                var form = event.currentTarget;
                setFormValues({ email: form.email.value });
            }} action="/login" method="POST" className="mb-10 lg:mb-12">
									<div className="mb-6">
										<div className="mb-4 flex flex-wrap items-baseline justify-between">
											<form_elements_tsx_1.Label htmlFor="email-address">Email address</form_elements_tsx_1.Label>
										</div>

										<form_elements_tsx_1.Input ref={inputRef} autoFocus aria-describedby={data.error ? 'error-message' : 'success-message'} id="email-address" name="email" type="email" autoComplete="email" defaultValue={formValues.email} required placeholder="Email address"/>
									</div>

									<div style={{ position: 'absolute', left: '-9999px' }}>
										<label htmlFor="password-field">Password</label>
										<input type="password" id="password-field" name="password" tabIndex={-1} autoComplete="nope"/>
									</div>

									<div className="flex flex-wrap gap-4">
										<button_tsx_1.Button type="submit">Email a login link</button_tsx_1.Button>
										<button_tsx_1.LinkButton type="reset" onClick={function () {
                var _a;
                setFormValues({ email: '' });
                (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.focus();
            }}>
											Reset
										</button_tsx_1.LinkButton>
									</div>

									<div className="sr-only" aria-live="polite">
										{formIsValid
                ? 'Sign in form is now valid and ready to submit'
                : 'Sign in form is now invalid.'}
									</div>

									<div className="mt-2">
										{data.error ? (<form_elements_tsx_1.InputError id="error-message">{data.error}</form_elements_tsx_1.InputError>) : data.email ? (<p id="success-message" className="text-lg text-gray-500 dark:text-slate-500">
												{"\u2728 A magic link has been sent to ".concat(data.email, ".")}
											</p>) : null}
									</div>
								</react_1.Form>
							</div>

							<framer_motion_1.AnimatePresence>
								{passkeyMessage ? (<framer_motion_1.motion.div className="absolute inset-0 flex items-center justify-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
										<framer_motion_1.AnimatePresence mode="wait" initial={false}>
											<framer_motion_1.motion.div key={passkeyMessage} className="text-center text-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} aria-live="polite">
												{passkeyMessage}
											</framer_motion_1.motion.div>
										</framer_motion_1.AnimatePresence>
									</framer_motion_1.motion.div>) : null}
							</framer_motion_1.AnimatePresence>
						</div>
					</main>}/>
			<grid_tsx_1.Grid>
				<typography_tsx_1.Paragraph className="col-span-full mb-10 md:col-span-4">
					{"\n              To sign in to your account or to create a new one fill in your\n              email above and we'll send you an email with a magic link to get\n              you started.\n            "}
				</typography_tsx_1.Paragraph>

				<typography_tsx_1.Paragraph className="col-span-full mb-10 text-sm md:col-span-4 lg:col-start-7" prose={false}>
					{"Tip: this account is a completely different account from your "}
					<a href="https://testingjavascript.com" className="underlined text-yellow-500" target="_blank" rel="noreferrer noopener">
						TestingJavaScript.com
					</a>
					{", "}
					<a href="https://epicreact.dev" className="underlined text-blue-500" target="_blank" rel="noreferrer noopener">
						EpicReact.dev
					</a>
					{", and "}
					<a href="https://epicweb.dev" className="underlined text-red-500" target="_blank" rel="noreferrer noopener">
						EpicWeb.dev
					</a>
					{"\n            accounts, but I recommend you use the same email address for all of\n            them because they all feed into my mailing list.\n          "}
				</typography_tsx_1.Paragraph>
			</grid_tsx_1.Grid>
		</>);
}
exports.default = Login;
