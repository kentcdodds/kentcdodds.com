"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
exports.Navbar = Navbar;
require("./navbar.css");
var react_1 = require("@remix-run/react");
var clsx_1 = require("clsx");
var framer_motion_1 = require("framer-motion");
var React = require("react");
var images_tsx_1 = require("#app/images.tsx");
var request_info_ts_1 = require("#app/utils/request-info.ts");
var team_provider_tsx_1 = require("#app/utils/team-provider.tsx");
var theme_tsx_1 = require("#app/utils/theme.tsx");
var use_root_data_ts_1 = require("#app/utils/use-root-data.ts");
var use_element_state_tsx_1 = require("./hooks/use-element-state.tsx");
var icons_tsx_1 = require("./icons.tsx");
var team_circle_tsx_1 = require("./team-circle.tsx");
var LINKS = [
    { name: 'Blog', to: '/blog' },
    { name: 'Courses', to: '/courses' },
    { name: 'Discord', to: '/discord' },
    { name: 'Chats', to: '/chats/05' },
    { name: 'Calls', to: '/calls/05' },
    { name: 'Workshops', to: '/workshops' },
    { name: 'About', to: '/about' },
];
var MOBILE_LINKS = __spreadArray([{ name: 'Home', to: '/' }], LINKS, true);
function NavLink(_a) {
    var to = _a.to, rest = __rest(_a, ["to"]);
    var location = (0, react_1.useLocation)();
    var isSelected = to === location.pathname || location.pathname.startsWith("".concat(to, "/"));
    return (<li className="px-5 py-2">
			<react_1.Link prefetch="intent" className={(0, clsx_1.clsx)('underlined block whitespace-nowrap text-lg font-medium hover:text-team-current focus:text-team-current focus:outline-none', {
            'active text-team-current': isSelected,
            'text-secondary': !isSelected,
        })} to={to} {...rest}/>
		</li>);
}
var iconTransformOrigin = { transformOrigin: '50% 100px' };
function DarkModeToggle(_a) {
    var _b;
    var _c = _a.variant, variant = _c === void 0 ? 'icon' : _c;
    var requestInfo = (0, request_info_ts_1.useRequestInfo)();
    var fetcher = (0, react_1.useFetcher)({ key: theme_tsx_1.THEME_FETCHER_KEY });
    var optimisticMode = (0, theme_tsx_1.useOptimisticThemeMode)();
    var mode = (_b = optimisticMode !== null && optimisticMode !== void 0 ? optimisticMode : requestInfo.userPrefs.theme) !== null && _b !== void 0 ? _b : 'system';
    var nextMode = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
    var iconSpanClassName = 'absolute inset-0 transform transition-transform duration-700 motion-reduce:duration-[0s]';
    return (<fetcher.Form method="POST" action="/action/set-theme">
			<input type="hidden" name="theme" value={nextMode}/>

			<button type="submit" className={(0, clsx_1.clsx)('border-secondary hover:border-primary focus:border-primary inline-flex h-14 items-center justify-center overflow-hidden rounded-full border-2 p-1 transition focus:outline-none', {
            'w-14': variant === 'icon',
            'px-8': variant === 'labelled',
        })}>
				{/* note that the duration is longer then the one on body, controlling the bg-color */}
				<div className="relative h-8 w-8">
					<span className={(0, clsx_1.clsx)(iconSpanClassName, mode === 'dark' ? 'rotate-0' : 'rotate-90')} style={iconTransformOrigin}>
						<icons_tsx_1.MoonIcon />
					</span>
					<span className={(0, clsx_1.clsx)(iconSpanClassName, mode === 'light' ? 'rotate-0' : '-rotate-90')} style={iconTransformOrigin}>
						<icons_tsx_1.SunIcon />
					</span>

					<span className={(0, clsx_1.clsx)(iconSpanClassName, mode === 'system' ? 'translate-y-0' : 'translate-y-10')} style={iconTransformOrigin}>
						<icons_tsx_1.LaptopIcon size={32}/>
					</span>
				</div>
				<span className={(0, clsx_1.clsx)('ml-4', { 'sr-only': variant === 'icon' })}>
					{"Switch to ".concat(nextMode === 'system'
            ? 'system'
            : nextMode === 'light'
                ? 'light'
                : 'dark', " mode")}
				</span>
			</button>
		</fetcher.Form>);
}
function MobileMenu() {
    var menuButtonRef = React.useRef(null);
    var popoverRef = React.useRef(null);
    var location = (0, react_1.useLocation)();
    // Close menu when route changes
    React.useEffect(function () {
        var popover = popoverRef.current;
        if (!popover)
            return;
        var openState = matchesPopoverOpen(popover);
        if (openState === 'matches') {
            popover.hidePopover();
        }
        else if (openState === 'old-browser') {
            window.location.reload();
        }
    }, [location.pathname]);
    // Ensure body overflow is reset when component unmounts or popover state changes
    React.useEffect(function () {
        var popover = popoverRef.current;
        if (!popover)
            return;
        var handleToggle = function (event) {
            var target = event.target;
            var popoverOpen = matchesPopoverOpen(target);
            if (popoverOpen === 'matches') {
                // Ensure body overflow is properly managed
                document.body.style.overflow = 'hidden';
            }
            else {
                document.body.style.overflow = '';
            }
        };
        popover.addEventListener('toggle', handleToggle);
        // Cleanup function to ensure body overflow is reset
        return function () {
            popover.removeEventListener('toggle', handleToggle);
            document.body.style.overflow = '';
        };
    }, []);
    var closeMenu = React.useCallback(function () {
        var _a, _b;
        if (popoverRef.current) {
            (_b = (_a = popoverRef.current).hidePopover) === null || _b === void 0 ? void 0 : _b.call(_a);
            // Force reset body overflow to ensure proper state
            document.body.style.overflow = '';
        }
    }, []);
    return (<div onBlur={function (event) {
            if (!popoverRef.current || !menuButtonRef.current)
                return;
            var openState = matchesPopoverOpen(popoverRef.current);
            if (openState === 'matches' &&
                !event.currentTarget.contains(event.relatedTarget)) {
                var isRelatedTargetBeforeMenu = event.relatedTarget instanceof Node &&
                    event.currentTarget.compareDocumentPosition(event.relatedTarget) ===
                        Node.DOCUMENT_POSITION_PRECEDING;
                var focusableElements = Array.from(event.currentTarget.querySelectorAll('button,a'));
                var elToFocus = isRelatedTargetBeforeMenu
                    ? focusableElements.at(-1)
                    : focusableElements.at(0);
                if (elToFocus instanceof HTMLElement) {
                    elToFocus.focus();
                }
                else {
                    menuButtonRef.current.focus();
                }
            }
        }}>
			<button ref={menuButtonRef} className="focus:border-primary hover:border-primary border-secondary text-primary inline-flex h-14 w-14 items-center justify-center rounded-full border-2 p-1 transition focus:outline-none" popoverTarget="mobile-menu">
				<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
					<rect x="6" y="9" width="20" height="2" rx="1" fill="currentColor"/>
					<rect x="6" y="15" width="20" height="2" rx="1" fill="currentColor"/>
					<rect x="6" y="21" width="20" height="2" rx="1" fill="currentColor"/>
				</svg>
			</button>
			<div id="mobile-menu" ref={popoverRef} popover="" className="fixed bottom-0 left-0 right-0 top-[128px] m-0 h-[calc(100svh-128px)] w-full">
				<div className="bg-primary flex h-full flex-col overflow-y-scroll border-t border-gray-200 pb-12 dark:border-gray-600">
					{MOBILE_LINKS.map(function (link) { return (<react_1.Link className="hover:bg-secondary focus:bg-secondary text-primary border-b border-gray-200 px-5vw py-9 hover:text-team-current dark:border-gray-600" key={link.to} to={link.to} onClick={closeMenu}>
							{link.name}
						</react_1.Link>); })}
					<div className="py-9 text-center">
						<DarkModeToggle variant="labelled"/>
					</div>
				</div>
			</div>
		</div>);
}
// Timing durations used to control the speed of the team ring in the profile button.
// Time is seconds per full rotation
var durations = {
    initial: 40,
    hover: 3,
    focus: 3,
    active: 0.25,
};
function ProfileButton(_a) {
    var imageUrl = _a.imageUrl, imageAlt = _a.imageAlt, team = _a.team, magicLinkVerified = _a.magicLinkVerified;
    var user = (0, use_root_data_ts_1.useOptionalUser)();
    var controls = (0, framer_motion_1.useAnimation)();
    var _b = (0, use_element_state_tsx_1.useElementState)(), ref = _b[0], state = _b[1];
    var shouldReduceMotion = (0, framer_motion_1.useReducedMotion)();
    React.useEffect(function () {
        void controls.start(function (_, _a) {
            var _b = _a.rotate, rotate = _b === void 0 ? 0 : _b;
            var target = typeof rotate === 'number'
                ? state === 'initial'
                    ? rotate - 360
                    : rotate + 360
                : 360;
            return shouldReduceMotion
                ? {}
                : {
                    rotate: [rotate, target],
                    transition: {
                        duration: durations[state],
                        repeat: Infinity,
                        ease: 'linear',
                    },
                };
        });
    }, [state, controls, shouldReduceMotion]);
    return (<react_1.Link prefetch="intent" to={user ? '/me' : magicLinkVerified ? '/signup' : '/login'} aria-label={user ? 'My Account' : magicLinkVerified ? 'Finish signing up' : 'Login'} className={(0, clsx_1.clsx)('ml-4 inline-flex h-14 w-14 items-center justify-center rounded-full focus:outline-none')} ref={ref}>
			<framer_motion_1.motion.div className="absolute" animate={controls}>
				<team_circle_tsx_1.TeamCircle size={56} team={team}/>
			</framer_motion_1.motion.div>
			<img className={(0, clsx_1.clsx)('inline h-10 w-10 select-none rounded-full')} src={imageUrl} alt={imageAlt} crossOrigin="anonymous"/>
		</react_1.Link>);
}
function Navbar() {
    var team = (0, team_provider_tsx_1.useTeam)()[0];
    var _a = (0, use_root_data_ts_1.useRootData)(), requestInfo = _a.requestInfo, userInfo = _a.userInfo;
    var avatar = userInfo ? userInfo.avatar : images_tsx_1.kodyProfiles[team];
    return (<div className="px-5vw py-9 lg:py-12">
			<nav className="text-primary mx-auto flex max-w-8xl items-center justify-between">
				<div className="flex justify-center gap-4 align-middle">
					<react_1.Link prefetch="intent" to="/" className="text-primary underlined block whitespace-nowrap text-2xl font-medium transition focus:outline-none">
						<h1>Kent C. Dodds</h1>
					</react_1.Link>
				</div>

				<ul className="hidden lg:flex">
					{LINKS.map(function (link) { return (<NavLink key={link.to} to={link.to}>
							{link.name}
						</NavLink>); })}
				</ul>

				<div className="flex items-center justify-center">
					<div className="block lg:hidden">
						<MobileMenu />
					</div>
					<div className="noscript-hidden hidden lg:block">
						<DarkModeToggle />
					</div>

					<ProfileButton magicLinkVerified={requestInfo.session.magicLinkVerified} imageUrl={avatar.src} imageAlt={avatar.alt} team={team}/>
				</div>
			</nav>
		</div>);
}
function matchesPopoverOpen(element) {
    try {
        return element.matches(':popover-open') ? 'matches' : 'no-matches';
    }
    catch (_a) {
        // ignore 🤷‍♂️ They probably have a very old browser
        return 'old-browser';
    }
}
