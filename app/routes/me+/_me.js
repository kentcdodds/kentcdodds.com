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
exports.headers = exports.meta = exports.handle = void 0;
exports.loader = loader;
exports.action = action;
var dialog_1 = require("@reach/dialog");
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var clsx_1 = require("clsx");
var React = require("react");
var button_tsx_1 = require("#app/components/button.tsx");
var form_elements_tsx_1 = require("#app/components/form-elements.tsx");
var grid_tsx_1 = require("#app/components/grid.tsx");
var icons_tsx_1 = require("#app/components/icons.tsx");
var spacer_tsx_1 = require("#app/components/spacer.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var images_tsx_1 = require("#app/images.tsx");
var actions_server_ts_1 = require("#app/utils/actions.server.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var onboarding_ts_1 = require("#app/utils/onboarding.ts");
var prisma_server_ts_1 = require("#app/utils/prisma.server.ts");
var qrcode_server_ts_1 = require("#app/utils/qrcode.server.ts");
var seo_ts_1 = require("#app/utils/seo.ts");
var session_server_ts_1 = require("#app/utils/session.server.ts");
var timing_server_ts_1 = require("#app/utils/timing.server.ts");
var use_root_data_ts_1 = require("#app/utils/use-root-data.ts");
var user_info_server_ts_1 = require("#app/utils/user-info.server.ts");
exports.handle = {
    getSitemapEntries: function () { return null; },
};
var meta = function (_a) {
    var _b;
    var matches = _a.matches;
    var requestInfo = (_b = matches.find(function (m) { return m.id === 'root'; })) === null || _b === void 0 ? void 0 : _b.data.requestInfo;
    var domain = new URL((0, misc_tsx_1.getOrigin)(requestInfo)).host;
    return (0, seo_ts_1.getSocialMetas)({
        title: "Your account on ".concat(domain),
        description: "Personal account information on ".concat(domain, "."),
        url: (0, misc_tsx_1.getUrl)(requestInfo),
        image: (0, images_tsx_1.getGenericSocialImage)({
            url: (0, misc_tsx_1.getDisplayUrl)(requestInfo),
            featuredImage: images_tsx_1.images.kodySnowboardingGray(),
            words: "View your account info on ".concat(domain),
        }),
    });
};
exports.meta = meta;
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var timings, user, sessionCount, qrLoginCode, activities, activity;
        var _c;
        var request = _b.request;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    timings = {};
                    return [4 /*yield*/, (0, session_server_ts_1.requireUser)(request, { timings: timings })];
                case 1:
                    user = _d.sent();
                    return [4 /*yield*/, prisma_server_ts_1.prisma.session.count({
                            where: { userId: user.id },
                        })];
                case 2:
                    sessionCount = _d.sent();
                    return [4 /*yield*/, (0, qrcode_server_ts_1.getQrCodeDataURL)((0, prisma_server_ts_1.getMagicLink)({
                            emailAddress: user.email,
                            validateSessionMagicLink: false,
                            domainUrl: (0, misc_tsx_1.getDomainUrl)(request),
                        }))];
                case 3:
                    qrLoginCode = _d.sent();
                    activities = ['skiing', 'snowboarding', 'onewheeling'];
                    activity = (_c = activities[Math.floor(Math.random() * activities.length)]) !== null && _c !== void 0 ? _c : 'skiing';
                    return [2 /*return*/, (0, node_1.json)({
                            qrLoginCode: qrLoginCode,
                            sessionCount: sessionCount,
                            teamType: activity,
                        }, {
                            headers: {
                                'Cache-Control': 'private, max-age=3600',
                                Vary: 'Cookie',
                                'Server-Timing': (0, timing_server_ts_1.getServerTimeHeader)(timings),
                            },
                        })];
            }
        });
    });
}
exports.headers = misc_tsx_1.reuseUsefulLoaderHeaders;
var actionIds = {
    logout: 'logout',
    changeDetails: 'change details',
    deleteDiscordConnection: 'delete discord connection',
    deleteAccount: 'delete account',
    deleteSessions: 'delete sessions',
    refreshGravatar: 'refresh gravatar',
};
function getFirstNameError(firstName) {
    if (!(firstName === null || firstName === void 0 ? void 0 : firstName.length))
        return 'First name is required';
    return null;
}
function action(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var user, form, _c, actionId, session, searchParams, _d, _e, searchParams, searchParams, session, searchParams, _f, _g, error_1;
        var _h, _j;
        var _this = this;
        var request = _b.request;
        return __generator(this, function (_k) {
            switch (_k.label) {
                case 0: return [4 /*yield*/, (0, session_server_ts_1.requireUser)(request)];
                case 1:
                    user = _k.sent();
                    _c = URLSearchParams.bind;
                    return [4 /*yield*/, request.text()];
                case 2:
                    form = new (_c.apply(URLSearchParams, [void 0, _k.sent()]))();
                    actionId = form.get('actionId');
                    _k.label = 3;
                case 3:
                    _k.trys.push([3, 26, , 27]);
                    if (!(actionId === actionIds.logout)) return [3 /*break*/, 7];
                    return [4 /*yield*/, (0, session_server_ts_1.getSession)(request)];
                case 4:
                    session = _k.sent();
                    return [4 /*yield*/, session.signOut()];
                case 5:
                    _k.sent();
                    searchParams = new URLSearchParams({
                        message: "\uD83D\uDC4B See you again soon!",
                    });
                    _d = node_1.redirect;
                    _e = ["/?".concat(searchParams.toString())];
                    _h = {};
                    return [4 /*yield*/, session.getHeaders()];
                case 6: return [2 /*return*/, _d.apply(void 0, _e.concat([(_h.headers = _k.sent(),
                            _h)]))];
                case 7:
                    if (!(actionId === actionIds.deleteDiscordConnection && user.discordId)) return [3 /*break*/, 10];
                    return [4 /*yield*/, (0, user_info_server_ts_1.deleteDiscordCache)(user.discordId)];
                case 8:
                    _k.sent();
                    return [4 /*yield*/, prisma_server_ts_1.prisma.user.update({
                            where: { id: user.id },
                            data: { discordId: null },
                        })];
                case 9:
                    _k.sent();
                    searchParams = new URLSearchParams({
                        message: "\u2705 Connection deleted",
                    });
                    return [2 /*return*/, (0, node_1.redirect)("/me?".concat(searchParams.toString()))];
                case 10:
                    if (!(actionId === actionIds.changeDetails)) return [3 /*break*/, 12];
                    return [4 /*yield*/, (0, actions_server_ts_1.handleFormSubmission)({
                            form: form,
                            validators: { firstName: getFirstNameError },
                            handleFormValues: function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                                var searchParams;
                                var firstName = _b.firstName;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            if (!(firstName && user.firstName !== firstName)) return [3 /*break*/, 2];
                                            return [4 /*yield*/, prisma_server_ts_1.prisma.user.update({
                                                    where: { id: user.id },
                                                    data: { firstName: firstName },
                                                })];
                                        case 1:
                                            _c.sent();
                                            _c.label = 2;
                                        case 2:
                                            searchParams = new URLSearchParams({
                                                message: "\u2705 Sucessfully saved your info",
                                            });
                                            return [2 /*return*/, (0, node_1.redirect)("/me?".concat(searchParams.toString()))];
                                    }
                                });
                            }); },
                        })];
                case 11: return [2 /*return*/, _k.sent()];
                case 12:
                    if (!(actionId === actionIds.deleteSessions)) return [3 /*break*/, 14];
                    return [4 /*yield*/, (0, session_server_ts_1.deleteOtherSessions)(request)];
                case 13:
                    _k.sent();
                    searchParams = new URLSearchParams({
                        message: "\u2705 Sucessfully signed out of other sessions",
                    });
                    return [2 /*return*/, (0, node_1.redirect)("/me?".concat(searchParams.toString()))];
                case 14:
                    if (!(actionId === actionIds.deleteAccount)) return [3 /*break*/, 23];
                    return [4 /*yield*/, (0, session_server_ts_1.getSession)(request)];
                case 15:
                    session = _k.sent();
                    return [4 /*yield*/, session.signOut()];
                case 16:
                    _k.sent();
                    if (!user.discordId) return [3 /*break*/, 18];
                    return [4 /*yield*/, (0, user_info_server_ts_1.deleteDiscordCache)(user.discordId)];
                case 17:
                    _k.sent();
                    _k.label = 18;
                case 18:
                    if (!user.kitId) return [3 /*break*/, 20];
                    return [4 /*yield*/, (0, user_info_server_ts_1.deleteKitCache)(user.kitId)];
                case 19:
                    _k.sent();
                    _k.label = 20;
                case 20: return [4 /*yield*/, prisma_server_ts_1.prisma.user.delete({ where: { id: user.id } })];
                case 21:
                    _k.sent();
                    searchParams = new URLSearchParams({
                        message: "\u2705 Your KCD account and all associated data has been completely deleted from the KCD database.",
                    });
                    _f = node_1.redirect;
                    _g = ["/?".concat(searchParams.toString())];
                    _j = {};
                    return [4 /*yield*/, session.getHeaders()];
                case 22: return [2 /*return*/, _f.apply(void 0, _g.concat([(_j.headers = _k.sent(),
                            _j)]))];
                case 23:
                    if (!(actionId === actionIds.refreshGravatar)) return [3 /*break*/, 25];
                    return [4 /*yield*/, (0, user_info_server_ts_1.gravatarExistsForEmail)({ email: user.email, forceFresh: true })];
                case 24:
                    _k.sent();
                    _k.label = 25;
                case 25: return [2 /*return*/, (0, node_1.redirect)('/me')];
                case 26:
                    error_1 = _k.sent();
                    return [2 /*return*/, (0, node_1.json)({
                            fields: { firstName: null },
                            errors: { generalError: (0, misc_tsx_1.getErrorMessage)(error_1), firstName: null },
                        }, 500)];
                case 27: return [2 /*return*/];
            }
        });
    });
}
var SHOW_QR_DURATION = 15000;
function YouScreen() {
    var _a, _b, _c, _d;
    var data = (0, react_1.useLoaderData)();
    var teamMap = {
        skiing: onboarding_ts_1.TEAM_SKIING_MAP,
        snowboarding: onboarding_ts_1.TEAM_SNOWBOARD_MAP,
        onewheeling: onboarding_ts_1.TEAM_ONEWHEELING_MAP,
    }[data.teamType];
    var otherSessionsCount = data.sessionCount - 1;
    var actionData = (0, react_1.useActionData)();
    var _e = (0, use_root_data_ts_1.useRootData)(), requestInfo = _e.requestInfo, userInfo = _e.userInfo, user = _e.user;
    var team = (0, misc_tsx_1.getTeam)(user === null || user === void 0 ? void 0 : user.team);
    // this *should* never happen...
    if (!user)
        throw new Error('user required');
    if (!userInfo)
        throw new Error('userInfo required');
    if (!team)
        throw new Error('team required');
    var authorizeURL = (0, misc_tsx_1.getDiscordAuthorizeURL)(requestInfo.origin);
    var _f = React.useState(false), qrIsVisible = _f[0], setQrIsVisible = _f[1];
    var _g = React.useState(false), deleteModalOpen = _g[0], setDeleteModalOpen = _g[1];
    React.useEffect(function () {
        if (!qrIsVisible)
            return;
        var timeout = setTimeout(function () {
            setQrIsVisible(false);
        }, SHOW_QR_DURATION);
        return function () { return clearTimeout(timeout); };
    }, [qrIsVisible, setQrIsVisible]);
    return (<main>
			<div className="mb-64 mt-24 pt-6">
				<grid_tsx_1.Grid>
					<div className="col-span-full mb-12 lg:mb-20">
						<div className="flex flex-col-reverse items-start justify-between lg:flex-row lg:items-center">
							<div>
								<typography_tsx_1.H2>{"Here's your profile."}</typography_tsx_1.H2>
								<typography_tsx_1.H2 variant="secondary" as="p">
									{"Edit as you wish."}
								</typography_tsx_1.H2>
							</div>
							<react_1.Form action="/me" method="POST">
								<input type="hidden" name="actionId" value={actionIds.logout}/>
								<button_tsx_1.Button variant="secondary">
									<icons_tsx_1.LogoutIcon />
									<typography_tsx_1.H6 as="span">logout</typography_tsx_1.H6>
								</button_tsx_1.Button>
							</react_1.Form>
						</div>
					</div>
					<form_elements_tsx_1.InputError id="general-erorr">
						{actionData === null || actionData === void 0 ? void 0 : actionData.errors.generalError}
					</form_elements_tsx_1.InputError>

					<div className="col-span-full mb-24 lg:col-span-5 lg:mb-0">
						<react_1.Form action="/me" method="POST" noValidate aria-describedby="general-error">
							{/* This ensures that hitting "enter" on a field sends the expected submission */}
							<button hidden type="submit" name="actionId" value={actionIds.changeDetails}/>
							<form_elements_tsx_1.Field name="firstName" label="First name" defaultValue={(_a = actionData === null || actionData === void 0 ? void 0 : actionData.fields.firstName) !== null && _a !== void 0 ? _a : user.firstName} autoComplete="given-name" required error={actionData === null || actionData === void 0 ? void 0 : actionData.errors.firstName}/>
							<form_elements_tsx_1.Field name="email" label="Email address" autoComplete="email" required defaultValue={user.email} description={<div className="flex gap-1">
										<span>
											{"This controls your avatar via "}
											<a className="underlined font-bold" href="https://gravatar.com" target="_blank" rel="noreferrer noopener">
												Gravatar
											</a>
											{'.'}
										</span>
										<button type="submit" name="actionId" value={actionIds.refreshGravatar}>
											<icons_tsx_1.RefreshIcon />
										</button>
									</div>} readOnly disabled/>

							<form_elements_tsx_1.Field name="discord" label="Discord" defaultValue={(_d = (_c = (_b = userInfo.discord) === null || _b === void 0 ? void 0 : _b.username) !== null && _c !== void 0 ? _c : user.discordId) !== null && _d !== void 0 ? _d : ''} placeholder="n/a" readOnly disabled description={user.discordId ? (<div className="flex gap-2">
											<a className="underlined" href={"https://discord.com/users/".concat(user.discordId)}>
												connected
											</a>
											<button name="actionId" value={actionIds.deleteDiscordConnection} type="submit" aria-label="remove connection" className="text-secondary rotate-45 outline-none hover:scale-150 focus:scale-150">
												<icons_tsx_1.PlusIcon />
											</button>
										</div>) : (<a className="underlined" href={authorizeURL}>
											Connect to Discord
										</a>)}/>

							<button_tsx_1.Button className="mt-8" type="submit" name="actionId" value={actionIds.changeDetails}>
								Save changes
							</button_tsx_1.Button>
						</react_1.Form>
					</div>

					<div className="col-span-full lg:col-span-4 lg:col-start-8">
						<div className="flex justify-between gap-2 align-bottom">
							<form_elements_tsx_1.Label className="mb-4" htmlFor="chosen-team">
								Chosen team
							</form_elements_tsx_1.Label>
							<a className="underlined mb-5 animate-pulse text-lg hover:animate-none focus:animate-none" href="https://kcd.im/shirts">
								Get your team shirt 👕
							</a>
						</div>

						<input className="sr-only" type="radio" name="team" value={team} checked readOnly/>

						<div className="relative col-span-full mb-3 rounded-lg bg-gray-100 ring-2 ring-team-current ring-offset-4 ring-offset-team-current focus-within:outline-none focus-within:ring-2 dark:bg-gray-800 lg:col-span-4 lg:mb-0">
							<span className="absolute left-9 top-9 text-team-current">
								<icons_tsx_1.CheckCircledIcon />
							</span>

							<div className="block px-12 pb-12 pt-20 text-center">
								<img className={(0, clsx_1.clsx)('mb-16 block w-full', teamMap[team].image.className)} src={teamMap[team].image()} alt={teamMap[team].image.alt} style={teamMap[team].image.style}/>
								<typography_tsx_1.H6 as="span">{teamMap[team].label}</typography_tsx_1.H6>
							</div>
						</div>
					</div>
				</grid_tsx_1.Grid>
			</div>

			<grid_tsx_1.Grid>
				<div className="col-span-full mb-12 lg:col-span-5 lg:col-start-8 lg:mb-0">
					<typography_tsx_1.H2>Need to login somewhere else?</typography_tsx_1.H2>
					<typography_tsx_1.H2 variant="secondary" as="p">
						Scan this QR code on the other device.
					</typography_tsx_1.H2>
				</div>

				<div className="bg-secondary relative col-span-full rounded-lg p-4 lg:col-span-5 lg:col-start-1 lg:row-start-1">
					<img src={data.qrLoginCode} alt="Login QR Code" className="w-full rounded-lg object-contain"/>
					<button onClick={function () { return setQrIsVisible(true); }} className={(0, clsx_1.clsx)('focus-ring text-primary bg-secondary absolute inset-0 flex h-full w-full flex-col items-center justify-center rounded-lg text-lg font-medium transition duration-200', {
            'opacity-100': !qrIsVisible,
            'opacity-0': qrIsVisible,
        })}>
						<icons_tsx_1.EyeIcon size={36}/>
						<span>click to reveal</span>
					</button>
				</div>
			</grid_tsx_1.Grid>

			<spacer_tsx_1.Spacer size="sm"/>

			<grid_tsx_1.Grid>
				<div className="col-span-full">
					<typography_tsx_1.H2>Manage Your Account</typography_tsx_1.H2>
				</div>
				<spacer_tsx_1.Spacer size="3xs" className="col-span-full"/>
				<div className="col-span-full flex flex-wrap gap-3">
					<button_tsx_1.ButtonLink variant="secondary" download="my-kcd-data.json" href={"".concat(requestInfo.origin, "/me/download.json")}>
						Download Your Data
					</button_tsx_1.ButtonLink>
					<button_tsx_1.ButtonLink variant="secondary" to="passkeys">
						Manage Passkeys
					</button_tsx_1.ButtonLink>
					<react_1.Form action="/me" method="POST" noValidate aria-describedby="general-error">
						<button_tsx_1.Button disabled={otherSessionsCount < 1} variant="danger" type="submit" name="actionId" value={actionIds.deleteSessions}>
							Sign out of {otherSessionsCount}{' '}
							{otherSessionsCount === 1 ? 'session' : 'sessions'}
						</button_tsx_1.Button>
					</react_1.Form>
					<button_tsx_1.Button variant="danger" onClick={function () { return setDeleteModalOpen(true); }}>
						Delete Account
					</button_tsx_1.Button>
				</div>
			</grid_tsx_1.Grid>

			<dialog_1.Dialog onDismiss={function () { return setDeleteModalOpen(false); }} isOpen={deleteModalOpen} aria-label="Delete your account" className="w-11/12 rounded-lg border-2 border-black dark:border-white dark:bg-gray-900 lg:max-w-screen-lg lg:px-24 lg:py-14">
				<typography_tsx_1.H3>Delete your KCD Account</typography_tsx_1.H3>
				<typography_tsx_1.Paragraph>
					{"Are you certain you want to do this? There's no going back."}
				</typography_tsx_1.Paragraph>
				<spacer_tsx_1.Spacer size="2xs"/>
				<react_1.Form action="/me" method="POST" noValidate aria-describedby="general-error">
					<div className="flex flex-wrap gap-4">
						<button_tsx_1.Button type="button" onClick={function () { return setDeleteModalOpen(false); }}>
							Nevermind
						</button_tsx_1.Button>
						<button_tsx_1.Button variant="danger" name="actionId" value={actionIds.deleteAccount} size="medium" type="submit">
							Delete Account
						</button_tsx_1.Button>
					</div>
				</react_1.Form>
			</dialog_1.Dialog>
		</main>);
}
exports.default = YouScreen;
