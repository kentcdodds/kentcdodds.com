"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useNonce = exports.NonceProvider = exports.NonceContext = void 0;
var React = require("react");
// This exists to allow us to render React with a nonce on the server and
// without one on the client. This is necessary because we can't send the nonce
// to the client in JS because it's a security risk and the browser removes the
// nonce attribute from scripts and things anyway so if we hydrated with a nonce
// we'd get a hydration warning.
exports.NonceContext = React.createContext('');
exports.NonceProvider = exports.NonceContext.Provider;
var useNonce = function () { return React.useContext(exports.NonceContext); };
exports.useNonce = useNonce;
