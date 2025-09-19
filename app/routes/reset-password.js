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
exports.default = ResetPassword;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var React = require("react");
var button_tsx_1 = require("#app/components/button.tsx");
var form_elements_tsx_1 = require("#app/components/form-elements.tsx");
var grid_tsx_1 = require("#app/components/grid.tsx");
var header_section_tsx_1 = require("#app/components/sections/header-section.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var auth_server_ts_1 = require("#app/utils/auth.server.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var prisma_server_ts_1 = require("#app/utils/prisma.server.ts");
var session_server_ts_1 = require("#app/utils/session.server.ts");
var user_validation_ts_1 = require("#app/utils/user-validation.ts");
var verification_server_ts_1 = require("#app/utils/verification.server.ts");
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var verifySession, verified;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, verification_server_ts_1.verifySessionStorage.getSession(request.headers.get('Cookie'))];
                case 1:
                    verifySession = _c.sent();
                    verified = verifySession.get('verified');
                    if (!verified || verified.type !== 'reset-password') {
                        throw (0, node_1.redirect)('/login');
                    }
                    return [2 /*return*/, (0, node_1.json)({ email: verified.target })];
            }
        });
    });
}
function action(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var verifySession, verified, formData, password, confirmPassword, passwordError, isCommon, hashedPassword, email, user, session, headers, _c, _d, _e, error_1;
        var request = _b.request;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0: return [4 /*yield*/, verification_server_ts_1.verifySessionStorage.getSession(request.headers.get('Cookie'))];
                case 1:
                    verifySession = _f.sent();
                    verified = verifySession.get('verified');
                    if (!verified || verified.type !== 'reset-password') {
                        return [2 /*return*/, (0, node_1.json)({ error: 'Invalid or expired reset session' }, { status: 400 })];
                    }
                    return [4 /*yield*/, request.formData()];
                case 2:
                    formData = _f.sent();
                    password = formData.get('password');
                    confirmPassword = formData.get('confirmPassword');
                    if (typeof password !== 'string' || !password) {
                        return [2 /*return*/, (0, node_1.json)({ error: 'Password is required' }, { status: 400 })];
                    }
                    if (typeof confirmPassword !== 'string' || !confirmPassword) {
                        return [2 /*return*/, (0, node_1.json)({ error: 'Password confirmation is required' }, { status: 400 })];
                    }
                    if (password !== confirmPassword) {
                        return [2 /*return*/, (0, node_1.json)({ error: 'Passwords do not match' }, { status: 400 })];
                    }
                    passwordError = (0, user_validation_ts_1.getPasswordValidationMessage)(password);
                    if (passwordError) {
                        return [2 /*return*/, (0, node_1.json)({ error: passwordError }, { status: 400 })];
                    }
                    _f.label = 3;
                case 3:
                    _f.trys.push([3, 12, , 13]);
                    return [4 /*yield*/, (0, auth_server_ts_1.checkIsCommonPassword)(password)];
                case 4:
                    isCommon = _f.sent();
                    if (isCommon) {
                        return [2 /*return*/, (0, node_1.json)({
                                error: 'This password has been found in a data breach. Please choose a stronger password.',
                            }, { status: 400 })];
                    }
                    return [4 /*yield*/, (0, auth_server_ts_1.getPasswordHash)(password)];
                case 5:
                    hashedPassword = _f.sent();
                    email = verified.target;
                    return [4 /*yield*/, prisma_server_ts_1.prisma.user.findUnique({
                            where: { email: email },
                            select: { id: true },
                        })];
                case 6:
                    user = _f.sent();
                    if (!user) {
                        return [2 /*return*/, (0, node_1.json)({ error: 'User not found' }, { status: 400 })];
                    }
                    return [4 /*yield*/, prisma_server_ts_1.prisma.password.upsert({
                            where: { userId: user.id },
                            update: { hash: hashedPassword },
                            create: { userId: user.id, hash: hashedPassword },
                        })
                        // Clean up verification session and login user
                    ];
                case 7:
                    _f.sent();
                    return [4 /*yield*/, (0, session_server_ts_1.getSession)(request)];
                case 8:
                    session = _f.sent();
                    return [4 /*yield*/, session.signIn(user)];
                case 9:
                    _f.sent();
                    headers = new Headers();
                    return [4 /*yield*/, session.getHeaders(headers)];
                case 10:
                    _f.sent();
                    _d = (_c = headers).append;
                    _e = ['Set-Cookie'];
                    return [4 /*yield*/, verification_server_ts_1.verifySessionStorage.destroySession(verifySession)];
                case 11:
                    _d.apply(_c, _e.concat([_f.sent()]));
                    return [2 /*return*/, (0, node_1.redirect)('/me', { headers: headers })];
                case 12:
                    error_1 = _f.sent();
                    return [2 /*return*/, (0, node_1.json)({ error: (0, misc_tsx_1.getErrorMessage)(error_1) }, { status: 500 })];
                case 13: return [2 /*return*/];
            }
        });
    });
}
function ResetPassword() {
    var data = (0, react_1.useLoaderData)();
    var actionData = (0, react_1.useActionData)();
    var _a = React.useState({
        password: '',
        confirmPassword: '',
    }), formValues = _a[0], setFormValues = _a[1];
    var passwordError = (0, user_validation_ts_1.getPasswordValidationMessage)(formValues.password);
    var confirmPasswordError = formValues.confirmPassword &&
        formValues.password !== formValues.confirmPassword
        ? 'Passwords do not match'
        : null;
    var formIsValid = formValues.password &&
        formValues.confirmPassword &&
        !passwordError &&
        !confirmPasswordError;
    return (<div className="mt-24 pt-6">
			<header_section_tsx_1.HeaderSection as="header" title="Reset your password" subTitle="Enter a new password for your account." className="mb-16"/>
			<main>
				<grid_tsx_1.Grid>
					<div className="col-span-full lg:col-span-6">
						<react_1.Form method="POST" onChange={function (e) {
            var form = e.currentTarget;
            setFormValues({
                password: form.password.value,
                confirmPassword: form.confirmPassword.value,
            });
        }}>
							<div className="mb-6">
								<form_elements_tsx_1.Label htmlFor="password">New Password</form_elements_tsx_1.Label>
								<form_elements_tsx_1.Input id="password" name="password" type="password" autoComplete="new-password" placeholder="Enter new password" autoFocus required/>
								{passwordError && formValues.password ? (<form_elements_tsx_1.InputError>{passwordError}</form_elements_tsx_1.InputError>) : null}
							</div>

							<div className="mb-6">
								<form_elements_tsx_1.Label htmlFor="confirmPassword">Confirm Password</form_elements_tsx_1.Label>
								<form_elements_tsx_1.Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Confirm new password" required/>
								{confirmPasswordError ? (<form_elements_tsx_1.InputError>{confirmPasswordError}</form_elements_tsx_1.InputError>) : null}
							</div>

							{(actionData === null || actionData === void 0 ? void 0 : actionData.error) ? (<div className="mb-6">
									<form_elements_tsx_1.InputError>{actionData.error}</form_elements_tsx_1.InputError>
								</div>) : null}

							<button_tsx_1.Button type="submit" disabled={!formIsValid}>
								Reset Password
							</button_tsx_1.Button>
						</react_1.Form>

						<div className="mt-8">
							<typography_tsx_1.H2 variant="secondary">Password Requirements</typography_tsx_1.H2>
							<ul className="mt-4 space-y-2 text-sm text-gray-600">
								<li>• At least 6 characters long</li>
								<li>• Contains at least one uppercase letter</li>
								<li>• Contains at least one lowercase letter</li>
								<li>• Contains at least one number</li>
								<li>• Contains at least one special character</li>
								<li>• Not found in common password databases</li>
							</ul>
							<p className="mt-4 text-sm text-gray-600">
								Resetting password for: <strong>{data.email}</strong>
							</p>
						</div>
					</div>
				</grid_tsx_1.Grid>
			</main>
		</div>);
}
