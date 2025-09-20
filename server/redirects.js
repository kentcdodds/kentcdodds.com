"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rickRollMiddleware = exports.oldImgSocial = void 0;
exports.getRedirectsMiddleware = getRedirectsMiddleware;
var path_to_regexp_1 = require("path-to-regexp");
function typedBoolean(value) {
    return Boolean(value);
}
function getRedirectsMiddleware(_a) {
    var redirectsString = _a.redirectsString;
    var possibleMethods = ['HEAD', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', '*'];
    var redirects = redirectsString
        .split('\n')
        .map(function (line, lineNumber) {
        if (!line.trim() || line.startsWith('#'))
            return null;
        var methods, from, to;
        var _a = line
            .split(' ')
            .map(function (l) { return l.trim(); })
            .filter(Boolean), one = _a[0], two = _a[1], three = _a[2];
        if (!one)
            return null;
        var splitOne = one.split(',');
        if (possibleMethods.some(function (m) { return splitOne.includes(m); })) {
            methods = splitOne;
            from = two;
            to = three;
        }
        else {
            methods = ['*'];
            from = one;
            to = two;
        }
        if (!from || !to) {
            console.error("Invalid redirect on line ".concat(lineNumber + 1, ": \"").concat(line, "\""));
            return null;
        }
        var keys = [];
        var toUrl = to.includes('//')
            ? new URL(to)
            : new URL("https://same_host".concat(to));
        try {
            return {
                methods: methods,
                from: (0, path_to_regexp_1.pathToRegexp)(from, keys),
                keys: keys,
                toPathname: (0, path_to_regexp_1.compile)(toUrl.pathname, {
                    encode: encodeURIComponent,
                }),
                toUrl: toUrl,
            };
        }
        catch (_b) {
            // if parsing the redirect fails, we'll warn, but we won't crash
            console.error("Failed to parse redirect on line ".concat(lineNumber, ": \"").concat(line, "\""));
            return null;
        }
    })
        .filter(typedBoolean);
    return function redirectsMiddleware(req, res, next) {
        var _a;
        var host = (_a = req.header('X-Forwarded-Host')) !== null && _a !== void 0 ? _a : req.header('host');
        var protocol = (host === null || host === void 0 ? void 0 : host.includes('localhost')) ? 'http' : 'https';
        var reqUrl;
        try {
            reqUrl = new URL("".concat(protocol, "://").concat(host).concat(req.url));
        }
        catch (_b) {
            console.error("Invalid URL: ".concat(protocol, "://").concat(host).concat(req.url));
            next();
            return;
        }
        for (var _i = 0, redirects_1 = redirects; _i < redirects_1.length; _i++) {
            var redirect = redirects_1[_i];
            try {
                if (!redirect.methods.includes('*') &&
                    !redirect.methods.includes(req.method)) {
                    continue;
                }
                var match = req.path.match(redirect.from);
                if (!match)
                    continue;
                var params = {};
                var paramValues = match.slice(1);
                for (var paramIndex = 0; paramIndex < paramValues.length; paramIndex++) {
                    var paramValue = paramValues[paramIndex];
                    var key = redirect.keys[paramIndex];
                    if (key && paramValue) {
                        params[key.name] = paramValue;
                    }
                }
                var toUrl = new URL(redirect.toUrl);
                toUrl.protocol = protocol;
                if (toUrl.host === 'same_host')
                    toUrl.host = reqUrl.host;
                for (var _c = 0, _d = reqUrl.searchParams.entries(); _c < _d.length; _c++) {
                    var _e = _d[_c], key = _e[0], value = _e[1];
                    toUrl.searchParams.append(key, value);
                }
                toUrl.pathname = redirect.toPathname(params);
                res.redirect(307, toUrl.toString());
                return;
            }
            catch (error) {
                // an error in the redirect shouldn't stop the request from going through
                console.error("Error processing redirects:", {
                    error: error,
                    redirect: redirect,
                    'req.url': req.url,
                });
            }
        }
        next();
    };
}
var oldImgSocial = function (req, res) {
    res.redirect('https://res.cloudinary.com/kentcdodds-com/image/upload/$th_1256,$tw_2400,$gw_$tw_div_24,$gh_$th_div_12/co_white,c_fit,g_north_west,w_$gw_mul_10,h_$gh_mul_7,x_$gw_mul_1.3,y_$gh_mul_1.5,l_text:kentcdodds.com:Matter-Regular.woff2_110:Helping%2520people%2520make%2520the%2520world%2520a%2520better%2520place%2520through%2520quality%2520software./c_fit,g_north_west,r_max,w_$gw_mul_4,h_$gh_mul_3,x_$gw,y_$gh_mul_8,l_kent:profile-transparent/co_rgb:a9adc1,c_fit,g_north_west,w_$gw_mul_5.5,h_$gh_mul_4,x_$gw_mul_4.5,y_$gh_mul_9,l_text:kentcdodds.com:Matter-Regular.woff2_70:Kent%20C.%20Dodds/co_rgb:a9adc1,c_fit,g_north_west,w_$gw_mul_5.5,x_$gw_mul_4.5,y_$gh_mul_9.8,l_text:kentcdodds.com:Matter-Regular.woff2_40:kentcdodds.com/c_fit,g_east,w_$gw_mul_11,h_$gh_mul_11,x_$gw,l_kentcdodds.com:illustrations:kody:kody_snowboarding_flying_blue/c_fill,w_$tw,h_$th/kentcdodds.com/social-background.png');
};
exports.oldImgSocial = oldImgSocial;
var rickRollMiddleware = function (req, res) {
    return res.set('Content-Type', 'text/html').send("\n<!--\n  this page is a joke. It allows me to do a client-side redirect so twitter\n  won't show when I'm rick-rolling someone \uD83E\uDD2D\n-->\n<script nonce=".concat(res.locals.cspNonce, ">\n  var urlToRedirectTo = getQueryStringParam(location.href, 'url') || '/'\n  window.location.replace(urlToRedirectTo)\n  function getQueryStringParam(url, name) {\n    var regexReadyName = name.replace(/[\\[]/, '\\[').replace(/[\\]]/, '\\]')\n    var regex = new RegExp(`[\\\\?&]${regexReadyName}=([^&#]*)`)\n    var results = regex.exec(url)\n    return results === null\n      ? ''\n      : decodeURIComponent(results[1].replace(/\\+/g, ' '))\n  }\n</script>\n  "));
};
exports.rickRollMiddleware = rickRollMiddleware;
