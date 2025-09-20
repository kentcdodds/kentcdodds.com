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
exports.action = action;
exports.default = ContactRoute;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var button_tsx_1 = require("#app/components/button.tsx");
var form_elements_tsx_1 = require("#app/components/form-elements.tsx");
var grid_tsx_1 = require("#app/components/grid.tsx");
var hero_section_tsx_1 = require("#app/components/sections/hero-section.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var images_tsx_1 = require("#app/images.tsx");
var actions_server_ts_1 = require("#app/utils/actions.server.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var send_email_server_ts_1 = require("#app/utils/send-email.server.ts");
var seo_ts_1 = require("#app/utils/seo.ts");
var session_server_ts_1 = require("#app/utils/session.server.ts");
var use_root_data_ts_1 = require("#app/utils/use-root-data.ts");
function getErrorForSubject(subject) {
    if (!subject)
        return "Subject is required";
    if (subject.length <= 5)
        return "Subject is too short";
    if (subject.length > 120)
        return "Subject is too long";
    return null;
}
function getErrorForBody(body) {
    if (!body)
        return "Body is required";
    if (body.length <= 40)
        return "Body is too short";
    if (body.length > 1001)
        return "Body is too long";
    return null;
}
function action(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var user;
        var _this = this;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, session_server_ts_1.requireUser)(request)];
                case 1:
                    user = _c.sent();
                    return [2 /*return*/, (0, actions_server_ts_1.handleFormSubmission)({
                            request: request,
                            validators: {
                                subject: getErrorForSubject,
                                body: getErrorForBody,
                            },
                            handleFormValues: function (fields) { return __awaiter(_this, void 0, void 0, function () {
                                var subject, body, sender, noSpamMessage, actionData;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            subject = fields.subject, body = fields.body;
                                            sender = "\"".concat(user.firstName, "\" <").concat(user.email, ">");
                                            noSpamMessage = '- Sent via the KCD Contact Form';
                                            return [4 /*yield*/, (0, send_email_server_ts_1.sendEmail)({
                                                    from: sender,
                                                    to: "\"Kent C. Dodds\" <me@kentcdodds.com>",
                                                    subject: subject,
                                                    text: "".concat(body, "\n\n").concat(noSpamMessage),
                                                })];
                                        case 1:
                                            _a.sent();
                                            actionData = { fields: fields, status: 'success', errors: {} };
                                            return [2 /*return*/, (0, node_1.json)(actionData)];
                                    }
                                });
                            }); },
                        })];
            }
        });
    });
}
var headers = function () { return ({
    'Cache-Control': 'private, max-age=3600',
    Vary: 'Cookie',
}); };
exports.headers = headers;
var meta = function (_a) {
    var _b;
    var matches = _a.matches;
    var requestInfo = (_b = matches.find(function (m) { return m.id === 'root'; })) === null || _b === void 0 ? void 0 : _b.data.requestInfo;
    return (0, seo_ts_1.getSocialMetas)({
        title: 'Contact Kent C. Dodds',
        description: 'Send Kent C. Dodds a personal email.',
        url: (0, misc_tsx_1.getUrl)(requestInfo),
        image: (0, images_tsx_1.getGenericSocialImage)({
            url: (0, misc_tsx_1.getDisplayUrl)(requestInfo),
            featuredImage: 'unsplash/photo-1563225409-127c18758bd5',
            words: "Shoot Kent an email",
        }),
    });
};
exports.meta = meta;
function ContactRoute() {
    var _a, _b, _c, _d, _e, _f, _g;
    var contactFetcher = (0, react_1.useFetcher)();
    var user = (0, use_root_data_ts_1.useRootData)().user;
    var isDone = contactFetcher.state === 'idle' && contactFetcher.data != null;
    var emailSuccessfullySent = isDone && contactFetcher.data.status === 'success';
    return (<div>
			<hero_section_tsx_1.HeroSection title="Send me an email." subtitle="Like in the old days." image={<img {...(0, hero_section_tsx_1.getHeroImageProps)(images_tsx_1.images.kentProfile, {
            className: 'max-h-50vh rounded-bl-3xl rounded-br-[25%] rounded-tl-[25%] rounded-tr-3xl',
        })}/>}/>

			<main>
				<contactFetcher.Form method="POST" noValidate aria-describedby="contact-form-error">
					<grid_tsx_1.Grid>
						<div className="col-span-full mb-12 lg:col-span-8 lg:col-start-3">
							<typography_tsx_1.H2>Email me</typography_tsx_1.H2>
							<typography_tsx_1.Paragraph>
								{"\n                  I do my best to respond, but unfortunately I can't always\n                  respond to every email I receive. If you have a support\n                  request about my open source work, please open an issue\n                  on the GitHub repo instead. If you have a support need on one of\n                  my courses, please email the team ("}
								<a href="mailto:team@epicreact.dev">team@epicreact.dev</a>
								{", "}
								<a href="mailto:help@testingjavascript.com">
									help@testingjavascript.com
								</a>
								{", or "}
								<a href="mailto:support@egghead.io">support@egghead.io</a>
								{") instead. I'll just forward your message to them anyway."}
							</typography_tsx_1.Paragraph>
						</div>

						<div className="col-span-full lg:col-span-8 lg:col-start-3">
							{user ? (<>
									<form_elements_tsx_1.Field name="name" label="Name" placeholder="Your name" disabled={true} defaultValue={user.firstName}/>
									<form_elements_tsx_1.Field type="email" label="Email" placeholder="person.doe@example.com" disabled={true} defaultValue={user.email} name="email"/>
									<form_elements_tsx_1.Field name="subject" label="Subject" placeholder="No subject" defaultValue={(_b = (_a = contactFetcher.data) === null || _a === void 0 ? void 0 : _a.fields.subject) !== null && _b !== void 0 ? _b : ''} error={(_c = contactFetcher.data) === null || _c === void 0 ? void 0 : _c.errors.subject}/>
									<form_elements_tsx_1.Field name="body" label="Body" type="textarea" placeholder="A clear and concise message works wonders." rows={8} defaultValue={(_e = (_d = contactFetcher.data) === null || _d === void 0 ? void 0 : _d.fields.body) !== null && _e !== void 0 ? _e : ''} error={(_f = contactFetcher.data) === null || _f === void 0 ? void 0 : _f.errors.body}/>
									{emailSuccessfullySent ? ("Hooray, email sent! \uD83C\uDF89") : (
            // IDEA: show a loading state here
            <form_elements_tsx_1.ButtonGroup>
											<button_tsx_1.Button type="submit" disabled={contactFetcher.state !== 'idle'}>
												Send message
											</button_tsx_1.Button>
											<button_tsx_1.Button variant="secondary" type="reset">
												Reset form
											</button_tsx_1.Button>
										</form_elements_tsx_1.ButtonGroup>)}
									{((_g = contactFetcher.data) === null || _g === void 0 ? void 0 : _g.errors.generalError) ? (<form_elements_tsx_1.ErrorPanel id="contact-form-error">
											{contactFetcher.data.errors.generalError}
										</form_elements_tsx_1.ErrorPanel>) : null}
								</>) : (<div className="col-span-full mb-12 lg:col-span-8 lg:col-start-3">
									<typography_tsx_1.Paragraph>
										Note: due to spam issues, you have to confirm your email by{' '}
										<react_1.Link to="/login" className="underline">
											signing up for an account
										</react_1.Link>{' '}
										on my website first.
									</typography_tsx_1.Paragraph>
								</div>)}
						</div>
					</grid_tsx_1.Grid>
				</contactFetcher.Form>
			</main>
		</div>);
}
