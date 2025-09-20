"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isModernBrowserByUA = isModernBrowserByUA;
function isModernBrowserByUA(userAgentString) {
    if (!userAgentString)
        return true;
    var ua = String(userAgentString).toLowerCase();
    if (ua.includes('msie') || ua.includes('trident/')) {
        return false;
    }
    function getMajor(re) {
        var match = String(userAgentString).match(re);
        if (!match)
            return null;
        var group = match[1];
        if (typeof group !== 'string')
            return null;
        var major = Number.parseInt(group, 10);
        return Number.isFinite(major) ? major : null;
    }
    var chromeMajor = getMajor(/(?:chrome|crios)\/(\d+)/i);
    var edgeMajor = getMajor(/(?:edg|edge|edgios)\/(\d+)/i);
    var firefoxMajor = getMajor(/(?:firefox|fxios)\/(\d+)/i);
    var operaMajor = getMajor(/(?:opr|opios)\/(\d+)/i);
    var samsungMajor = getMajor(/samsungbrowser\/(\d+)/i);
    var safariMajor = getMajor(/version\/(\d+)/i);
    var MIN = {
        chrome: 100,
        edge: 100,
        firefox: 100,
        opera: 86,
        samsung: 17,
        safari: 15,
    };
    if (samsungMajor != null) {
        return samsungMajor >= MIN.samsung;
    }
    if (firefoxMajor != null) {
        return firefoxMajor >= MIN.firefox;
    }
    if (edgeMajor != null) {
        return edgeMajor >= MIN.edge;
    }
    if (operaMajor != null) {
        if (chromeMajor != null)
            return chromeMajor >= MIN.chrome;
        return operaMajor >= MIN.opera;
    }
    if (chromeMajor != null) {
        return chromeMajor >= MIN.chrome;
    }
    if (safariMajor != null) {
        return safariMajor >= MIN.safari;
    }
    return true;
}
