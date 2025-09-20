"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTheme = getTheme;
exports.setTheme = setTheme;
var cookie = require("cookie");
var cookieName = 'en_theme';
function getTheme(request) {
    var cookieHeader = request.headers.get('cookie');
    var parsed = cookieHeader ? cookie.parse(cookieHeader)[cookieName] : 'light';
    if (parsed === 'light' || parsed === 'dark')
        return parsed;
    return null;
}
function setTheme(theme) {
    if (theme === 'system') {
        return cookie.serialize(cookieName, '', { path: '/', maxAge: -1 });
    }
    else {
        return cookie.serialize(cookieName, theme, { path: '/' });
    }
}
