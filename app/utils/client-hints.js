"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHints = void 0;
exports.useHints = useHints;
exports.ClientHintCheck = ClientHintCheck;
/**
 * This file contains utilities for using client hints for user preference which
 * are needed by the server, but are only known by the browser.
 */
var client_hints_1 = require("@epic-web/client-hints");
var color_scheme_1 = require("@epic-web/client-hints/color-scheme");
var time_zone_1 = require("@epic-web/client-hints/time-zone");
var react_1 = require("@remix-run/react");
var React = require("react");
var request_info_ts_1 = require("./request-info.ts");
var hintsUtils = (0, client_hints_1.getHintUtils)({
    theme: color_scheme_1.clientHint,
    timeZone: time_zone_1.clientHint,
    // add other hints here
});
exports.getHints = hintsUtils.getHints;
/**
 * @returns an object with the client hints and their values
 */
function useHints() {
    var requestInfo = (0, request_info_ts_1.useRequestInfo)();
    return requestInfo.hints;
}
/**
 * @returns inline script element that checks for client hints and sets cookies
 * if they are not set then reloads the page if any cookie was set to an
 * inaccurate value.
 */
function ClientHintCheck(_a) {
    var nonce = _a.nonce;
    var revalidate = (0, react_1.useRevalidator)().revalidate;
    React.useEffect(function () { return (0, color_scheme_1.subscribeToSchemeChange)(function () { return revalidate(); }); }, [revalidate]);
    return (<script nonce={nonce} dangerouslySetInnerHTML={{
            __html: hintsUtils.getClientHintCheckScript(),
        }}/>);
}
