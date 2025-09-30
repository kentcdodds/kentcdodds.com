"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("@remix-run/react");
var React = require("react");
var client_1 = require("react-dom/client");
if (ENV.MODE === 'production' && ENV.SENTRY_DSN) {
    void Promise.resolve().then(function () { return require('./utils/feature-gate.ts'); }).then(function (_a) {
        var hasModernFeatureSet = _a.hasModernFeatureSet;
        if (hasModernFeatureSet()) {
            void Promise.resolve().then(function () { return require('./utils/monitoring.client.tsx'); }).then(function (_a) {
                var init = _a.init;
                return init();
            });
        }
    });
}
function hydrate() {
    React.startTransition(function () {
        (0, client_1.hydrateRoot)(document, <react_1.RemixBrowser />);
    });
}
if (window.requestIdleCallback) {
    window.requestIdleCallback(hydrate);
}
else {
    window.setTimeout(hydrate, 1);
}
