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
exports.default = Onboarding;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var React = require("react");
var button_tsx_1 = require("#app/components/button.tsx");
var form_elements_tsx_1 = require("#app/components/form-elements.tsx");
var grid_tsx_1 = require("#app/components/grid.tsx");
var header_section_tsx_1 = require("#app/components/sections/header-section.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var prisma_server_ts_1 = require("#app/utils/prisma.server.ts");
var send_email_server_ts_1 = require("#app/utils/send-email.server.ts");
var verification_server_ts_1 = require("#app/utils/verification.server.ts");
var verifier_server_ts_1 = require("#app/utils/verifier.server.ts");
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var request = _b.request;
        return __generator(this, function (_c) {
            return [2 /*return*/, (0, node_1.json)({})];
        });
    });
}
function action(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var formData, email, verifiedStatus, error_1, existingUser, verifyUrl, error_2, verifyUrl, error_3;
        var _c;
        var request = _b.request;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, request.formData()];
                case 1:
                    formData = _d.sent();
                    email = formData.get('email');
                    if (typeof email !== 'string' || !email) {
                        return [2 /*return*/, (0, node_1.json)({ error: 'Email is required' }, { status: 400 })];
                    }
                    if (!email.match(/.+@.+/)) {
                        return [2 /*return*/, (0, node_1.json)({ error: 'Please enter a valid email address' }, { status: 400 })];
                    }
                    _d.label = 2;
                case 2:
                    _d.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, (0, verifier_server_ts_1.isEmailVerified)(email)];
                case 3:
                    verifiedStatus = _d.sent();
                    if (!verifiedStatus.verified) {
                        return [2 /*return*/, (0, node_1.json)({
                                error: "I tried to verify that email and got this error message: \"".concat(verifiedStatus.message, "\". If you think this is wrong, sign up for Kent's mailing list first (using the form on the bottom of the page) and once that's confirmed you'll be able to sign up."),
                            }, { status: 400 })];
                    }
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _d.sent();
                    console.error("There was an error verifying an email address:", error_1);
                    return [3 /*break*/, 5];
                case 5: return [4 /*yield*/, prisma_server_ts_1.prisma.user.findUnique({
                        where: { email: email },
                        select: { id: true, firstName: true, password: { select: { hash: true } } },
                    })];
                case 6:
                    existingUser = _d.sent();
                    if (!!existingUser) return [3 /*break*/, 11];
                    _d.label = 7;
                case 7:
                    _d.trys.push([7, 10, , 11]);
                    return [4 /*yield*/, (0, verification_server_ts_1.prepareVerification)({
                            period: 600, // 10 minutes
                            request: request,
                            type: 'onboarding',
                            target: email,
                        })];
                case 8:
                    verifyUrl = (_d.sent()).verifyUrl;
                    return [4 /*yield*/, (0, send_email_server_ts_1.sendPasswordResetEmail)({
                            emailAddress: email,
                            verificationUrl: verifyUrl.toString(),
                            verificationCode: '000000', // Not used for onboarding
                            user: null,
                        })];
                case 9:
                    _d.sent();
                    return [2 /*return*/, (0, node_1.json)({
                            success: "We sent a verification email to ".concat(email, ". Click the link in the email to continue setting up your account."),
                        })];
                case 10:
                    error_2 = _d.sent();
                    console.error('Error sending onboarding email:', error_2);
                    return [2 /*return*/, (0, node_1.json)({ error: 'Failed to send verification email. Please try again.' }, { status: 500 })];
                case 11:
                    if ((_c = existingUser.password) === null || _c === void 0 ? void 0 : _c.hash) {
                        // User already has a password, redirect to login
                        return [2 /*return*/, (0, node_1.json)({
                                error: 'You already have an account with a password. Please use the login page to sign in.',
                            })];
                    }
                    _d.label = 12;
                case 12:
                    _d.trys.push([12, 15, , 16]);
                    return [4 /*yield*/, (0, verification_server_ts_1.prepareVerification)({
                            period: 600, // 10 minutes
                            request: request,
                            type: 'reset-password',
                            target: email,
                        })];
                case 13:
                    verifyUrl = (_d.sent()).verifyUrl;
                    return [4 /*yield*/, (0, send_email_server_ts_1.sendPasswordResetEmail)({
                            emailAddress: email,
                            verificationUrl: verifyUrl.toString(),
                            verificationCode: '000000', // Not used for this flow
                            user: { firstName: existingUser.firstName },
                        })];
                case 14:
                    _d.sent();
                    return [2 /*return*/, (0, node_1.json)({
                            success: "We sent a password setup email to ".concat(email, ". Click the link in the email to set up your password."),
                        })];
                case 15:
                    error_3 = _d.sent();
                    console.error('Error sending password setup email:', error_3);
                    return [2 /*return*/, (0, node_1.json)({ error: 'Failed to send password setup email. Please try again.' }, { status: 500 })];
                case 16: return [2 /*return*/];
            }
        });
    });
}
function Onboarding() {
    var actionData = (0, react_1.useActionData)();
    var _a = React.useState(''), email = _a[0], setEmail = _a[1];
    var emailRef = React.useRef(null);
    return (<div className="mt-24 pt-6">
			<header_section_tsx_1.HeaderSection as="header" title="Set up your password" subTitle="We're moving from magic links to passwords for better reliability." className="mb-16"/>
			<main>
				<grid_tsx_1.Grid>
					<div className="col-span-full lg:col-span-8">
						<div className="mb-8">
							<typography_tsx_1.H2 className="mb-4">What's changing?</typography_tsx_1.H2>
							<typography_tsx_1.Paragraph className="mb-4">
								We're updating our authentication system to use passwords instead
								of magic links for improved reliability. If you already have an
								account, we'll help you set up a password.
							</typography_tsx_1.Paragraph>
							<typography_tsx_1.Paragraph className="mb-4">
								Enter your email below and we'll send you a link to:
							</typography_tsx_1.Paragraph>
							<ul className="mb-8 ml-6 list-disc space-y-2">
								<li>Set up a password if you're an existing user</li>
								<li>Create a new account if you're new</li>
							</ul>
						</div>

						<react_1.Form method="POST">
							<div className="mb-6">
								<form_elements_tsx_1.Label htmlFor="email">Email Address</form_elements_tsx_1.Label>
								<form_elements_tsx_1.Input ref={emailRef} id="email" name="email" type="email" value={email} onChange={function (e) { return setEmail(e.target.value); }} placeholder="Enter your email address" autoComplete="email" autoFocus required/>
								{actionData && 'error' in actionData ? (<form_elements_tsx_1.InputError id="email-error">{actionData.error}</form_elements_tsx_1.InputError>) : null}
								{actionData && 'success' in actionData ? (<div className="mt-2 text-green-600">{actionData.success}</div>) : null}
							</div>

							<button_tsx_1.Button type="submit" disabled={!email.match(/.+@.+/)}>
								Continue
							</button_tsx_1.Button>
						</react_1.Form>

						<div className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
							<typography_tsx_1.H2 variant="secondary" className="mb-2 text-yellow-800">
								Already have a password?
							</typography_tsx_1.H2>
							<typography_tsx_1.Paragraph className="text-yellow-700">
								If you've already set up a password, you can{' '}
								<a href="/login" className="underline">
									go directly to the login page
								</a>
								.
							</typography_tsx_1.Paragraph>
						</div>
					</div>
				</grid_tsx_1.Grid>
			</main>
		</div>);
}
