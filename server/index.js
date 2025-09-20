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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var crypto_1 = require("crypto");
var fs_1 = require("fs");
var path_1 = require("path");
var url_1 = require("url");
var express_1 = require("@remix-run/express");
var node_1 = require("@remix-run/node");
var remix_1 = require("@sentry/remix");
var address_1 = require("address");
var chalk_1 = require("chalk");
var close_with_grace_1 = require("close-with-grace");
var compression_1 = require("compression");
var express_2 = require("express");
require("express-async-errors");
var get_port_1 = require("get-port");
var helmet_1 = require("helmet");
var morgan_1 = require("morgan");
var on_finished_1 = require("on-finished");
var server_timing_1 = require("server-timing");
var source_map_support_1 = require("source-map-support");
var litefs_js_server_ts_1 = require("../app/utils/litefs-js.server.ts");
var redirects_js_1 = require("./redirects.js");
source_map_support_1.default.install();
(0, node_1.installGlobals)();
var viteDevServer = process.env.NODE_ENV === 'production'
    ? undefined
    : await Promise.resolve().then(function () { return require('vite'); }).then(function (vite) {
        return vite.createServer({
            server: { middlewareMode: true },
        });
    });
var getBuild = function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        if (viteDevServer) {
            return [2 /*return*/, viteDevServer.ssrLoadModule('virtual:remix/server-build')];
        }
        // @ts-ignore (this file may or may not exist yet)
        return [2 /*return*/, Promise.resolve().then(function () { return require('../build/server/index.js'); })];
    });
}); };
var __dirname = path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url));
var here = function () {
    var d = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        d[_i] = arguments[_i];
    }
    return path_1.default.join.apply(path_1.default, __spreadArray([__dirname], d, false));
};
var primaryHost = 'kentcdodds.com';
var getHost = function (req) { var _a, _b; return (_b = (_a = req.get('X-Forwarded-Host')) !== null && _a !== void 0 ? _a : req.get('host')) !== null && _b !== void 0 ? _b : ''; };
var MODE = process.env.NODE_ENV;
if (MODE === 'production' && process.env.SENTRY_DSN) {
    void Promise.resolve().then(function () { return require('./utils/monitoring.js'); }).then(function (_a) {
        var init = _a.init;
        return init();
    });
}
if (MODE === 'production') {
    (0, remix_1.init)({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: 0.3,
        environment: process.env.NODE_ENV,
    });
    (0, remix_1.setContext)('region', { name: (_a = process.env.FLY_INSTANCE) !== null && _a !== void 0 ? _a : 'unknown' });
}
var app = (0, express_2.default)();
app.use((0, server_timing_1.default)());
app.get('/img/social', redirects_js_1.oldImgSocial);
// TODO: remove this once all clients are updated
app.post('/__metronome', function (req, res) {
    res.status(503);
    return res.send('Metronome is deprecated and no longer in use.');
});
app.use(function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, currentInstance, primaryInstance, proto, host;
    var _b, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0: return [4 /*yield*/, (0, litefs_js_server_ts_1.getInstanceInfo)()];
            case 1:
                _a = _e.sent(), currentInstance = _a.currentInstance, primaryInstance = _a.primaryInstance;
                res.set('X-Powered-By', 'Kody the Koala');
                res.set('X-Fly-Region', (_b = process.env.FLY_REGION) !== null && _b !== void 0 ? _b : 'unknown');
                res.set('X-Fly-App', (_c = process.env.FLY_APP_NAME) !== null && _c !== void 0 ? _c : 'unknown');
                res.set('X-Fly-Instance', currentInstance);
                res.set('X-Fly-Primary-Instance', primaryInstance);
                res.set('X-Frame-Options', 'SAMEORIGIN');
                proto = (_d = req.get('X-Forwarded-Proto')) !== null && _d !== void 0 ? _d : req.protocol;
                host = getHost(req);
                if (!host.endsWith(primaryHost)) {
                    res.set('X-Robots-Tag', 'noindex');
                }
                res.set('Access-Control-Allow-Origin', "".concat(proto, "://").concat(host));
                // if they connect once with HTTPS, then they'll connect with HTTPS for the next hundred years
                res.set('Strict-Transport-Security', "max-age=".concat(60 * 60 * 24 * 365 * 100));
                next();
                return [2 /*return*/];
        }
    });
}); });
app.use(function (req, res, next) {
    var proto = req.get('X-Forwarded-Proto');
    var host = getHost(req);
    if (proto === 'http') {
        res.set('X-Forwarded-Proto', 'https');
        res.redirect("https://".concat(host).concat(req.originalUrl));
        return;
    }
    next();
});
app.all('*', (0, redirects_js_1.getRedirectsMiddleware)({
    redirectsString: fs_1.default.readFileSync(here('./_redirects.txt'), 'utf8'),
}));
app.use(function (req, res, next) {
    if (req.path.endsWith('/') && req.path.length > 1) {
        var query = req.url.slice(req.path.length);
        var safepath = req.path.slice(0, -1).replace(/\/+/g, '/');
        res.redirect(301, safepath + query);
    }
    else {
        next();
    }
});
app.use((0, compression_1.default)());
var publicAbsolutePath = here('../build/client');
if (viteDevServer) {
    app.use(viteDevServer.middlewares);
}
else {
    app.use(express_2.default.static(publicAbsolutePath, {
        maxAge: '1w',
        setHeaders: function (res, resourcePath) {
            var relativePath = resourcePath.replace("".concat(publicAbsolutePath, "/"), '');
            if (relativePath.startsWith('build/info.json')) {
                res.setHeader('cache-control', 'no-cache');
                return;
            }
            // If we ever change our font (which we quite possibly never will)
            // then we'll just want to change the filename or something...
            // Remix fingerprints its assets so we can cache forever
            if (relativePath.startsWith('fonts') ||
                relativePath.startsWith('build')) {
                res.setHeader('cache-control', 'public, max-age=31536000, immutable');
            }
        },
    }));
}
app.get(['/build/*', '/images/*', '/fonts/*', '/favicons/*'], function (req, res) {
    // if we made it past the express.static for /build, then we're missing something. No bueno.
    return res.status(404).send('Not found');
});
// log the referrer for 404s
app.use(function (req, res, next) {
    (0, on_finished_1.default)(res, function () {
        var referrer = req.get('referer');
        if (res.statusCode === 404 && referrer) {
            console.info("\uD83D\uDC7B 404 on ".concat(req.method, " ").concat(req.path, " referred by: ").concat(referrer));
        }
    });
    next();
});
app.use((0, morgan_1.default)(function (tokens, req, res) {
    var _a, _b, _c, _d, _e, _f;
    try {
        var host = getHost(req);
        return [
            (_a = tokens.method) === null || _a === void 0 ? void 0 : _a.call(tokens, req, res),
            "".concat(host).concat(decodeURIComponent((_c = (_b = tokens.url) === null || _b === void 0 ? void 0 : _b.call(tokens, req, res)) !== null && _c !== void 0 ? _c : '')),
            (_d = tokens.status) === null || _d === void 0 ? void 0 : _d.call(tokens, req, res),
            (_e = tokens.res) === null || _e === void 0 ? void 0 : _e.call(tokens, req, res, 'content-length'),
            '-',
            (_f = tokens['response-time']) === null || _f === void 0 ? void 0 : _f.call(tokens, req, res),
            'ms',
        ].join(' ');
    }
    catch (error) {
        console.error("Error generating morgan log line", error, req.originalUrl);
        return '';
    }
}, {
    skip: function (req, res) {
        if (res.statusCode !== 200)
            return false;
        // skip health check related requests
        var headToRoot = req.method === 'HEAD' && req.originalUrl === '/';
        var getToHealthcheck = req.method === 'GET' && req.originalUrl === '/healthcheck';
        return headToRoot || getToHealthcheck;
    },
}));
app.use(function (req, res, next) {
    res.locals.cspNonce = crypto_1.default.randomBytes(16).toString('hex');
    next();
});
app.use((0, helmet_1.default)({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            'connect-src': __spreadArray(__spreadArray([], (MODE === 'development' ? ['ws:'] : []), true), [
                "'self'",
            ], false).filter(Boolean),
            'font-src': ["'self'"],
            'frame-src': [
                "'self'",
                'youtube.com',
                'www.youtube.com',
                'youtu.be',
                'youtube-nocookie.com',
                'www.youtube-nocookie.com',
                'player.simplecast.com',
                'egghead.io',
                'app.egghead.io',
                'calendar.google.com',
                'codesandbox.io',
                'share.transistor.fm',
                'codepen.io',
            ],
            'img-src': __spreadArray([
                "'self'",
                'data:',
                'res.cloudinary.com',
                'www.gravatar.com',
                'cdn.usefathom.com',
                'pbs.twimg.com',
                'i.ytimg.com',
                'image.simplecastcdn.com',
                'images.transistor.fm',
                'img.transistor.fm',
                'i2.wp.com',
                'i1.wp.com',
                'og-image-react-egghead.now.sh',
                'og-image-react-egghead.vercel.app',
                'www.epicweb.dev'
            ], (MODE === 'development' ? ['cloudflare-ipfs.com'] : []), true),
            'media-src': [
                "'self'",
                'res.cloudinary.com',
                'data:',
                'blob:',
                'www.dropbox.com',
                '*.dropboxusercontent.com',
            ],
            'script-src': [
                "'strict-dynamic'",
                "'unsafe-eval'",
                "'self'",
                'cdn.usefathom.com',
                // @ts-expect-error middleware is the worst
                function (req, res) { return "'nonce-".concat(res.locals.cspNonce, "'"); },
            ],
            'script-src-attr': [
                "'unsafe-inline'",
                // TODO: figure out how to make the nonce work instead of
                // unsafe-inline. I tried adding a nonce attribute where we're using
                // inline attributes, but that didn't work. I still got that it
                // violated the CSP.
            ],
            'upgrade-insecure-requests': null,
        },
    },
}));
app.get('/redirect.html', redirects_js_1.rickRollMiddleware);
// CORS support for /.well-known/*
app.options('/.well-known/*', function (req, res) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', req.header('Access-Control-Request-Headers') || '*');
    res.sendStatus(204);
});
app.use('/.well-known/*', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});
function getRequestHandler() {
    return __awaiter(this, void 0, void 0, function () {
        function getLoadContext(req, res) {
            return { cspNonce: res.locals.cspNonce };
        }
        var _a, _b;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _a = express_1.createRequestHandler;
                    _c = {};
                    if (!(MODE === 'development')) return [3 /*break*/, 1];
                    _b = getBuild;
                    return [3 /*break*/, 3];
                case 1: return [4 /*yield*/, getBuild()];
                case 2:
                    _b = _d.sent();
                    _d.label = 3;
                case 3: return [2 /*return*/, _a.apply(void 0, [(_c.build = _b,
                            _c.mode = MODE,
                            _c.getLoadContext = getLoadContext,
                            _c)])];
            }
        });
    });
}
app.all('*', await getRequestHandler());
var desiredPort = Number(process.env.PORT || 3000);
var portToUse = await (0, get_port_1.default)({
    port: (0, get_port_1.portNumbers)(desiredPort, desiredPort + 100),
});
var server = app.listen(portToUse, function () {
    var _a;
    var addy = server.address();
    var portUsed = desiredPort === portToUse
        ? desiredPort
        : addy && typeof addy === 'object'
            ? addy.port
            : 0;
    if (portUsed !== desiredPort) {
        console.warn(chalk_1.default.yellow("\u26A0\uFE0F  Port ".concat(desiredPort, " is not available, using ").concat(portUsed, " instead.")));
    }
    console.log("\n\uD83D\uDC28  let's get rolling!");
    var localUrl = "http://localhost:".concat(portUsed);
    var lanUrl = null;
    var localIp = (_a = (0, address_1.ip)()) !== null && _a !== void 0 ? _a : 'Unknown';
    // Check if the address is a private ip
    // https://en.wikipedia.org/wiki/Private_network#Private_IPv4_address_spaces
    // https://github.com/facebook/create-react-app/blob/d960b9e38c062584ff6cfb1a70e1512509a966e7/packages/react-dev-utils/WebpackDevServerUtils.js#LL48C9-L54C10
    if (/^10[.]|^172[.](1[6-9]|2[0-9]|3[0-1])[.]|^192[.]168[.]/.test(localIp)) {
        lanUrl = "http://".concat(localIp, ":").concat(portUsed);
    }
    console.log("\n".concat(chalk_1.default.bold('Local:'), "            ").concat(chalk_1.default.cyan(localUrl), "\n").concat(lanUrl ? "".concat(chalk_1.default.bold('On Your Network:'), "  ").concat(chalk_1.default.cyan(lanUrl)) : '', "\n").concat(chalk_1.default.bold('Press Ctrl+C to stop'), "\n\t\t").trim());
});
var wss;
if (process.env.NODE_ENV === 'development') {
    try {
        var contentWatcher = (await Promise.resolve().then(function () { return require('./content-watcher.js'); })).contentWatcher;
        wss = contentWatcher(server);
    }
    catch (error) {
        console.error('unable to start content watcher', error);
    }
}
(0, close_with_grace_1.default)(function () {
    return Promise.all([
        new Promise(function (resolve, reject) {
            server.close(function (e) { return (e ? reject(e) : resolve('ok')); });
        }),
        new Promise(function (resolve, reject) {
            wss === null || wss === void 0 ? void 0 : wss.close(function (e) { return (e ? reject(e) : resolve('ok')); });
        }),
    ]);
});
/*
eslint
  @typescript-eslint/ban-ts-comment: "off",
  @typescript-eslint/prefer-ts-expect-error: "off",
  @typescript-eslint/no-shadow: "off",
  import/namespace: "off",
  no-inner-declarations: "off",
*/
