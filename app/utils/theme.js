"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Theme = exports.themes = exports.ThemeFormSchema = exports.THEME_FETCHER_KEY = void 0;
exports.useTheme = useTheme;
exports.useOptimisticThemeMode = useOptimisticThemeMode;
exports.isTheme = isTheme;
exports.Themed = Themed;
var zod_1 = require("@conform-to/zod");
var react_1 = require("@remix-run/react");
var React = require("react");
var zod_2 = require("zod");
var client_hints_tsx_1 = require("./client-hints.tsx");
var request_info_ts_1 = require("./request-info.ts");
var Theme;
(function (Theme) {
    Theme["DARK"] = "dark";
    Theme["LIGHT"] = "light";
})(Theme || (exports.Theme = Theme = {}));
var themes = Object.values(Theme);
exports.themes = themes;
exports.THEME_FETCHER_KEY = 'THEME_FETCHER';
exports.ThemeFormSchema = zod_2.z.object({
    theme: zod_2.z.enum(['system', 'light', 'dark']),
});
/**
 * @returns the user's theme preference, or the client hint theme if the user
 * has not set a preference.
 */
function useTheme() {
    var _a;
    var hints = (0, client_hints_tsx_1.useHints)();
    var requestInfo = (0, request_info_ts_1.useRequestInfo)();
    var optimisticMode = useOptimisticThemeMode();
    if (optimisticMode) {
        return optimisticMode === 'system' ? hints.theme : optimisticMode;
    }
    return (_a = requestInfo.userPrefs.theme) !== null && _a !== void 0 ? _a : hints.theme;
}
/**
 * If the user's changing their theme mode preference, this will return the
 * value it's being changed to.
 */
function useOptimisticThemeMode() {
    var themeFetcher = (0, react_1.useFetcher)({ key: exports.THEME_FETCHER_KEY });
    if (themeFetcher.formData) {
        var submission = (0, zod_1.parseWithZod)(themeFetcher.formData, {
            schema: exports.ThemeFormSchema,
        });
        if (submission.status === 'success')
            return submission.value.theme;
        return null;
    }
}
function Themed(_a) {
    var dark = _a.dark, light = _a.light, _b = _a.initialOnly, initialOnly = _b === void 0 ? false : _b;
    var theme = useTheme()[0];
    var initialTheme = React.useState(theme)[0];
    var themeToReference = initialOnly ? initialTheme : theme;
    return <>{themeToReference === 'l' ? light : dark}</>;
}
function isTheme(value) {
    return typeof value === 'string' && themes.includes(value);
}
