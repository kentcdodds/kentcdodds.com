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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.headers = exports.links = exports.meta = exports.handle = void 0;
exports.loader = loader;
exports.ErrorBoundary = ErrorBoundary;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var remix_1 = require("@sentry/remix");
var clsx_1 = require("clsx");
var date_fns_1 = require("date-fns");
var framer_motion_1 = require("framer-motion");
var React = require("react");
var spin_delay_1 = require("spin-delay");
var litefs_js_server_ts_1 = require("#app/utils/litefs-js.server.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var arrow_button_tsx_1 = require("./components/arrow-button.tsx");
var errors_tsx_1 = require("./components/errors.tsx");
var footer_tsx_1 = require("./components/footer.tsx");
var icons_tsx_1 = require("./components/icons.tsx");
var kifs_tsx_1 = require("./components/kifs.tsx");
var navbar_tsx_1 = require("./components/navbar.tsx");
var notification_message_tsx_1 = require("./components/notification-message.tsx");
var spacer_tsx_1 = require("./components/spacer.tsx");
var team_circle_tsx_1 = require("./components/team-circle.tsx");
var images_tsx_1 = require("./images.tsx");
var promotification_tsx_1 = require("./routes/resources+/promotification.tsx");
var app_css_url_1 = require("./styles/app.css?url");
var no_script_css_url_1 = require("./styles/no-script.css?url");
var prose_css_url_1 = require("./styles/prose.css?url");
var tailwind_css_url_1 = require("./styles/tailwind.css?url");
var vendors_css_url_1 = require("./styles/vendors.css?url");
var client_hints_tsx_1 = require("./utils/client-hints.tsx");
var client_server_ts_1 = require("./utils/client.server.ts");
var env_server_ts_1 = require("./utils/env.server.ts");
var login_server_ts_1 = require("./utils/login.server.ts");
var nonce_provider_ts_1 = require("./utils/nonce-provider.ts");
var seo_ts_1 = require("./utils/seo.ts");
var session_server_ts_1 = require("./utils/session.server.ts");
var team_provider_tsx_1 = require("./utils/team-provider.tsx");
var theme_server_ts_1 = require("./utils/theme.server.ts");
var theme_tsx_1 = require("./utils/theme.tsx");
var timing_server_ts_1 = require("./utils/timing.server.ts");
var user_info_server_ts_1 = require("./utils/user-info.server.ts");
var workshop_tickets_server_ts_1 = require("./utils/workshop-tickets.server.ts");
var workshops_server_ts_1 = require("./utils/workshops.server.ts");
exports.handle = {
    id: 'root',
};
var meta = function (_a) {
    var data = _a.data;
    var requestInfo = data === null || data === void 0 ? void 0 : data.requestInfo;
    var title = 'Kent C. Dodds';
    var description = 'Come check out how Kent C. Dodds can help you level up your career as a software engineer.';
    return __spreadArray([
        { viewport: 'width=device-width,initial-scale=1,viewport-fit=cover' },
        {
            'theme-color': (requestInfo === null || requestInfo === void 0 ? void 0 : requestInfo.userPrefs.theme) === 'dark' ? '#1F2028' : '#FFF',
        }
    ], (0, seo_ts_1.getSocialMetas)({
        keywords: 'Learn React, React Workshops, Testing JavaScript Training, React Training, Learn JavaScript, Learn TypeScript',
        url: (0, misc_tsx_1.getUrl)(requestInfo),
        image: (0, images_tsx_1.getGenericSocialImage)({
            url: (0, misc_tsx_1.getDisplayUrl)(requestInfo),
            words: 'Helping people make the world a better place through quality software.',
            featuredImage: 'kentcdodds.com/illustrations/kody-flying_blue',
        }),
        title: title,
        description: description,
    }), true);
};
exports.meta = meta;
var links = function () {
    return [
        {
            rel: 'apple-touch-icon',
            sizes: '180x180',
            href: '/favicons/apple-touch-icon.png',
        },
        {
            rel: 'icon',
            type: 'image/png',
            sizes: '32x32',
            href: '/favicons/favicon-32x32.png',
        },
        {
            rel: 'icon',
            type: 'image/png',
            sizes: '16x16',
            href: '/favicons/favicon-16x16.png',
        },
        { rel: 'manifest', href: '/site.webmanifest' },
        { rel: 'icon', href: '/favicon.ico' },
        { rel: 'stylesheet', href: vendors_css_url_1.default },
        { rel: 'stylesheet', href: tailwind_css_url_1.default },
        { rel: 'stylesheet', href: prose_css_url_1.default },
        { rel: 'stylesheet', href: app_css_url_1.default },
    ];
};
exports.links = links;
var WORKSHOP_PROMO_NAME = 'workshop-promo';
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var timings, session, _c, user, clientSession, loginInfoSession, primaryInstance, workshops, workshopEvents, randomFooterImageKeys, randomFooterImageKey, manualWorkshopEventPromotifications, titoWorkshopEventPromotifications, data, _d, headers;
        var _e;
        var request = _b.request;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    timings = {};
                    return [4 /*yield*/, (0, session_server_ts_1.getSession)(request)];
                case 1:
                    session = _f.sent();
                    return [4 /*yield*/, Promise.all([
                            session.getUser({ timings: timings }),
                            (0, client_server_ts_1.getClientSession)(request, session.getUser({ timings: timings })),
                            (0, login_server_ts_1.getLoginInfoSession)(request),
                            (0, litefs_js_server_ts_1.getInstanceInfo)().then(function (i) { return i.primaryInstance; }),
                            (0, workshops_server_ts_1.getWorkshops)({ request: request, timings: timings }),
                            (0, workshop_tickets_server_ts_1.getScheduledEvents)({ request: request, timings: timings }),
                        ])];
                case 2:
                    _c = _f.sent(), user = _c[0], clientSession = _c[1], loginInfoSession = _c[2], primaryInstance = _c[3], workshops = _c[4], workshopEvents = _c[5];
                    randomFooterImageKeys = Object.keys(images_tsx_1.illustrationImages);
                    randomFooterImageKey = randomFooterImageKeys[Math.floor(Math.random() * randomFooterImageKeys.length)];
                    manualWorkshopEventPromotifications = workshops
                        .filter(function (w) { return w.events.length; })
                        .flatMap(function (workshop) {
                        return workshop.events
                            .filter(function (e) { return e.remaining == null || e.remaining > 0; })
                            .map(function (event) {
                            var promoName = "".concat(WORKSHOP_PROMO_NAME, "-").concat(event.date, "-").concat(workshop.slug);
                            var promoEndTime = {
                                type: 'event',
                                time: (0, misc_tsx_1.parseDate)(event.date).getTime(),
                                url: event.url,
                            };
                            return {
                                title: workshop.title,
                                slug: workshop.slug,
                                promoName: promoName,
                                location: event.location,
                                dismissTimeSeconds: Math.min(Math.max(
                                // one quarter of the time until the promoEndTime (in seconds)
                                (promoEndTime.time - Date.now()) / 4 / 1000, 
                                // Minimum of 3 hours (in seconds)
                                60 * 60 * 3), 
                                // Maximum of 1 week (in seconds)
                                60 * 60 * 24 * 7),
                                cookieValue: (0, promotification_tsx_1.getPromoCookieValue)({
                                    promoName: promoName,
                                    request: request,
                                }),
                                promoEndTime: promoEndTime,
                            };
                        });
                    });
                    titoWorkshopEventPromotifications = workshopEvents
                        .map(function (e) {
                        var workshop = workshops.find(function (w) { return w.slug === e.metadata.workshopSlug; });
                        if (!workshop)
                            return null;
                        var discounts = Object.entries(e.discounts)
                            .filter(function (_a) {
                            var discount = _a[1];
                            return (0, date_fns_1.isFuture)((0, misc_tsx_1.parseDate)(discount.ends));
                        })
                            .sort(function (_a, _b) {
                            var a = _a[1];
                            var b = _b[1];
                            return (0, misc_tsx_1.parseDate)(a.ends).getTime() - (0, misc_tsx_1.parseDate)(b.ends).getTime();
                        });
                        // the promoEndTime should be the earliest of:
                        // 1. earliest discount end
                        // 2. the end of ticket sales
                        // 3. the start of the event
                        var promoEndTime = [
                            discounts[0]
                                ? {
                                    type: 'discount',
                                    time: (0, misc_tsx_1.parseDate)(discounts[0][1].ends).getTime(),
                                    url: discounts[0][1].url,
                                }
                                : null,
                            e.salesEndTime
                                ? {
                                    type: 'sales',
                                    time: (0, misc_tsx_1.parseDate)(e.salesEndTime).getTime(),
                                    url: e.url,
                                }
                                : null,
                            e.startTime
                                ? {
                                    type: 'start',
                                    time: (0, misc_tsx_1.parseDate)(e.startTime).getTime(),
                                    url: e.url,
                                }
                                : null,
                        ]
                            .filter(misc_tsx_1.typedBoolean)
                            .sort(function (a, b) { return a.time - b.time; })[0];
                        if (!promoEndTime)
                            return null;
                        var promoName = "".concat(WORKSHOP_PROMO_NAME, "-").concat(workshop.slug);
                        return {
                            title: e.title,
                            slug: workshop.slug,
                            promoName: promoName,
                            location: e.location,
                            dismissTimeSeconds: Math.min(Math.max(
                            // one quarter of the time until the promoEndTime (in seconds)
                            (promoEndTime.time - Date.now()) / 4 / 1000, 
                            // Minimum of 3 hours (in seconds)
                            60 * 60 * 3), 
                            // Maximum of 1 week (in seconds)
                            60 * 60 * 24 * 7),
                            cookieValue: (0, promotification_tsx_1.getPromoCookieValue)({
                                promoName: promoName,
                                request: request,
                            }),
                            promoEndTime: promoEndTime,
                        };
                    })
                        .filter(misc_tsx_1.typedBoolean);
                    _e = {
                        user: user
                    };
                    if (!user) return [3 /*break*/, 4];
                    return [4 /*yield*/, (0, user_info_server_ts_1.getUserInfo)(user, { request: request, timings: timings })];
                case 3:
                    _d = _f.sent();
                    return [3 /*break*/, 5];
                case 4:
                    _d = null;
                    _f.label = 5;
                case 5:
                    data = (_e.userInfo = _d,
                        _e.ENV = (0, env_server_ts_1.getEnv)(),
                        _e.randomFooterImageKey = randomFooterImageKey,
                        _e.workshopPromotifications = __spreadArray(__spreadArray([], titoWorkshopEventPromotifications, true), manualWorkshopEventPromotifications, true),
                        _e.requestInfo = {
                            hints: (0, client_hints_tsx_1.getHints)(request),
                            origin: (0, misc_tsx_1.getDomainUrl)(request),
                            path: new URL(request.url).pathname,
                            flyPrimaryInstance: primaryInstance,
                            userPrefs: {
                                theme: (0, theme_server_ts_1.getTheme)(request),
                            },
                            session: {
                                email: loginInfoSession.getEmail(),
                                magicLinkVerified: loginInfoSession.getMagicLinkVerified(),
                            },
                        },
                        _e);
                    headers = new Headers();
                    // this can lead to race conditions if a child route is also trying to commit
                    // the cookie as well. This is a bug in remix that will hopefully be fixed.
                    // we reduce the likelihood of a problem by only committing if the value is
                    // different.
                    return [4 /*yield*/, session.getHeaders(headers)];
                case 6:
                    // this can lead to race conditions if a child route is also trying to commit
                    // the cookie as well. This is a bug in remix that will hopefully be fixed.
                    // we reduce the likelihood of a problem by only committing if the value is
                    // different.
                    _f.sent();
                    return [4 /*yield*/, clientSession.getHeaders(headers)];
                case 7:
                    _f.sent();
                    return [4 /*yield*/, loginInfoSession.getHeaders(headers)];
                case 8:
                    _f.sent();
                    headers.append('Server-Timing', (0, timing_server_ts_1.getServerTimeHeader)(timings));
                    return [2 /*return*/, (0, node_1.json)(data, { headers: headers })];
            }
        });
    });
}
var headers = function (_a) {
    var _b;
    var loaderHeaders = _a.loaderHeaders;
    return {
        'Server-Timing': (_b = loaderHeaders.get('Server-Timing')) !== null && _b !== void 0 ? _b : '',
    };
};
exports.headers = headers;
var LOADER_WORDS = [
    'loading',
    'checking cdn',
    'checking cache',
    'fetching from db',
    'compiling mdx',
    'updating cache',
    'transfer',
];
var ACTION_WORDS = [
    'packaging',
    'zapping',
    'validating',
    'processing',
    'calculating',
    'computing',
    'computering',
];
// we don't want to show the loading indicator on page load
var firstRender = true;
function PageLoadingMessage() {
    var navigation = (0, react_1.useNavigation)();
    var _a = React.useState([]), words = _a[0], setWords = _a[1];
    var _b = React.useState(''), pendingPath = _b[0], setPendingPath = _b[1];
    var showLoader = (0, spin_delay_1.useSpinDelay)(Boolean(navigation.state !== 'idle'), {
        delay: 400,
        minDuration: 1000,
    });
    React.useEffect(function () {
        if (firstRender)
            return;
        if (navigation.state === 'idle')
            return;
        if (navigation.state === 'loading')
            setWords(LOADER_WORDS);
        if (navigation.state === 'submitting')
            setWords(ACTION_WORDS);
        var interval = setInterval(function () {
            setWords(function (_a) {
                var first = _a[0], rest = _a.slice(1);
                return __spreadArray(__spreadArray([], rest, true), [first], false);
            });
        }, 2000);
        return function () { return clearInterval(interval); };
    }, [pendingPath, navigation.state]);
    React.useEffect(function () {
        if (firstRender)
            return;
        if (navigation.state === 'idle')
            return;
        setPendingPath(navigation.location.pathname);
    }, [navigation]);
    React.useEffect(function () {
        firstRender = false;
    }, []);
    var action = words[0];
    return (<notification_message_tsx_1.NotificationMessage position="bottom-right" visible={showLoader}>
			<div className="flex w-64 items-center">
				<framer_motion_1.motion.div transition={{ repeat: Infinity, duration: 2, ease: 'linear' }} animate={{ rotate: 360 }}>
					<team_circle_tsx_1.TeamCircle size={48} team="UNKNOWN"/>
				</framer_motion_1.motion.div>
				<div className="ml-4 inline-grid">
					<framer_motion_1.AnimatePresence>
						<div className="col-start-1 row-start-1 flex overflow-hidden">
							<framer_motion_1.motion.span key={action} initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -15, opacity: 0 }} transition={{ duration: 0.25 }} className="flex-none">
								{action}
							</framer_motion_1.motion.span>
						</div>
					</framer_motion_1.AnimatePresence>
					<span className="text-secondary truncate">path: {pendingPath}</span>
				</div>
			</div>
		</notification_message_tsx_1.NotificationMessage>);
}
function CanonicalLink(_a) {
    var origin = _a.origin, fathomQueue = _a.fathomQueue;
    var pathname = (0, react_1.useLocation)().pathname;
    var canonicalUrl = (0, misc_tsx_1.removeTrailingSlash)("".concat(origin).concat(pathname));
    React.useEffect(function () {
        if (window.fathom) {
            window.fathom.trackPageview();
        }
        else {
            // Fathom hasn't finished loading yet! queue the command
            fathomQueue.current.push({ command: 'trackPageview' });
        }
        // Fathom looks uses the canonical URL to track visits, so we're using it
        // as a dependency even though we're not using it explicitly
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canonicalUrl]);
    return <link rel="canonical" href={canonicalUrl}/>;
}
function App() {
    var data = (0, react_1.useLoaderData)();
    var nonce = (0, nonce_provider_ts_1.useNonce)();
    var team = (0, team_provider_tsx_1.useTeam)()[0];
    var theme = (0, theme_tsx_1.useTheme)();
    var fathomQueue = React.useRef([]);
    return (<html lang="en" className={(0, clsx_1.clsx)(theme, "set-color-team-current-".concat(team.toLowerCase()))}>
			<head>
				<script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{
            __html: "window.ENV = ".concat(JSON.stringify(data.ENV), ";"),
        }}/>
				<client_hints_tsx_1.ClientHintCheck nonce={nonce}/>
				<react_1.Meta />
				<exports.meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>

				<CanonicalLink origin={data.requestInfo.origin} fathomQueue={fathomQueue}/>

				<react_1.Links />
				<noscript>
					<link rel="stylesheet" href={no_script_css_url_1.default}/>
				</noscript>
			</head>
			<body className="bg-white transition duration-500 dark:bg-gray-900">
				<PageLoadingMessage />

				{data.workshopPromotifications.map(function (e) { return (<promotification_tsx_1.Promotification key={e.slug + e.title + e.promoEndTime.time} cookieValue={e.cookieValue} promoName={e.promoName} promoEndTime={new Date(e.promoEndTime.time)} dismissTimeSeconds={e.dismissTimeSeconds}>
						<div className="flex flex-col">
							<p className="flex items-center gap-1">
								<icons_tsx_1.LaptopIcon />
								<span>
									Join Kent for a{' '}
									<react_1.Link to="/workshops" className="underline">
										live workshop
									</react_1.Link>
									{e.location
                ? e.location === 'Remote'
                    ? null
                    : " in ".concat(e.location)
                : null}
								</span>
							</p>
							<react_1.Link className="mt-3 text-lg underline" to={"/workshops/".concat(e.slug)}>
								{e.title}
							</react_1.Link>
							{e.promoEndTime.type === 'discount' ? (<p className="mt-1 text-sm text-gray-500">
									Limited time{' '}
									<a href={e.promoEndTime.url} className="inline-flex items-center gap-1 underline">
										<span>discount available</span>
										<icons_tsx_1.ArrowIcon direction="top-right" size={16}/>
									</a>
								</p>) : e.promoEndTime.type === 'sales' ? (<p className="mt-1 text-sm text-gray-500">
									Limited time{' '}
									<a href={e.promoEndTime.url} className="inline-flex items-center gap-1 underline">
										<span>tickets available</span>
										<icons_tsx_1.ArrowIcon direction="top-right" size={16}/>
									</a>
								</p>) : null}
						</div>
					</promotification_tsx_1.Promotification>); })}
				<notification_message_tsx_1.NotificationMessage queryStringKey="message" delay={0.3}/>
				<navbar_tsx_1.Navbar />
				<react_1.Outlet />
				<spacer_tsx_1.Spacer size="base"/>
				<footer_tsx_1.Footer image={images_tsx_1.images[data.randomFooterImageKey]}/>
				<react_1.ScrollRestoration nonce={nonce}/>
				{ENV.NODE_ENV === 'development' ? null : (<script nonce={nonce} src="https://cdn.usefathom.com/script.js" data-site="HJUUDKMT" data-spa="history" data-auto="false" // prevent tracking visit twice on initial page load
         data-excluded-domains="localhost" defer onLoad={function () {
                fathomQueue.current.forEach(function (_a) {
                    var command = _a.command;
                    if (window.fathom) {
                        window.fathom[command]();
                    }
                    else {
                        // Fathom isn't available even though the script has loaded
                        // this should never happen!
                    }
                });
                fathomQueue.current = [];
            }}/>)}
				<react_1.Scripts nonce={nonce}/>
				{ENV.NODE_ENV === 'development' ? (<script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: getWebsocketJS() }}/>) : null}
			</body>
		</html>);
}
function AppWithProviders() {
    return (<team_provider_tsx_1.TeamProvider>
			<App />
		</team_provider_tsx_1.TeamProvider>);
}
exports.default = (0, remix_1.withSentry)(AppWithProviders);
function ErrorDoc(_a) {
    var children = _a.children;
    var nonce = (0, nonce_provider_ts_1.useNonce)();
    return (<html lang="en" className="dark">
			<head>
				<title>Oh no...</title>
				<script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{
            __html: "window.ENV = {}",
        }}/>
				<react_1.Links />
			</head>
			<body className="bg-white transition duration-500 dark:bg-gray-900">
				{children}
				<react_1.Scripts nonce={nonce}/>
			</body>
		</html>);
}
// best effort, last ditch error boundary. This should only catch root errors
// all other errors should be caught by the index route which will include
// the footer and stuff, which is much better.
function ErrorBoundary() {
    var error = (0, misc_tsx_1.useCapturedRouteError)();
    var location = (0, react_1.useLocation)();
    if ((0, react_1.isRouteErrorResponse)(error)) {
        console.error('CatchBoundary', error);
        if (error.status === 404) {
            return (<ErrorDoc>
					<errors_tsx_1.ErrorPage heroProps={{
                    title: "404 - Oh no, you found a page that's missing stuff.",
                    subtitle: "\"".concat(location.pathname, "\" is not a page on kentcdodds.com. So sorry."),
                    image: (<kifs_tsx_1.MissingSomething className="rounded-lg" aspectRatio="3:4"/>),
                    action: <arrow_button_tsx_1.ArrowLink href="/">Go home</arrow_button_tsx_1.ArrowLink>,
                }}/>
				</ErrorDoc>);
        }
        if (error.status === 400) {
            return (<ErrorDoc>
					<errors_tsx_1.FourHundred error={error.data}/>
				</ErrorDoc>);
        }
        if (error.status === 409) {
            return (<ErrorDoc>
					<errors_tsx_1.ErrorPage heroProps={{
                    title: '409 - Oh no, you should never see this.',
                    subtitle: "\"".concat(location.pathname, "\" tried telling fly to replay your request and missed this one."),
                    image: <kifs_tsx_1.Grimmacing className="rounded-lg" aspectRatio="3:4"/>,
                    action: <arrow_button_tsx_1.ArrowLink href="/">Go home</arrow_button_tsx_1.ArrowLink>,
                }}/>
				</ErrorDoc>);
        }
        if (error.status !== 500) {
            return (<ErrorDoc>
					<errors_tsx_1.ErrorPage heroProps={{
                    title: "".concat(error.status, " - Oh no, something did not go well."),
                    subtitle: "\"".concat(location.pathname, "\" is currently not working. So sorry."),
                    image: <kifs_tsx_1.Grimmacing className="rounded-lg" aspectRatio="3:4"/>,
                    action: <arrow_button_tsx_1.ArrowLink href="/">Go home</arrow_button_tsx_1.ArrowLink>,
                }}/>
				</ErrorDoc>);
        }
        throw new Error("Unhandled error: ".concat(error.status));
    }
    console.error(error);
    return (<ErrorDoc>
			<errors_tsx_1.ErrorPage heroProps={{
            title: '500 - Oh no, something did not go well.',
            subtitle: "\"".concat(location.pathname, "\" is currently not working. So sorry."),
            image: <kifs_tsx_1.Grimmacing className="rounded-lg" aspectRatio="3:4"/>,
            action: <arrow_button_tsx_1.ArrowLink href="/">Go home</arrow_button_tsx_1.ArrowLink>,
        }}/>
		</ErrorDoc>);
}
function kcdLiveReloadConnect(config) {
    var protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    var host = location.hostname;
    var port = location.port;
    var socketPath = "".concat(protocol, "//").concat(host, ":").concat(port, "/__ws");
    var ws = new WebSocket(socketPath);
    ws.onmessage = function (message) {
        var event = JSON.parse(message.data);
        if (event.type === 'kentcdodds.com:file-change' &&
            event.data.relativePath === location.pathname) {
            window.location.reload();
        }
    };
    ws.onopen = function () {
        if (config && typeof config.onOpen === 'function') {
            config.onOpen();
        }
    };
    ws.onclose = function (event) {
        if (event.code === 1006) {
            console.log('kentcdodds.com dev server web socket closed. Reconnecting...');
            setTimeout(function () {
                return kcdLiveReloadConnect({
                    onOpen: function () { return window.location.reload(); },
                });
            }, 1000);
        }
    };
    ws.onerror = function (error) {
        console.log('kentcdodds.com dev server web socket error:');
        console.error(error);
    };
}
function getWebsocketJS() {
    var js = /* javascript */ "\n  ".concat(kcdLiveReloadConnect.toString(), "\n  kcdLiveReloadConnect();\n  ");
    return js;
}
/*
eslint
  @typescript-eslint/no-use-before-define: "off",
*/
