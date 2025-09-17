"use strict";
// This is called a "splat route" and as it's in the root `/app/routes/`
// directory, it's a catchall. If no other routes match, this one will and we
// can know that the user is hitting a URL that doesn't exist. By throwing a
// 404 from the loader, we can force the error boundary to render which will
// ensure the user gets the right status code and we can display a nicer error
// message for them than the Remix and/or browser default.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.loader = loader;
exports.default = NotFound;
exports.ErrorBoundary = ErrorBoundary;
var react_1 = require("@remix-run/react");
var arrow_button_tsx_1 = require("#app/components/arrow-button.tsx");
var error_boundary_tsx_1 = require("#app/components/error-boundary.tsx");
var errors_tsx_1 = require("#app/components/errors.tsx");
var kifs_tsx_1 = require("#app/components/kifs.tsx");
function loader() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            throw new Response('Not found', { status: 404 });
        });
    });
}
function NotFound() {
    // due to the loader, this component will never be rendered, but we'll return
    // the error boundary just in case.
    return <ErrorBoundary />;
}
function ErrorBoundary() {
    var location = (0, react_1.useLocation)();
    return (<error_boundary_tsx_1.GeneralErrorBoundary statusHandlers={{
            400: function () { return (<errors_tsx_1.ErrorPage heroProps={{
                    title: '400 - Oh no, you did something wrong.',
                    subtitle: "If you think I did something wrong, let me know...",
                    image: <kifs_tsx_1.Facepalm className="rounded-lg" aspectRatio="3:4"/>,
                    action: <arrow_button_tsx_1.ArrowLink href="/">Go home</arrow_button_tsx_1.ArrowLink>,
                }}/>); },
            404: function () { return (<errors_tsx_1.ErrorPage heroProps={{
                    title: "404 - Oh no, you found a page that's missing stuff.",
                    subtitle: "\"".concat(location.pathname, "\" is not a page on kentcdodds.com. So sorry."),
                    image: (<kifs_tsx_1.MissingSomething className="rounded-lg" aspectRatio="3:4"/>),
                    action: <arrow_button_tsx_1.ArrowLink href="/">Go home</arrow_button_tsx_1.ArrowLink>,
                }}/>); },
        }}/>);
}
