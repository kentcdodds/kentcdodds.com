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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPromoCookieValue = getPromoCookieValue;
exports.action = action;
exports.Promotification = Promotification;
// This is a full stack component that controls showing a notification message
// which the user can dismiss for a period of time.
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var cookie_1 = require("cookie");
var React = require("react");
var react_2 = require("react");
var spin_delay_1 = require("spin-delay");
var tiny_invariant_1 = require("tiny-invariant");
var button_tsx_1 = require("#app/components/button.tsx");
var icons_tsx_1 = require("#app/components/icons.tsx");
var notification_message_tsx_1 = require("#app/components/notification-message.tsx");
var spinner_tsx_1 = require("#app/components/spinner.tsx");
function getPromoCookieValue(_a) {
    var promoName = _a.promoName, request = _a.request;
    var cookies = cookie_1.default.parse(request.headers.get('Cookie') || '');
    return cookies[promoName];
}
function action(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var formData, maxAge, promoName, cookieHeader;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, request.formData()];
                case 1:
                    formData = _c.sent();
                    maxAge = Number(formData.get('maxAge')) || 60 * 60 * 24 * 7 * 2;
                    promoName = formData.get('promoName');
                    (0, tiny_invariant_1.default)(typeof promoName === 'string', 'promoName must be a string');
                    cookieHeader = cookie_1.default.serialize(promoName, 'hidden', {
                        httpOnly: true,
                        secure: true,
                        sameSite: 'lax',
                        path: '/',
                        maxAge: maxAge,
                    });
                    return [2 /*return*/, (0, node_1.json)({ success: true }, { headers: { 'Set-Cookie': cookieHeader } })];
            }
        });
    });
}
function Promotification(_a) {
    var _b;
    var children = _a.children, promoName = _a.promoName, _c = _a.dismissTimeSeconds, dismissTimeSeconds = _c === void 0 ? 60 * 60 * 24 * 4 : _c, cookieValue = _a.cookieValue, promoEndTime = _a.promoEndTime, props = __rest(_a, ["children", "promoName", "dismissTimeSeconds", "cookieValue", "promoEndTime"]);
    var initialTime = promoEndTime.getTime() - new Date().getTime();
    var isPastEndTime = (0, react_2.useRef)(promoEndTime < new Date());
    var _d = (0, react_2.useState)(cookieValue !== 'hidden'), visible = _d[0], setVisible = _d[1];
    var fetcher = (0, react_1.useFetcher)();
    var showSpinner = (0, spin_delay_1.useSpinDelay)(fetcher.state !== 'idle');
    var disableLink = fetcher.state !== 'idle' || ((_b = fetcher.data) === null || _b === void 0 ? void 0 : _b.success);
    (0, react_2.useEffect)(function () {
        var _a;
        if ((_a = fetcher.data) === null || _a === void 0 ? void 0 : _a.success) {
            setVisible(false);
        }
    }, [fetcher.data]);
    var _e = useCountDown(initialTime, 1000), timeLeft = _e[0], start = _e[1].start;
    (0, react_2.useEffect)(function () {
        if (isPastEndTime.current)
            return;
        start();
    }, [start]);
    var completed = timeLeft <= 0;
    var days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    var hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
    var minutes = Math.floor((timeLeft / 1000 / 60) % 60);
    var seconds = Math.floor((timeLeft / 1000) % 60);
    if (isPastEndTime.current)
        return null;
    return (<notification_message_tsx_1.NotificationMessage {...props} autoClose={false} visible={visible} onDismiss={function () { return setVisible(false); }}>
			{children}
			<div className="mt-4">
				{completed ? (<div>{"Time's up. The sale is over"}</div>) : (<div className="flex flex-wrap gap-3 tabular-nums">
						<span>
							{days} day{days === 1 ? '' : 's'}
						</span>
						<span>
							{hours} hour{hours === 1 ? '' : 's'}
						</span>
						<span>
							{minutes} min{minutes === 1 ? '' : 's'}
						</span>
						<span>
							{seconds} sec{seconds === 1 ? '' : 's'}
						</span>
					</div>)}
				<fetcher.Form action="/resources/promotification" method="POST">
					<input type="hidden" name="promoName" value={promoName}/>
					<input type="hidden" name="maxAge" value={dismissTimeSeconds}/>
					<div className="mt-4 flex flex-wrap items-center justify-end gap-2">
						<button_tsx_1.LinkButton type="submit" className={"text-inverse flex items-center gap-1 transition-opacity ".concat(showSpinner ? 'opacity-50' : '')} disabled={disableLink}>
							<span>Remind me later</span>
							<icons_tsx_1.AlarmIcon />
						</button_tsx_1.LinkButton>
						<spinner_tsx_1.Spinner size={16} showSpinner={showSpinner}/>
					</div>
				</fetcher.Form>
			</div>
		</notification_message_tsx_1.NotificationMessage>);
}
function useCountDown(timeToCount, interval) {
    if (timeToCount === void 0) { timeToCount = 60 * 1000; }
    if (interval === void 0) { interval = 1000; }
    var _a = React.useState(0), timeLeft = _a[0], setTimeLeft = _a[1];
    var timer = React.useRef({});
    var run = React.useCallback(function (ts) {
        var _a, _b;
        var _c;
        if (!timer.current.started) {
            timer.current.started = ts;
            timer.current.lastInterval = ts;
        }
        (_a = (_c = timer.current).lastInterval) !== null && _a !== void 0 ? _a : (_c.lastInterval = 0);
        var localInterval = Math.min(interval, timer.current.timeLeft || Infinity);
        if (ts - timer.current.lastInterval >= localInterval) {
            timer.current.lastInterval += localInterval;
            setTimeLeft(function (prevTimeLeft) {
                timer.current.timeLeft = prevTimeLeft - localInterval;
                return timer.current.timeLeft;
            });
        }
        if (ts - timer.current.started < ((_b = timer.current.timeToCount) !== null && _b !== void 0 ? _b : 0)) {
            timer.current.requestId = window.requestAnimationFrame(run);
        }
        else {
            timer.current = {};
            setTimeLeft(0);
        }
    }, [interval]);
    var start = React.useCallback(function (ttc) {
        if (timer.current.requestId) {
            window.cancelAnimationFrame(timer.current.requestId);
        }
        var newTimeToCount = ttc !== null && ttc !== void 0 ? ttc : timeToCount;
        timer.current.started = null;
        timer.current.lastInterval = null;
        timer.current.timeToCount = newTimeToCount;
        timer.current.requestId = window.requestAnimationFrame(run);
        setTimeLeft(newTimeToCount || 0);
    }, [run, timeToCount]);
    var pause = React.useCallback(function () {
        if (timer.current.requestId) {
            window.cancelAnimationFrame(timer.current.requestId);
        }
        timer.current.started = null;
        timer.current.lastInterval = null;
        timer.current.timeToCount = timer.current.timeLeft;
    }, []);
    var resume = React.useCallback(function () {
        var _a;
        if (!timer.current.started && ((_a = timer.current.timeLeft) !== null && _a !== void 0 ? _a : 0) > 0) {
            if (timer.current.requestId) {
                window.cancelAnimationFrame(timer.current.requestId);
            }
            timer.current.requestId = window.requestAnimationFrame(run);
        }
    }, [run]);
    var reset = React.useCallback(function () {
        if (timer.current.timeLeft) {
            if (timer.current.requestId) {
                window.cancelAnimationFrame(timer.current.requestId);
            }
            timer.current = {};
            setTimeLeft(0);
        }
    }, []);
    var actions = React.useMemo(function () { return ({ start: start, pause: pause, resume: resume, reset: reset }); }, [pause, reset, resume, start]);
    React.useEffect(function () {
        return function () {
            if (timer.current.requestId) {
                window.cancelAnimationFrame(timer.current.requestId);
            }
        };
    }, []);
    return [timeLeft, actions];
}
