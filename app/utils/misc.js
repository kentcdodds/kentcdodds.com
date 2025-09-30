"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.formatNumber = exports.teamTextColorClasses = exports.teamDisplay = exports.getOptionalTeam = exports.getTeam = exports.isRole = exports.isTeam = exports.teams = exports.reuseUsefulLoaderHeaders = exports.useSSRLayoutEffect = exports.AnchorOrLink = exports.listify = exports.optionalTeams = void 0;
exports.isResponse = isResponse;
exports.invariant = invariant;
exports.invariantResponse = invariantResponse;
exports.useCapturedRouteError = useCapturedRouteError;
exports.requireValidSlug = requireValidSlug;
exports.getAvatar = getAvatar;
exports.getAvatarForUser = getAvatarForUser;
exports.getErrorMessage = getErrorMessage;
exports.getErrorStack = getErrorStack;
exports.getNonNull = getNonNull;
exports.assertNonNull = assertNonNull;
exports.useUpdateQueryStringValueWithoutNavigation = useUpdateQueryStringValueWithoutNavigation;
exports.useDoubleCheck = useDoubleCheck;
exports.useDebounce = useDebounce;
exports.typedBoolean = typedBoolean;
exports.getRequiredServerEnvVar = getRequiredServerEnvVar;
exports.getRequiredGlobalEnvVar = getRequiredGlobalEnvVar;
exports.getDiscordAuthorizeURL = getDiscordAuthorizeURL;
exports.getDomainUrl = getDomainUrl;
exports.getUrl = getUrl;
exports.getDisplayUrl = getDisplayUrl;
exports.getOrigin = getOrigin;
exports.toBase64 = toBase64;
exports.removeTrailingSlash = removeTrailingSlash;
exports.parseDate = parseDate;
exports.formatDate = formatDate;
exports.formatDuration = formatDuration;
exports.formatAbbreviatedNumber = formatAbbreviatedNumber;
var react_1 = require("@remix-run/react");
var remix_1 = require("@sentry/remix");
var date_fns_1 = require("date-fns");
var md5_hash_1 = require("md5-hash");
var React = require("react");
var images_tsx_1 = require("../images.tsx");
var teams = ['RED', 'BLUE', 'YELLOW'];
exports.teams = teams;
exports.optionalTeams = __spreadArray(__spreadArray([], teams, true), ['UNKNOWN'], false);
var roles = ['ADMIN', 'MEMBER'];
var isTeam = function (team) { return teams.includes(team); };
exports.isTeam = isTeam;
var isRole = function (role) { return roles.includes(role); };
exports.isRole = isRole;
var getTeam = function (team) { return (isTeam(team) ? team : null); };
exports.getTeam = getTeam;
var getOptionalTeam = function (team) {
    return isTeam(team) ? team : 'UNKNOWN';
};
exports.getOptionalTeam = getOptionalTeam;
var defaultAvatarSize = 128;
function getAvatar(email, _a) {
    var _b = _a === void 0 ? {} : _a, _c = _b.size, size = _c === void 0 ? defaultAvatarSize : _c, _d = _b.fallback, fallback = _d === void 0 ? images_tsx_1.images.kodyProfileGray({ resize: { width: size } }) : _d, origin = _b.origin;
    var hash = (0, md5_hash_1.default)(email);
    var url = new URL("https://www.gravatar.com/avatar/".concat(hash));
    url.searchParams.set('size', String(size));
    if (fallback) {
        if (origin && fallback.startsWith('/')) {
            fallback = "".concat(origin).concat(fallback);
        }
        url.searchParams.set('default', fallback);
    }
    return url.toString();
}
var avatarFallbacks = {
    BLUE: function (width) { return images_tsx_1.images.kodyProfileBlue({ resize: { width: width } }); },
    RED: function (width) { return images_tsx_1.images.kodyProfileRed({ resize: { width: width } }); },
    YELLOW: function (width) { return images_tsx_1.images.kodyProfileYellow({ resize: { width: width } }); },
    UNKNOWN: function (width) { return images_tsx_1.images.kodyProfileGray({ resize: { width: width } }); },
};
function getAvatarForUser(_a, _b) {
    var email = _a.email, team = _a.team, firstName = _a.firstName;
    var _c = _b === void 0 ? {} : _b, _d = _c.size, size = _d === void 0 ? defaultAvatarSize : _d, origin = _c.origin;
    return {
        src: getAvatar(email, {
            fallback: avatarFallbacks[getOptionalTeam(team)](size),
            size: size,
            origin: origin,
        }),
        alt: firstName,
    };
}
var teamTextColorClasses = {
    YELLOW: 'text-team-yellow',
    BLUE: 'text-team-blue',
    RED: 'text-team-red',
    UNKNOWN: 'text-team-unknown',
};
exports.teamTextColorClasses = teamTextColorClasses;
var teamDisplay = {
    RED: 'Red',
    BLUE: 'Blue',
    YELLOW: 'Yellow',
};
exports.teamDisplay = teamDisplay;
var useSSRLayoutEffect = typeof window === 'undefined' ? function () { } : React.useLayoutEffect;
exports.useSSRLayoutEffect = useSSRLayoutEffect;
var AnchorOrLink = function AnchorOrLink(_a) {
    var _b, _c, _d;
    var ref = _a.ref, props = __rest(_a, ["ref"]);
    var to = props.to, href = props.href, download = props.download, _e = props.reload, reload = _e === void 0 ? false : _e, prefetch = props.prefetch, children = props.children, rest = __rest(props, ["to", "href", "download", "reload", "prefetch", "children"]);
    var toUrl = '';
    var shouldUserRegularAnchor = reload || download;
    if (!shouldUserRegularAnchor && typeof href === 'string') {
        shouldUserRegularAnchor = href.includes(':') || href.startsWith('#');
    }
    if (!shouldUserRegularAnchor && typeof to === 'string') {
        toUrl = to;
        shouldUserRegularAnchor = to.includes(':');
    }
    if (!shouldUserRegularAnchor && typeof to === 'object') {
        toUrl = "".concat((_b = to.pathname) !== null && _b !== void 0 ? _b : '').concat(to.hash ? "#".concat(to.hash) : '').concat(to.search ? "?".concat(to.search) : '');
        shouldUserRegularAnchor = (_c = to.pathname) === null || _c === void 0 ? void 0 : _c.includes(':');
    }
    if (shouldUserRegularAnchor) {
        return (<a {...rest} download={download} href={href !== null && href !== void 0 ? href : toUrl} ref={ref}>
				{children}
			</a>);
    }
    else {
        return (<react_1.Link prefetch={prefetch} to={(_d = to !== null && to !== void 0 ? to : href) !== null && _d !== void 0 ? _d : ''} {...rest} ref={ref}>
				{children}
			</react_1.Link>);
    }
};
exports.AnchorOrLink = AnchorOrLink;
function formatDuration(seconds) {
    var mins = Math.floor(seconds / 60)
        .toString()
        .padStart(2, '0');
    var secs = (seconds % 60).toFixed().toString().padStart(2, '0');
    return "".concat(mins, ":").concat(secs);
}
var formatNumber = function (num) { return new Intl.NumberFormat().format(num); };
exports.formatNumber = formatNumber;
function formatAbbreviatedNumber(num) {
    return num < 1000
        ? formatNumber(num)
        : num < 1000000
            ? "".concat(formatNumber(Number((num / 1000).toFixed(2))), "k")
            : num < 1000000000
                ? "".concat(formatNumber(Number((num / 1000000).toFixed(2))), "m")
                : num < 1000000000000
                    ? "".concat(formatNumber(Number((num / 1000000000).toFixed(2))), "b")
                    : 'a lot';
}
function formatDate(dateString, format) {
    if (format === void 0) { format = 'PPP'; }
    if (typeof dateString !== 'string') {
        dateString = dateString.toISOString();
    }
    return (0, date_fns_1.format)(parseDate(dateString), format);
}
function parseDate(dateString) {
    return (0, date_fns_1.add)((0, date_fns_1.parseISO)(dateString), {
        minutes: new Date().getTimezoneOffset(),
    });
}
function getErrorMessage(error, fallback) {
    if (fallback === void 0) { fallback = 'Unknown Error'; }
    if (typeof error === 'string')
        return error;
    if (error instanceof Error)
        return error.message;
    return fallback;
}
function getErrorStack(error, fallback) {
    if (fallback === void 0) { fallback = 'Unknown Error'; }
    if (typeof error === 'string')
        return error;
    if (error instanceof Error)
        return error.stack;
    return fallback;
}
function getNonNull(obj) {
    for (var _i = 0, _a = Object.entries(obj); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], val = _b[1];
        assertNonNull(val, "The value of ".concat(key, " is null but it should not be."));
    }
    return obj;
}
function typedBoolean(value) {
    return Boolean(value);
}
function assertNonNull(possibleNull, errorMessage) {
    if (possibleNull == null)
        throw new Error(errorMessage);
}
function getRequiredEnvVarFromObj(obj, key, devValue) {
    if (devValue === void 0) { devValue = "".concat(key, "-dev-value"); }
    var value = devValue;
    var envVal = obj[key];
    if (envVal) {
        value = envVal;
    }
    else if (obj.NODE_ENV === 'production') {
        throw new Error("".concat(key, " is a required env variable"));
    }
    return value;
}
function getRequiredServerEnvVar(key, devValue) {
    return getRequiredEnvVarFromObj(process.env, key, devValue);
}
function getRequiredGlobalEnvVar(key, devValue) {
    return getRequiredEnvVarFromObj(ENV, key, devValue);
}
function getDiscordAuthorizeURL(domainUrl) {
    var url = new URL('https://discord.com/api/oauth2/authorize');
    url.searchParams.set('client_id', getRequiredGlobalEnvVar('DISCORD_CLIENT_ID'));
    url.searchParams.set('redirect_uri', "".concat(domainUrl, "/discord/callback"));
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'identify guilds.join email guilds');
    return url.toString();
}
/**
 * @returns domain URL (without a ending slash, like: https://kentcdodds.com)
 */
function getDomainUrl(request) {
    var _a;
    var host = (_a = request.headers.get('X-Forwarded-Host')) !== null && _a !== void 0 ? _a : request.headers.get('host');
    if (!host) {
        throw new Error('Could not determine domain URL.');
    }
    var protocol = host.includes('localhost') ? 'http' : 'https';
    return "".concat(protocol, "://").concat(host);
}
function isResponse(response) {
    return (typeof response === 'object' &&
        response !== null &&
        'status' in response &&
        'headers' in response &&
        'body' in response);
}
function removeTrailingSlash(s) {
    return s.endsWith('/') ? s.slice(0, -1) : s;
}
function getDisplayUrl(requestInfo) {
    return getUrl(requestInfo).replace(/^https?:\/\//, '');
}
function getOrigin(requestInfo) {
    var _a;
    return (_a = requestInfo === null || requestInfo === void 0 ? void 0 : requestInfo.origin) !== null && _a !== void 0 ? _a : 'https://kentcdodds.com';
}
function getUrl(requestInfo) {
    var _a;
    return removeTrailingSlash("".concat(getOrigin(requestInfo)).concat((_a = requestInfo === null || requestInfo === void 0 ? void 0 : requestInfo.path) !== null && _a !== void 0 ? _a : ''));
}
function toBase64(string) {
    if (typeof window === 'undefined') {
        return Buffer.from(string).toString('base64');
    }
    else {
        return window.btoa(string);
    }
}
function useUpdateQueryStringValueWithoutNavigation(queryKey, queryValue) {
    React.useEffect(function () {
        var _a;
        var currentSearchParams = new URLSearchParams(window.location.search);
        var oldQuery = (_a = currentSearchParams.get(queryKey)) !== null && _a !== void 0 ? _a : '';
        if (queryValue === oldQuery)
            return;
        if (queryValue) {
            currentSearchParams.set(queryKey, queryValue);
        }
        else {
            currentSearchParams.delete(queryKey);
        }
        var newUrl = [window.location.pathname, currentSearchParams.toString()]
            .filter(Boolean)
            .join('?');
        // alright, let's talk about this...
        // Normally with remix, you'd update the params via useSearchParams from react-router-dom
        // and updating the search params will trigger the search to update for you.
        // However, it also triggers a navigation to the new url, which will trigger
        // the loader to run which we do not want because all our data is already
        // on the client and we're just doing client-side filtering of data we
        // already have. So we manually call `window.history.pushState` to avoid
        // the router from triggering the loader.
        window.history.replaceState(null, '', newUrl);
    }, [queryKey, queryValue]);
}
function debounce(fn, delay) {
    var timer = null;
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (timer)
            clearTimeout(timer);
        timer = setTimeout(function () {
            fn.apply(void 0, args);
        }, delay);
    };
}
function useDebounce(callback, delay) {
    var callbackRef = React.useRef(callback);
    React.useEffect(function () {
        callbackRef.current = callback;
    });
    return React.useMemo(function () {
        return debounce(function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return callbackRef.current.apply(callbackRef, args);
        }, delay);
    }, [delay]);
}
var reuseUsefulLoaderHeaders = function (_a) {
    var loaderHeaders = _a.loaderHeaders, parentHeaders = _a.parentHeaders;
    var headers = new Headers();
    var usefulHeaders = ['Cache-Control', 'Vary', 'Server-Timing'];
    for (var _i = 0, usefulHeaders_1 = usefulHeaders; _i < usefulHeaders_1.length; _i++) {
        var headerName = usefulHeaders_1[_i];
        if (loaderHeaders.has(headerName)) {
            headers.set(headerName, loaderHeaders.get(headerName));
        }
    }
    var appendHeaders = ['Server-Timing'];
    for (var _b = 0, appendHeaders_1 = appendHeaders; _b < appendHeaders_1.length; _b++) {
        var headerName = appendHeaders_1[_b];
        if (parentHeaders.has(headerName)) {
            headers.append(headerName, parentHeaders.get(headerName));
        }
    }
    var useIfNotExistsHeaders = ['Cache-Control', 'Vary'];
    for (var _c = 0, useIfNotExistsHeaders_1 = useIfNotExistsHeaders; _c < useIfNotExistsHeaders_1.length; _c++) {
        var headerName = useIfNotExistsHeaders_1[_c];
        if (!headers.has(headerName) && parentHeaders.has(headerName)) {
            headers.set(headerName, parentHeaders.get(headerName));
        }
    }
    return headers;
};
exports.reuseUsefulLoaderHeaders = reuseUsefulLoaderHeaders;
function callAll() {
    var fns = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        fns[_i] = arguments[_i];
    }
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return fns.forEach(function (fn) { return fn === null || fn === void 0 ? void 0 : fn.apply(void 0, args); });
    };
}
function useDoubleCheck() {
    var _a = React.useState(false), doubleCheck = _a[0], setDoubleCheck = _a[1];
    function getButtonProps(props) {
        var onBlur = function () {
            return setDoubleCheck(false);
        };
        var onClick = doubleCheck
            ? undefined
            : function (e) {
                e.preventDefault();
                setDoubleCheck(true);
            };
        return __assign(__assign({}, props), { onBlur: callAll(onBlur, props === null || props === void 0 ? void 0 : props.onBlur), onClick: callAll(onClick, props === null || props === void 0 ? void 0 : props.onClick) });
    }
    return { doubleCheck: doubleCheck, getButtonProps: getButtonProps };
}
/**
 * Provide a condition and if that condition is falsey, this throws an error
 * with the given message.
 *
 * inspired by invariant from 'tiny-invariant' except will still include the
 * message in production.
 *
 * @example
 * invariant(typeof value === 'string', `value must be a string`)
 *
 * @param condition The condition to check
 * @param message The message to throw (or a callback to generate the message)
 * @param responseInit Additional response init options if a response is thrown
 *
 * @throws {Error} if condition is falsey
 */
function invariant(condition, message) {
    if (!condition) {
        throw new Error(typeof message === 'function' ? message() : message);
    }
}
/**
 * Provide a condition and if that condition is falsey, this throws a 400
 * Response with the given message.
 *
 * inspired by invariant from 'tiny-invariant'
 *
 * @example
 * invariantResponse(typeof value === 'string', `value must be a string`)
 *
 * @param condition The condition to check
 * @param message The message to throw (or a callback to generate the message)
 * @param responseInit Additional response init options if a response is thrown
 *
 * @throws {Response} if condition is falsey
 */
function invariantResponse(condition, message, responseInit) {
    if (!condition) {
        throw new Response(typeof message === 'function' ? message() : message, __assign({ status: 400 }, responseInit));
    }
}
function useCapturedRouteError() {
    var error = (0, react_1.useRouteError)();
    (0, remix_1.captureRemixErrorBoundaryError)(error);
    return error;
}
function requireValidSlug(slug) {
    if (typeof slug !== 'string' || !/^[a-zA-Z0-9-_.]+$/.test(slug)) {
        throw new Response("This is not a valid slug: \"".concat(slug, "\""), { status: 400 });
    }
}
var listify_ts_1 = require("./listify.ts");
Object.defineProperty(exports, "listify", { enumerable: true, get: function () { return listify_ts_1.listify; } });
