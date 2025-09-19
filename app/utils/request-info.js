"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRequestInfo = useRequestInfo;
var react_1 = require("@remix-run/react");
var misc_tsx_1 = require("./misc.tsx");
/**
 * @returns the request info from the root loader
 */
function useRequestInfo() {
    var data = (0, react_1.useRouteLoaderData)('root');
    (0, misc_tsx_1.invariant)(data === null || data === void 0 ? void 0 : data.requestInfo, 'No requestInfo found in root loader');
    return data.requestInfo;
}
