"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeneralErrorBoundary = GeneralErrorBoundary;
var react_1 = require("@remix-run/react");
var misc_tsx_1 = require("#app/utils/misc.tsx");
function GeneralErrorBoundary(_a) {
    var _b;
    var _c = _a.defaultStatusHandler, defaultStatusHandler = _c === void 0 ? function (_a) {
        var error = _a.error;
        return (<p>
			{error.status} {error.data}
		</p>);
    } : _c, statusHandlers = _a.statusHandlers, _d = _a.unexpectedErrorHandler, unexpectedErrorHandler = _d === void 0 ? function (error) { return <p>{(0, misc_tsx_1.getErrorMessage)(error)}</p>; } : _d;
    var error = (0, misc_tsx_1.useCapturedRouteError)();
    var params = (0, react_1.useParams)();
    if (typeof document !== 'undefined') {
        console.error(error);
    }
    return (<div className="text-h2 container mx-auto flex items-center justify-center p-20">
			{(0, react_1.isRouteErrorResponse)(error)
            ? ((_b = statusHandlers === null || statusHandlers === void 0 ? void 0 : statusHandlers[error.status]) !== null && _b !== void 0 ? _b : defaultStatusHandler)({
                error: error,
                params: params,
            })
            : unexpectedErrorHandler(error)}
		</div>);
}
