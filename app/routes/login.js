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
var button_1 = require("#app/components/button");
var form_elements_1 = require("#app/components/form-elements");
var grid_1 = require("#app/components/grid");
var icons_1 = require("#app/components/icons");
var hero_section_1 = require("#app/components/sections/hero-section");
var typography_1 = require("#app/components/typography");
var images_1 = require("#app/images");
var auth_server_ts_1 = require("#app/utils/auth.server.ts");
var login_server_1 = require("#app/utils/login.server");
var misc_1 = require("#app/utils/misc");
var seo_1 = require("#app/utils/seo");
var session_server_1 = require("#app/utils/session.server");
var user_validation_ts_1 = require("#app/utils/user-validation.ts");
var prisma_server_ts_1 = require("#app/utils/prisma.server.ts");
var send_email_server_ts_1 = require("#app/utils/send-email.server.ts");
var verification_server_ts_1 = require("#app/utils/verification.server.ts");
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var user, loginSession, headers;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, session_server_1.getUser)(request)];
                case 1:
                    user = _c.sent();
                    if (user)
                        return [2 /*return*/, (0, node_1.redirect)('/me')];
                    return [4 /*yield*/, (0, login_server_1.getLoginInfoSession)(request)];
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
exports.headers = misc_1.reuseUsefulLoaderHeaders;
var meta = function (_a) {
    var _b;
    var matches = _a.matches;
    var requestInfo = (_b = matches.find(function (m) { return m.id === 'root'; })) === null || _b === void 0 ? void 0 : _b.data.requestInfo;
    var domain = new URL((0, misc_1.getOrigin)(requestInfo)).host;
    return (0, seo_1.getSocialMetas)({
        title: "Login to ".concat(domain),
        description: "Sign up or login to ".concat(domain, " to join a team and learn together."),
        url: (0, misc_1.getUrl)(requestInfo),
        image: (0, images_1.getGenericSocialImage)({
            url: (0, misc_1.getDisplayUrl)(requestInfo),
            featuredImage: images_1.images.skis.id,
            words: "Login to your account on ".concat(domain),
        }),
    });
};
exports.meta = meta;
function action(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var formData, loginSession, intent, emailAddress, password, confirmPassword, firstName, lastName, _c, _d, _e, _f, result, session, headers_1, _g, _h, _j, _k, _l, _m, passwordValidation, _o, _p, _q, _r, result, session, headers_2, _s, _t, user, _u, verifyUrl, otp, error_1, _v, _w;
        var _x, _y, _z, _0, _1, _2, _3, _4, _5;
        var request = _b.request;
        return __generator(this, function (_6) {
            switch (_6.label) {
                case 0: return [4 /*yield*/, request.formData()];
                case 1:
                    formData = _6.sent();
                    return [4 /*yield*/, (0, login_server_1.getLoginInfoSession)(request)];
                case 2:
                    loginSession = _6.sent();
                    intent = formData.get('intent');
                    emailAddress = formData.get('email');
                    password = formData.get('password');
                    confirmPassword = formData.get('confirmPassword');
                    firstName = formData.get('firstName');
                    lastName = formData.get('lastName');
                    (0, tiny_invariant_1.default)(typeof emailAddress === 'string', 'Form submitted incorrectly');
                    if (emailAddress)
                        loginSession.setEmail(emailAddress);
                    if (!!emailAddress.match(/.+@.+/)) return [3 /*break*/, 4];
                    loginSession.flashError('A valid email is required');
                    _c = node_1.redirect;
                    _d = ["/login"];
                    _x = {
                        status: 400
                    };
                    return [4 /*yield*/, loginSession.getHeaders()];
                case 3: return [2 /*return*/, _c.apply(void 0, _d.concat([(_x.headers = _6.sent(),
                            _x)]))];
                case 4:
                    _6.trys.push([4, 38, , 40]);
                    if (!(intent === 'signin')) return [3 /*break*/, 15];
                    if (!(typeof password !== 'string' || password.length === 0)) return [3 /*break*/, 6];
                    loginSession.flashError('Password is required');
                    _e = node_1.redirect;
                    _f = ["/login"];
                    _y = {
                        status: 400
                    };
                    return [4 /*yield*/, loginSession.getHeaders()];
                case 5: return [2 /*return*/, _e.apply(void 0, _f.concat([(_y.headers = _6.sent(),
                            _y)]))];
                case 6: return [4 /*yield*/, (0, auth_server_ts_1.loginWithPassword)({ email: emailAddress, password: password })];
                case 7:
                    result = _6.sent();
                    if (!(result === null || result === void 0 ? void 0 : result.user)) return [3 /*break*/, 12];
                    return [4 /*yield*/, (0, session_server_1.getSession)(request)];
                case 8:
                    session = _6.sent();
                    return [4 /*yield*/, session.signIn(result.user)];
                case 9:
                    _6.sent();
                    headers_1 = new Headers();
                    return [4 /*yield*/, session.getHeaders(headers_1)];
                case 10:
                    _6.sent();
                    return [4 /*yield*/, loginSession.getHeaders(headers_1)];
                case 11:
                    _6.sent();
                    return [2 /*return*/, (0, node_1.redirect)('/me', { headers: headers_1 })];
                case 12:
                    loginSession.flashError('Invalid email or password');
                    _g = node_1.redirect;
                    _h = ["/login"];
                    _z = {
                        status: 400
                    };
                    return [4 /*yield*/, loginSession.getHeaders()];
                case 13: return [2 /*return*/, _g.apply(void 0, _h.concat([(_z.headers = _6.sent(),
                            _z)]))];
                case 14: return [3 /*break*/, 37];
                case 15:
                    if (!(intent === 'signup')) return [3 /*break*/, 32];
                    if (!(typeof password !== 'string' || password.length === 0)) return [3 /*break*/, 17];
                    loginSession.flashError('Password is required');
                    _j = node_1.redirect;
                    _k = ["/login"];
                    _0 = {
                        status: 400
                    };
                    return [4 /*yield*/, loginSession.getHeaders()];
                case 16: return [2 /*return*/, _j.apply(void 0, _k.concat([(_0.headers = _6.sent(),
                            _0)]))];
                case 17:
                    if (!(password !== confirmPassword)) return [3 /*break*/, 19];
                    loginSession.flashError('Passwords do not match');
                    _l = node_1.redirect;
                    _m = ["/login"];
                    _1 = {
                        status: 400
                    };
                    return [4 /*yield*/, loginSession.getHeaders()];
                case 18: return [2 /*return*/, _l.apply(void 0, _m.concat([(_1.headers = _6.sent(),
                            _1)]))];
                case 19:
                    passwordValidation = (0, user_validation_ts_1.validatePassword)(password);
                    if (!!passwordValidation.isValid) return [3 /*break*/, 21];
                    loginSession.flashError(passwordValidation.errors[0] || 'Password is not strong enough');
                    _o = node_1.redirect;
                    _p = ["/login"];
                    _2 = {
                        status: 400
                    };
                    return [4 /*yield*/, loginSession.getHeaders()];
                case 20: return [2 /*return*/, _o.apply(void 0, _p.concat([(_2.headers = _6.sent(),
                            _2)]))];
                case 21:
                    if (!(typeof firstName !== 'string' || !firstName)) return [3 /*break*/, 23];
                    loginSession.flashError('First name is required');
                    _q = node_1.redirect;
                    _r = ["/login"];
                    _3 = {
                        status: 400
                    };
                    return [4 /*yield*/, loginSession.getHeaders()];
                case 22: return [2 /*return*/, _q.apply(void 0, _r.concat([(_3.headers = _6.sent(),
                            _3)]))];
                case 23: return [4 /*yield*/, (0, auth_server_ts_1.signupWithPassword)({
                        email: emailAddress,
                        password: password,
                        firstName: firstName,
                        lastName: typeof lastName === 'string' ? lastName : '',
                    })];
                case 24:
                    result = _6.sent();
                    if (!(result === null || result === void 0 ? void 0 : result.user)) return [3 /*break*/, 29];
                    return [4 /*yield*/, (0, session_server_1.getSession)(request)];
                case 25:
                    session = _6.sent();
                    return [4 /*yield*/, session.signIn(result.user)];
                case 26:
                    _6.sent();
                    headers_2 = new Headers();
                    return [4 /*yield*/, session.getHeaders(headers_2)];
                case 27:
                    _6.sent();
                    return [4 /*yield*/, loginSession.getHeaders(headers_2)];
                case 28:
                    _6.sent();
                    return [2 /*return*/, (0, node_1.redirect)('/me', { headers: headers_2 })];
                case 29:
                    loginSession.flashError('Email address is already in use');
                    _s = node_1.redirect;
                    _t = ["/login"];
                    _4 = {
                        status: 400
                    };
                    return [4 /*yield*/, loginSession.getHeaders()];
                case 30: return [2 /*return*/, _s.apply(void 0, _t.concat([(_4.headers = _6.sent(),
                            _4)]))];
                case 31: return [3 /*break*/, 37];
                case 32:
                    if (!(intent === 'forgot-password')) return [3 /*break*/, 37];
                    return [4 /*yield*/, prisma_server_ts_1.prisma.user.findUnique({
                            where: { email: emailAddress },
                            select: { id: true, firstName: true },
                        })
                        // Always send a "success" message to prevent user enumeration
                        // but only send an email if the user actually exists
                    ];
                case 33:
                    user = _6.sent();
                    if (!user) return [3 /*break*/, 36];
                    return [4 /*yield*/, (0, verification_server_ts_1.prepareVerification)({
                            period: 600, // 10 minutes
                            request: request,
                            type: 'reset-password',
                            target: emailAddress,
                        })];
                case 34:
                    _u = _6.sent(), verifyUrl = _u.verifyUrl, otp = _u.otp;
                    return [4 /*yield*/, (0, send_email_server_ts_1.sendPasswordResetEmail)({
                            emailAddress: emailAddress,
                            verificationUrl: verifyUrl.toString(),
                            verificationCode: otp,
                            user: user,
                        })];
                case 35:
                    _6.sent();
                    _6.label = 36;
                case 36: return [2 /*return*/, (0, node_1.json)({
                        success: true,
                        message: "If an account with ".concat(emailAddress, " exists, we've sent a password reset email. Please check your inbox."),
                    })];
                case 37: return [3 /*break*/, 40];
                case 38:
                    error_1 = _6.sent();
                    loginSession.flashError((0, misc_1.getErrorMessage)(error_1));
                    _v = node_1.redirect;
                    _w = ["/login"];
                    _5 = {
                        status: 400
                    };
                    return [4 /*yield*/, loginSession.getHeaders()];
                case 39: return [2 /*return*/, _v.apply(void 0, _w.concat([(_5.headers = _6.sent(),
                            _5)]))];
                case 40: return [2 /*return*/, (0, node_1.redirect)('/login')];
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
    var actionData = (0, react_1.useActionData)();
    var inputRef = React.useRef(null);
    var navigate = (0, react_1.useNavigate)();
    var revalidate = (0, react_1.useRevalidator)().revalidate;
    var _b = React.useState(), error = _b[0], setError = _b[1];
    var _c = React.useState(null), passkeyMessage = _c[0], setPasskeyMessage = _c[1];
    var _d = React.useState('signin'), activeTab = _d[0], setActiveTab = _d[1];
    var _e = React.useState({
        email: (_a = data.email) !== null && _a !== void 0 ? _a : '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
    }), formValues = _e[0], setFormValues = _e[1];
    var emailIsValid = formValues.email.match(/.+@.+/);
    var passwordsMatch = formValues.password === formValues.confirmPassword;
    var formIsValid = (function () {
        switch (activeTab) {
            case 'signin':
                return emailIsValid && formValues.password;
            case 'signup':
                return emailIsValid && formValues.password && passwordsMatch && formValues.firstName;
            case 'forgot-password':
                return emailIsValid;
        }
    })();
    function handlePasskeyLogin() {
        return __awaiter(this, void 0, void 0, function () {
            var optionsResponse, json_1, options, authResponse, verificationResponse, verificationJson, e_1;
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
                        e_1 = _a.sent();
                        setPasskeyMessage(null);
                        console.error(e_1);
                        setError(e_1 instanceof Error ? e_1.message : 'Failed to authenticate with passkey');
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    }
    var tabConfig = {
        signin: {
            label: 'Sign In',
            description: 'Sign in to your existing account',
            buttonText: 'Sign In',
        },
        signup: {
            label: 'Sign Up',
            description: 'Create a new account',
            buttonText: 'Create Account',
        },
        'forgot-password': {
            label: 'Forgot Password',
            description: 'Reset your password',
            buttonText: 'Send Reset Email',
        },
    };
    return (<>
			<hero_section_1.HeroSection imageBuilder={images_1.images.skis} imageSize="medium" title="Welcome back!" subtitle="Sign in, create an account, or reset your password." action={<main>
						<div className="mb-8">
							<button_1.Button onClick={handlePasskeyLogin} id="passkey-login-button" type="submit" className="w-full justify-center">
								Login with Passkey <icons_1.PasskeyIcon />
							</button_1.Button>
							{error ? (<div className="mt-2">
									<form_elements_1.InputError id="passkey-login-error">{error}</form_elements_1.InputError>
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
											Or continue with email and password
										</span>
									</div>
								</div>

								{/* Tabs */}
								<div className="mb-6">
									<div className="border-b border-gray-200">
										<nav className="-mb-px flex space-x-8" aria-label="Tabs">
											{Object.entries(tabConfig).map(function (_a) {
                var tab = _a[0], config = _a[1];
                return (<button key={tab} type="button" onClick={function () { return setActiveTab(tab); }} className={(0, clsx_1.default)('whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm', activeTab === tab
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')} aria-current={activeTab === tab ? 'page' : undefined}>
													{config.label}
												</button>);
            })}
										</nav>
									</div>
								</div>

								{/* Success message for forgot password */}
								{(actionData === null || actionData === void 0 ? void 0 : actionData.success) ? (<div className="mb-6 rounded-md bg-green-50 p-4">
										<div className="text-green-800">
											<h3 className="text-sm font-medium">Check your email</h3>
											<div className="mt-2 text-sm">
												<p>{actionData.message}</p>
											</div>
										</div>
									</div>) : (<react_1.Form onChange={function (event) {
                    var _a, _b, _c, _d;
                    var form = event.currentTarget;
                    setFormValues({
                        email: form.email.value,
                        password: ((_a = form.password) === null || _a === void 0 ? void 0 : _a.value) || '',
                        confirmPassword: ((_b = form.confirmPassword) === null || _b === void 0 ? void 0 : _b.value) || '',
                        firstName: ((_c = form.firstName) === null || _c === void 0 ? void 0 : _c.value) || '',
                        lastName: ((_d = form.lastName) === null || _d === void 0 ? void 0 : _d.value) || '',
                    });
                }} action="/login" method="POST" className="mb-10 lg:mb-12">
										<input type="hidden" name="intent" value={activeTab}/>
										
										<div className="mb-6">
											<form_elements_1.Label htmlFor="email-address">Email address</form_elements_1.Label>
											<form_elements_1.Input ref={inputRef} autoFocus aria-describedby={data.error ? 'error-message' : undefined} id="email-address" name="email" type="email" autoComplete="email" defaultValue={formValues.email} required placeholder="Email address"/>
										</div>

										{activeTab === 'signup' && (<>
												<div className="mb-6">
													<form_elements_1.Label htmlFor="firstName">First Name</form_elements_1.Label>
													<form_elements_1.Input id="firstName" name="firstName" type="text" autoComplete="given-name" required placeholder="First name"/>
												</div>

												<div className="mb-6">
													<form_elements_1.Label htmlFor="lastName">Last Name</form_elements_1.Label>
													<form_elements_1.Input id="lastName" name="lastName" type="text" autoComplete="family-name" placeholder="Last name (optional)"/>
												</div>
											</>)}

										{(activeTab === 'signin' || activeTab === 'signup') && (<div className="mb-6">
												<form_elements_1.Label htmlFor="password">Password</form_elements_1.Label>
												<form_elements_1.Input id="password" name="password" type="password" autoComplete={activeTab === 'signin' ? 'current-password' : 'new-password'} required placeholder="Password"/>
											</div>)}

										{activeTab === 'signup' && (<div className="mb-6">
												<form_elements_1.Label htmlFor="confirmPassword">Confirm Password</form_elements_1.Label>
												<form_elements_1.Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required placeholder="Confirm password"/>
												{formValues.password && formValues.confirmPassword && !passwordsMatch && (<form_elements_1.InputError>Passwords do not match</form_elements_1.InputError>)}
											</div>)}

										<div className="flex flex-wrap gap-4">
											<button_1.Button type="submit" disabled={!formIsValid}>
												{tabConfig[activeTab].buttonText}
											</button_1.Button>
											<button_1.LinkButton type="reset" onClick={function () {
                    var _a;
                    setFormValues({
                        email: '',
                        password: '',
                        confirmPassword: '',
                        firstName: '',
                        lastName: ''
                    });
                    (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.focus();
                }}>
												Reset
											</button_1.LinkButton>
										</div>

										<div className="sr-only" aria-live="polite">
											{formIsValid
                    ? "".concat(tabConfig[activeTab].description, " form is now valid and ready to submit")
                    : "".concat(tabConfig[activeTab].description, " form is now invalid.")}
										</div>

										<div className="mt-2">
											{data.error ? (<form_elements_1.InputError id="error-message">{data.error}</form_elements_1.InputError>) : null}
										</div>
									</react_1.Form>)}
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
			<grid_1.Grid>
				<typography_1.Paragraph className="col-span-full mb-10 md:col-span-4">
					{activeTab === 'signin' && "\n\t\t\t\t\t\tTo sign in to your account, enter your email and password above.\n\t\t\t\t\t\tIf you don't have a password yet, click the \"Forgot Password\" tab to set one up.\n\t\t\t\t\t"}
					{activeTab === 'signup' && "\n\t\t\t\t\t\tCreate a new account by filling out the form above. \n\t\t\t\t\t\tYou'll need to provide a strong password that includes uppercase, lowercase, numbers, and special characters.\n\t\t\t\t\t"}
					{activeTab === 'forgot-password' && "\n\t\t\t\t\t\tEnter your email address and we'll send you instructions to reset your password.\n\t\t\t\t\t\tThis will work even if you've never set a password before.\n\t\t\t\t\t"}
				</typography_1.Paragraph>

				<typography_1.Paragraph className="col-span-full mb-10 text-sm md:col-span-4 lg:col-start-7" prose={false}>
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
				</typography_1.Paragraph>
			</grid_1.Grid>
		</>);
}
exports.default = Login;
