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
Object.defineProperty(exports, "__esModule", { value: true });
exports.useElementState = useElementState;
var react_1 = require("react");
// This started as a work around for https://github.com/framer/motion/issues/1221,
// but it's so much more now. The variants in framer motion support hover, focus
// and tap, while this effect also listens to the keypress, so that `Enter`
// results in an active state as well.
function useElementState() {
    var ref = (0, react_1.useRef)(null);
    var _a = (0, react_1.useState)({
        focus: false,
        hover: false,
        active: false,
    }), state = _a[0], setState = _a[1];
    var setRef = (0, react_1.useCallback)(function (element) {
        ref.current = element;
    }, []);
    (0, react_1.useEffect)(function () {
        var el = ref.current;
        if (!el)
            return;
        var pointerenter = function () { return setState(function (s) { return (__assign(__assign({}, s), { hover: true })); }); };
        var pointerleave = function () { return setState(function (s) { return (__assign(__assign({}, s), { hover: false })); }); };
        var focus = function () { return setState(function (s) { return (__assign(__assign({}, s), { focus: true })); }); };
        var blur = function () { return setState(function (s) { return (__assign(__assign({}, s), { focus: false })); }); };
        var pointerdown = function () {
            setState(function (s) { return (__assign(__assign({}, s), { active: true })); });
            // pointer events can be cancelled due to which el would never receive
            // a pointerup nor pointercancel event. Listen on the window for those
            // after we received the pointerdown event, and only catch it once. But
            // not with { once: true }, because we want te remove both of them, once
            // of them has been received.
            var pointerup = function () {
                setState(function (s) { return (__assign(__assign({}, s), { active: false })); });
                window.removeEventListener('pointerup', pointerup);
                window.removeEventListener('pointercancel', pointerup);
            };
            window.addEventListener('pointerup', pointerup);
            window.addEventListener('pointercancel', pointerup);
        };
        var keydown = function (event) {
            if (event.key !== 'Enter') {
                return;
            }
            setState(function (s) { return (__assign(__assign({}, s), { active: true })); });
            // when clicking a link, the keyup doesn't need to come from the keydown
            // element. We listen on the window instead, but only once.
            var keyup = function () { return setState(function (s) { return (__assign(__assign({}, s), { active: false })); }); };
            window.addEventListener('keyup', keyup, { once: true });
        };
        el.addEventListener('pointerenter', pointerenter);
        el.addEventListener('pointerleave', pointerleave);
        el.addEventListener('focus', focus);
        el.addEventListener('blur', blur);
        el.addEventListener('pointerdown', pointerdown);
        el.addEventListener('keydown', keydown);
        return function () {
            el.removeEventListener('pointerenter', pointerenter);
            el.removeEventListener('pointerleave', pointerleave);
            el.removeEventListener('focus', focus);
            el.removeEventListener('blur', blur);
            el.removeEventListener('pointerdown', pointerdown);
            el.removeEventListener('keydown', keydown);
        };
    }, []);
    var status = state.active
        ? 'active'
        : state.focus
            ? 'focus'
            : state.hover
                ? 'hover'
                : 'initial';
    return [setRef, status];
}
