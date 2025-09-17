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
Object.defineProperty(exports, "__esModule", { value: true });
exports.H1 = H1;
exports.H2 = H2;
exports.H3 = H3;
exports.H4 = H4;
exports.H5 = H5;
exports.H6 = H6;
exports.Paragraph = Paragraph;
var clsx_1 = require("clsx");
var React = require("react");
var fontSize = {
    h1: 'leading-tight text-4xl md:text-5xl',
    h2: 'leading-tight text-3xl md:text-4xl',
    h3: 'text-2xl font-medium md:text-3xl',
    h4: 'text-xl font-medium md:text-2xl',
    h5: 'text-lg font-medium md:text-xl',
    h6: 'text-lg font-medium',
};
var titleColors = {
    primary: 'text-black dark:text-white',
    secondary: 'text-gray-600 dark:text-slate-500',
};
function Title(_a) {
    var _b = _a.variant, variant = _b === void 0 ? 'primary' : _b, size = _a.size, as = _a.as, className = _a.className, rest = __rest(_a, ["variant", "size", "as", "className"]);
    var Tag = as !== null && as !== void 0 ? as : size;
    return (<Tag className={(0, clsx_1.clsx)(fontSize[size], titleColors[variant], className)} {...rest}/>);
}
function H1(props) {
    return <Title {...props} size="h1"/>;
}
function H2(props) {
    return <Title {...props} size="h2"/>;
}
function H3(props) {
    return <Title {...props} size="h3"/>;
}
function H4(props) {
    return <Title {...props} size="h4"/>;
}
function H5(props) {
    return <Title {...props} size="h5"/>;
}
function H6(props) {
    return <Title {...props} size="h6"/>;
}
function Paragraph(_a) {
    var className = _a.className, _b = _a.prose, prose = _b === void 0 ? true : _b, _c = _a.as, as = _c === void 0 ? 'p' : _c, _d = _a.textColorClassName, textColorClassName = _d === void 0 ? 'text-secondary' : _d, rest = __rest(_a, ["className", "prose", "as", "textColorClassName"]);
    return React.createElement(as, __assign({ className: (0, clsx_1.clsx)('max-w-full text-lg', textColorClassName, className, {
            'prose prose-light dark:prose-dark': prose,
        }) }, rest));
}
