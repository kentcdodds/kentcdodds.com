"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = init;
var react_1 = require("@remix-run/react");
var remix_1 = require("@sentry/remix");
var react_2 = require("react");
function init() {
    (0, remix_1.init)({
        dsn: ENV.SENTRY_DSN,
        tunnel: '/resources/lookout',
        environment: ENV.MODE,
        ignoreErrors: [
            // Add any other errors you want to ignore
            'Request to /lookout failed',
        ],
        beforeSend: function (event, hint) {
            var _a, _b, _c, _d;
            if (isBrowserExtensionError(hint.originalException)) {
                return null;
            }
            // Ignore events related to the /lookout endpoint
            if ((_b = (_a = event.request) === null || _a === void 0 ? void 0 : _a.url) === null || _b === void 0 ? void 0 : _b.includes('/lookout')) {
                return null;
            }
            // Filter out errors related to Google translation service
            if ((_d = (_c = event.request) === null || _c === void 0 ? void 0 : _c.url) === null || _d === void 0 ? void 0 : _d.includes('translate-pa.googleapis.com')) {
                return null;
            }
            return event;
        },
        beforeSendTransaction: function (event) {
            return event;
        },
        integrations: [
            (0, remix_1.browserTracingIntegration)({
                useEffect: react_2.useEffect,
                useLocation: react_1.useLocation,
                useMatches: react_1.useMatches,
            }),
            (0, remix_1.replayIntegration)(),
            (0, remix_1.browserProfilingIntegration)(),
        ],
        // Set tracesSampleRate to 1.0 to capture 100%
        // of transactions for performance monitoring.
        // We recommend adjusting this value in production
        tracesSampleRate: 1.0,
        // Capture Replay for 10% of all sessions,
        // plus for 100% of sessions with an error
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
    });
}
function isBrowserExtensionError(exception) {
    if (exception instanceof Error && exception.stack) {
        var extensionPattern = /chrome-extension:|moz-extension:|extensions|anonymous scripts/;
        return extensionPattern.test(exception.stack);
    }
    return false;
}
