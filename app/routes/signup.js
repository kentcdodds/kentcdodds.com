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
exports.default = NewAccount;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var clsx_1 = require("clsx");
var React = require("react");
var button_tsx_1 = require("#app/components/button.tsx");
var form_elements_tsx_1 = require("#app/components/form-elements.tsx");
var grid_tsx_1 = require("#app/components/grid.tsx");
var icons_tsx_1 = require("#app/components/icons.tsx");
var header_section_tsx_1 = require("#app/components/sections/header-section.tsx");
var spacer_tsx_1 = require("#app/components/spacer.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var images_tsx_1 = require("#app/images.tsx");
var kit_server_ts_1 = require("#app/kit/kit.server.ts");
var actions_server_ts_1 = require("#app/utils/actions.server.ts");
var lodash_ts_1 = require("#app/utils/cjs/lodash.ts");
var client_server_ts_1 = require("#app/utils/client.server.ts");
var login_server_ts_1 = require("#app/utils/login.server.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var onboarding_ts_1 = require("#app/utils/onboarding.ts");
var prisma_server_ts_1 = require("#app/utils/prisma.server.ts");
var session_server_ts_1 = require("#app/utils/session.server.ts");
var team_provider_tsx_1 = require("#app/utils/team-provider.tsx");
exports.handle = {
    getSitemapEntries: function () { return null; },
};
function getErrorForFirstName(name) {
    if (!name)
        return "Name is required";
    if (name.length > 60)
        return "Name is too long";
    return null;
}
function getErrorForTeam(team) {
    if (!team)
        return "Team is required";
    if (!(0, misc_tsx_1.isTeam)(team))
        return "Please choose a valid team";
    return null;
}
var actionIds = {
    cancel: 'cancel',
    signUp: 'sign up',
};
function action(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var loginInfoSession, requestText, form, _c, _d, session, magicLink, email, error_1, _e, _f;
        var _g, _h;
        var _this = this;
        var request = _b.request;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0: return [4 /*yield*/, (0, login_server_ts_1.getLoginInfoSession)(request)];
                case 1:
                    loginInfoSession = _j.sent();
                    return [4 /*yield*/, request.text()];
                case 2:
                    requestText = _j.sent();
                    form = new URLSearchParams(requestText);
                    if (!(form.get('actionId') === actionIds.cancel)) return [3 /*break*/, 4];
                    loginInfoSession.clean();
                    _c = node_1.redirect;
                    _d = ['/'];
                    _g = {};
                    return [4 /*yield*/, loginInfoSession.getHeaders()];
                case 3: return [2 /*return*/, _c.apply(void 0, _d.concat([(_g.headers = _j.sent(),
                            _g)]))];
                case 4: return [4 /*yield*/, (0, session_server_ts_1.getSession)(request)];
                case 5:
                    session = _j.sent();
                    magicLink = loginInfoSession.getMagicLink();
                    _j.label = 6;
                case 6:
                    _j.trys.push([6, 8, , 10]);
                    if (typeof magicLink !== 'string') {
                        throw new Error('email and magicLink required.');
                    }
                    return [4 /*yield*/, (0, prisma_server_ts_1.validateMagicLink)(magicLink, loginInfoSession.getMagicLink())];
                case 7:
                    email = _j.sent();
                    return [3 /*break*/, 10];
                case 8:
                    error_1 = _j.sent();
                    console.error((0, misc_tsx_1.getErrorStack)(error_1));
                    loginInfoSession.clean();
                    loginInfoSession.flashError('Sign in link invalid. Please request a new one.');
                    _e = node_1.redirect;
                    _f = ['/login'];
                    _h = {};
                    return [4 /*yield*/, loginInfoSession.getHeaders()];
                case 9: return [2 /*return*/, _e.apply(void 0, _f.concat([(_h.headers = _j.sent(),
                            _h)]))];
                case 10: return [2 /*return*/, (0, actions_server_ts_1.handleFormSubmission)({
                        form: form,
                        validators: {
                            firstName: getErrorForFirstName,
                            team: getErrorForTeam,
                        },
                        handleFormValues: function (formData) { return __awaiter(_this, void 0, void 0, function () {
                            var firstName, team, user, sub, clientSession, clientId, headers, error_2, _a, _b;
                            var _c;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        firstName = formData.firstName, team = formData.team;
                                        _d.label = 1;
                                    case 1:
                                        _d.trys.push([1, 12, , 14]);
                                        return [4 /*yield*/, prisma_server_ts_1.prisma.user.create({
                                                data: { email: email, firstName: firstName, team: team },
                                            })
                                            // add user to mailing list
                                        ];
                                    case 2:
                                        user = _d.sent();
                                        return [4 /*yield*/, (0, kit_server_ts_1.tagKCDSiteSubscriber)({
                                                email: email,
                                                firstName: firstName,
                                                fields: { kcd_team: team, kcd_site_id: user.id },
                                            })];
                                    case 3:
                                        sub = _d.sent();
                                        return [4 /*yield*/, prisma_server_ts_1.prisma.user.update({
                                                data: { kitId: String(sub.id) },
                                                where: { id: user.id },
                                            })];
                                    case 4:
                                        _d.sent();
                                        return [4 /*yield*/, (0, client_server_ts_1.getClientSession)(request, null)];
                                    case 5:
                                        clientSession = _d.sent();
                                        clientId = clientSession.getClientId();
                                        if (!clientId) return [3 /*break*/, 7];
                                        return [4 /*yield*/, prisma_server_ts_1.prisma.postRead.updateMany({
                                                data: { userId: user.id, clientId: null },
                                                where: { clientId: clientId },
                                            })];
                                    case 6:
                                        _d.sent();
                                        _d.label = 7;
                                    case 7:
                                        clientSession.setUser(user);
                                        headers = new Headers();
                                        return [4 /*yield*/, session.signIn(user)];
                                    case 8:
                                        _d.sent();
                                        return [4 /*yield*/, session.getHeaders(headers)];
                                    case 9:
                                        _d.sent();
                                        return [4 /*yield*/, clientSession.getHeaders(headers)
                                            // IDEA: try using destroy... Didn't seem to work last time I tried though.
                                        ];
                                    case 10:
                                        _d.sent();
                                        // IDEA: try using destroy... Didn't seem to work last time I tried though.
                                        loginInfoSession.clean();
                                        return [4 /*yield*/, loginInfoSession.getHeaders(headers)];
                                    case 11:
                                        _d.sent();
                                        return [2 /*return*/, (0, node_1.redirect)('/me', { headers: headers })];
                                    case 12:
                                        error_2 = _d.sent();
                                        console.error((0, misc_tsx_1.getErrorStack)(error_2));
                                        loginInfoSession.flashError('There was a problem creating your account. Please try again.');
                                        _a = node_1.redirect;
                                        _b = ['/login'];
                                        _c = {};
                                        return [4 /*yield*/, loginInfoSession.getHeaders()];
                                    case 13: return [2 /*return*/, _a.apply(void 0, _b.concat([(_c.headers = _d.sent(),
                                                _c)]))];
                                    case 14: return [2 /*return*/];
                                }
                            });
                        }); },
                    })];
            }
        });
    });
}
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var user, loginInfoSession, magicLink, email, _c, _d, userForMagicLink, _e, _f, activities, activity, _g, _h;
        var _j, _k, _l;
        var _m;
        var request = _b.request;
        return __generator(this, function (_o) {
            switch (_o.label) {
                case 0: return [4 /*yield*/, (0, session_server_ts_1.getUser)(request)];
                case 1:
                    user = _o.sent();
                    if (user)
                        return [2 /*return*/, (0, node_1.redirect)('/me')];
                    return [4 /*yield*/, (0, login_server_ts_1.getLoginInfoSession)(request)];
                case 2:
                    loginInfoSession = _o.sent();
                    magicLink = loginInfoSession.getMagicLink();
                    email = loginInfoSession.getEmail();
                    if (!(!magicLink || !email)) return [3 /*break*/, 4];
                    loginInfoSession.clean();
                    loginInfoSession.flashError('Invalid magic link. Try again.');
                    _c = node_1.redirect;
                    _d = ['/login'];
                    _j = {};
                    return [4 /*yield*/, loginInfoSession.getHeaders()];
                case 3: return [2 /*return*/, _c.apply(void 0, _d.concat([(_j.headers = _o.sent(),
                            _j)]))];
                case 4: return [4 /*yield*/, prisma_server_ts_1.prisma.user.findFirst({
                        where: { email: email },
                        select: { id: true },
                    })];
                case 5:
                    userForMagicLink = _o.sent();
                    if (!userForMagicLink) return [3 /*break*/, 7];
                    // user exists, but they haven't clicked their magic link yet
                    // we don't want to tell them that a user exists with that email though
                    // so we'll invalidate the magic link and force them to try again.
                    loginInfoSession.clean();
                    loginInfoSession.flashError('Invalid magic link. Try again.');
                    _e = node_1.redirect;
                    _f = ['/login'];
                    _k = {};
                    return [4 /*yield*/, loginInfoSession.getHeaders()];
                case 6: return [2 /*return*/, _e.apply(void 0, _f.concat([(_k.headers = _o.sent(),
                            _k)]))];
                case 7:
                    activities = ['skiing', 'snowboarding', 'onewheeling'];
                    activity = (_m = activities[Math.floor(Math.random() * activities.length)]) !== null && _m !== void 0 ? _m : 'skiing';
                    _g = node_1.json;
                    _h = [{
                            email: email,
                            // have to put this shuffle in the loader to ensure server render is the same as the client one.
                            teamsInOrder: (0, lodash_ts_1.shuffle)(misc_tsx_1.teams),
                            teamMap: activity,
                        }];
                    _l = {};
                    return [4 /*yield*/, loginInfoSession.getHeaders()];
                case 8: return [2 /*return*/, _g.apply(void 0, _h.concat([(_l.headers = _o.sent(),
                            _l)]))];
            }
        });
    });
}
function TeamOption(_a) {
    var teamMap = _a.teamMap, value = _a.team, error = _a.error, selected = _a.selected;
    var team = {
        skiing: onboarding_ts_1.TEAM_SKIING_MAP,
        snowboarding: onboarding_ts_1.TEAM_SNOWBOARD_MAP,
        onewheeling: onboarding_ts_1.TEAM_ONEWHEELING_MAP,
    }[teamMap][value];
    return (<div className={(0, clsx_1.clsx)('focus-ring relative col-span-full mb-3 rounded-lg bg-gray-100 dark:bg-gray-800 lg:col-span-4 lg:mb-0', team.focusClassName, {
            'ring-2': selected,
        })}>
			{selected ? (<span className="absolute left-9 top-9 text-team-current">
					<icons_tsx_1.CheckCircledIcon />
				</span>) : null}

			<label className="block cursor-pointer px-12 pb-12 pt-20 text-center">
				<input className="sr-only" type="radio" name="team" value={value} aria-describedby={error ? 'team-error' : undefined}/>
				<img {...(0, images_tsx_1.getImgProps)(team.image, {
        className: 'mx-auto mb-16 block',
        widths: [350, 512, 685, 1370, 2055],
        sizes: [
            '(max-width: 1023px) 65vw',
            '(min-width:1023px) and (max-width:1620px) 20vw',
            '320px',
        ],
    })}/>
				<typography_tsx_1.H6 as="span">{team.label}</typography_tsx_1.H6>
			</label>
		</div>);
}
function NewAccount() {
    var _a;
    var data = (0, react_1.useLoaderData)();
    var actionData = (0, react_1.useActionData)();
    var _b = (0, team_provider_tsx_1.useTeam)(), setTeam = _b[1];
    var _c = React.useState({
        firstName: '',
        team: undefined,
    }), formValues = _c[0], setFormValues = _c[1];
    var formIsValid = formValues.firstName.trim().length > 0 &&
        misc_tsx_1.teams.includes(formValues.team);
    var team = formValues.team;
    React.useEffect(function () {
        if (team && misc_tsx_1.teams.includes(team))
            setTeam(team);
    }, [team, setTeam]);
    return (<div className="mt-24 pt-6">
			<header_section_tsx_1.HeaderSection as="header" title="Let's start with choosing a team." subTitle="You can't change this later." className="mb-16"/>
			<main>
				<react_1.Form method="POST" onChange={function (event) {
            var form = event.currentTarget;
            setFormValues({
                firstName: form.firstName.value,
                team: form.team.value,
            });
        }}>
					<input type="hidden" name="actionId" value={actionIds.signUp}/>
					<grid_tsx_1.Grid>
						{(actionData === null || actionData === void 0 ? void 0 : actionData.errors.team) ? (<div className="col-span-full mb-4 text-right">
								<form_elements_tsx_1.InputError id="team-error">
									{actionData.errors.team}
								</form_elements_tsx_1.InputError>
							</div>) : null}

						<fieldset className="contents">
							<legend className="sr-only">Team</legend>
							{data.teamsInOrder.map(function (teamOption) { return (<TeamOption key={teamOption} teamMap={data.teamMap} team={teamOption} error={actionData === null || actionData === void 0 ? void 0 : actionData.errors.team} selected={formValues.team === teamOption}/>); })}
						</fieldset>

						<div className="col-span-full h-20 lg:h-24"/>

						<div className="col-span-full mb-12">
							<typography_tsx_1.H2>{"Some basic info to remember you."}</typography_tsx_1.H2>
							<typography_tsx_1.H2 variant="secondary" as="p">
								{"You can change this later."}
							</typography_tsx_1.H2>
						</div>

						<div className="col-span-full mb-12 lg:col-span-5 lg:mb-20">
							<form_elements_tsx_1.Field name="firstName" label="First name" error={actionData === null || actionData === void 0 ? void 0 : actionData.errors.firstName} autoComplete="given-name" defaultValue={(_a = actionData === null || actionData === void 0 ? void 0 : actionData.fields.firstName) !== null && _a !== void 0 ? _a : ''} required/>
						</div>

						<div className="col-span-full mb-12 lg:col-span-5 lg:col-start-7 lg:mb-20">
							<form_elements_tsx_1.Field name="email" label="Email" description={<span>
										{"This controls your avatar via "}
										<a className="underlined font-bold" href="https://gravatar.com" target="_blank" rel="noreferrer noopener">
											Gravatar
										</a>
										{'.'}
									</span>} defaultValue={data.email} readOnly disabled/>
						</div>

						<div className="col-span-full">
							<button_tsx_1.Button type="submit" disabled={!formIsValid}>
								{"Create account"}
							</button_tsx_1.Button>
						</div>
						<p className="text-primary col-span-4 mt-10 text-xs font-medium tracking-wider">
							{"\n              NOTICE: By signing up for an account, your email address will be\n              added to Kent's mailing list (if it's not already) and\n              you'll occasionally receive promotional emails from Kent. You\n              can unsubscribe at any time.\n            "}
						</p>
					</grid_tsx_1.Grid>
				</react_1.Form>
				<spacer_tsx_1.Spacer size="2xs"/>
				<grid_tsx_1.Grid>
					<react_1.Form method="POST">
						<input type="hidden" name="actionId" value={actionIds.cancel}/>
						<button_tsx_1.Button type="submit" variant="danger">
							{"Cancel"}
						</button_tsx_1.Button>
					</react_1.Form>
				</grid_tsx_1.Grid>
				<spacer_tsx_1.Spacer size="lg"/>
				<grid_tsx_1.Grid>
					<div className="col-span-full lg:col-span-5 lg:col-start-8">
						<typography_tsx_1.H2 className="mb-32">{"You might be thinking, why pick a team?"}</typography_tsx_1.H2>

						<typography_tsx_1.H6 as="h3" className="mb-4">
							{"Own a post"}
						</typography_tsx_1.H6>
						<typography_tsx_1.Paragraph className="mb-12">
							{"\n              Your team associates your blog post reads with a group and it's\n              fun to know that your contributing to a group while learning\n              and reading. When your team has the highest ranking on a post,\n              you \"own\" that post. Kinda like an NFT, but not really.\n            "}
						</typography_tsx_1.Paragraph>
						<typography_tsx_1.H6 as="h3" className="mb-4">
							{"Exclusive team discord channels"}
						</typography_tsx_1.H6>
						<typography_tsx_1.Paragraph className="mb-12">
							{"\n              After signing up you can connect your discord account. When you do\n              this, your account will be given a team role. This will give you\n              access to your team channels where you can plan team blog post\n              raids and fun stuff like that.\n            "}
						</typography_tsx_1.Paragraph>
						<typography_tsx_1.H6 as="h3" className="mb-4">
							{"UI Theme"}
						</typography_tsx_1.H6>
						<typography_tsx_1.Paragraph className="mb-12">
							{"\n              The theme of this website is controlled by your team color\n              selection. So choose your favorite color and have that preference\n              shown throughout the site.\n            "}
						</typography_tsx_1.Paragraph>
					</div>

					<div className="col-span-full lg:col-span-6 lg:col-start-1 lg:row-start-1">
						<div className="aspect-[4/6]">
							<img {...(0, images_tsx_1.getImgProps)(images_tsx_1.images.kentPalmingSoccerBall, {
        className: 'rounded-lg object-cover',
        widths: [512, 650, 840, 1024, 1300, 1680, 2000, 2520],
        sizes: [
            '(max-width: 1023px) 80vw',
            '(min-width: 1024px) and (max-width: 1620px) 40vw',
            '650px',
        ],
        transformations: {
            resize: {
                type: 'fill',
                aspectRatio: '3:4',
            },
        },
    })}/>
						</div>
					</div>
				</grid_tsx_1.Grid>
			</main>
		</div>);
}
