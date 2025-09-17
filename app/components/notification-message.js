"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationMessage = NotificationMessage;
var react_1 = require("@remix-run/react");
var clsx_1 = require("clsx");
var framer_motion_1 = require("framer-motion");
var React = require("react");
var react_2 = require("react");
var icons_tsx_1 = require("./icons.tsx");
function NotificationMessage(_a) {
    var queryStringKey = _a.queryStringKey, _b = _a.visibleMs, visibleMs = _b === void 0 ? 8000 : _b, controlledVisible = _a.visible, autoClose = _a.autoClose, children = _a.children, _c = _a.position, position = _c === void 0 ? 'bottom-right' : _c, onDismiss = _a.onDismiss, 
    /* how long to wait before the message is shown, after mount 0 to 1 */
    _d = _a.delay, 
    /* how long to wait before the message is shown, after mount 0 to 1 */
    delay = _d === void 0 ? typeof controlledVisible === 'undefined' ? 1 : 0 : _d;
    var searchParams = (0, react_1.useSearchParams)()[0];
    var hasQueryStringValue = queryStringKey
        ? searchParams.has(queryStringKey)
        : false;
    var _e = (0, react_2.useState)(!queryStringKey || hasQueryStringValue), isVisible = _e[0], setIsVisible = _e[1];
    var messageFromQuery = queryStringKey && searchParams.get(queryStringKey);
    // Eslint is wrong here, params.get can return an empty string
    var message = messageFromQuery || children;
    var latestMessageRef = React.useRef(message);
    React.useEffect(function () {
        if (!message)
            setIsVisible(false);
    }, [message]);
    // if the query gets a message after the initial mount then we want to toggle visibility
    React.useEffect(function () {
        if (hasQueryStringValue)
            setIsVisible(true);
    }, [hasQueryStringValue]);
    React.useEffect(function () {
        latestMessageRef.current = message;
    }, [message]);
    React.useEffect(function () {
        if (!latestMessageRef.current)
            return;
        if (autoClose === false)
            return;
        if (controlledVisible === false)
            return;
        var timeout = setTimeout(function () {
            setIsVisible(false);
        }, visibleMs + delay);
        return function () { return clearTimeout(timeout); };
    }, [queryStringKey, delay, autoClose, controlledVisible, visibleMs]);
    React.useEffect(function () {
        if (!latestMessageRef.current)
            return;
        if (queryStringKey && searchParams.has(queryStringKey)) {
            var newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete(queryStringKey);
            // use setSearchParams from useSearchParams resulted in redirecting the
            // user to the homepage (wut?) and left a `?` at the end of the URL even
            // if there aren't any other search params. This doesn't have either of
            // those issues.
            window.history.replaceState(null, '', [window.location.pathname, newSearchParams.toString()]
                .filter(Boolean)
                .join('?'));
        }
    }, [queryStringKey, searchParams]);
    var initialY = position.includes('bottom') ? 50 : -50;
    var show = message && typeof controlledVisible === 'boolean'
        ? controlledVisible
        : isVisible;
    return (<framer_motion_1.AnimatePresence>
			{show ? (<framer_motion_1.motion.div initial={{ y: initialY, opacity: 0 }} animate={{ y: 0, opacity: 1, transition: { delay: delay } }} exit={{ y: initialY, opacity: 0 }} transition={{ ease: 'easeInOut', duration: 0.3 }} className={(0, clsx_1.clsx)('text-inverse pointer-events-none fixed left-0 right-0 z-50 px-5vw', {
                'bottom-8': position === 'bottom-right',
                'top-8': position === 'top-center',
            })}>
					<div className={(0, clsx_1.clsx)('mx-auto flex w-full max-w-8xl', {
                'justify-end': position === 'bottom-right',
                'justify-center': position === 'top-center',
            })}>
						<div className="bg-inverse text-inverse pointer-events-auto relative max-w-xl rounded-lg p-8 pr-14 shadow-md">
							{typeof controlledVisible === 'undefined' || onDismiss ? (<button aria-label="dismiss message" onClick={function () {
                    setIsVisible(false);
                    onDismiss === null || onDismiss === void 0 ? void 0 : onDismiss();
                }} className="text-secondary hover:text-inverse focus:text-inverse absolute right-4 top-8 rotate-45 transform">
									<icons_tsx_1.PlusIcon />
								</button>) : null}
							{message}
						</div>
					</div>
				</framer_motion_1.motion.div>) : null}
		</framer_motion_1.AnimatePresence>);
}
