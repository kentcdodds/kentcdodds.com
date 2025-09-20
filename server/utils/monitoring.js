"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = init;
var profiling_node_1 = require("@sentry/profiling-node");
var remix_1 = require("@sentry/remix");
var browser_support_js_1 = require("./browser-support.js");
function init() {
    remix_1.default.init({
        dsn: process.env.SENTRY_DSN,
        tunnel: '/lookout',
        environment: process.env.NODE_ENV,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 1 : 0,
        denyUrls: [
            /\/healthcheck/,
            // TODO: be smarter about the public assets...
            /\/build\//,
            /\/favicons\//,
            /\/images\//,
            /\/fonts\//,
            /\/apple-touch-.*/,
            /\/robots.txt/,
            /\/favicon.ico/,
            /\/site\.webmanifest/,
        ],
        integrations: [
            remix_1.default.httpIntegration(),
            remix_1.default.prismaIntegration(),
            (0, profiling_node_1.nodeProfilingIntegration)(),
        ],
        tracesSampler: function (samplingContext) {
            var _a, _b;
            // ignore healthcheck transactions by other services (consul, etc.)
            if ((_b = (_a = samplingContext.request) === null || _a === void 0 ? void 0 : _a.url) === null || _b === void 0 ? void 0 : _b.includes('/healthcheck')) {
                return 0;
            }
            return 1;
        },
        beforeSendTransaction: function (event) {
            var _a, _b, _c, _d;
            // ignore all healthcheck related transactions
            //  note that name of header here is case-sensitive
            if (((_b = (_a = event.request) === null || _a === void 0 ? void 0 : _a.headers) === null || _b === void 0 ? void 0 : _b['x-healthcheck']) === 'true') {
                return null;
            }
            // Drop transactions from unsupported/old browsers
            var ua = (_d = (_c = event.request) === null || _c === void 0 ? void 0 : _c.headers) === null || _d === void 0 ? void 0 : _d['user-agent'];
            if (!(0, browser_support_js_1.isModernBrowserByUA)(typeof ua === 'string' ? ua : undefined)) {
                return null;
            }
            return event;
        },
        ignoreErrors: [
            // Add any other errors you want to ignore
            'Request to /lookout failed',
        ],
        beforeSend: function (event) {
            var _a, _b, _c, _d;
            // Ignore events related to the /lookout endpoint
            if ((_b = (_a = event.request) === null || _a === void 0 ? void 0 : _a.url) === null || _b === void 0 ? void 0 : _b.includes('/lookout')) {
                return null;
            }
            // Drop events from unsupported/old browsers
            var ua = (_d = (_c = event.request) === null || _c === void 0 ? void 0 : _c.headers) === null || _d === void 0 ? void 0 : _d['user-agent'];
            if (!(0, browser_support_js_1.isModernBrowserByUA)(typeof ua === 'string' ? ua : undefined)) {
                return null;
            }
            return event;
        },
    });
}
