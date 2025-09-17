"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasModernFeatureSet = hasModernFeatureSet;
function hasModernFeatureSet() {
    try {
        var supportsToSorted = typeof Array.prototype.toSorted === 'function';
        var supportsURLCanParse = typeof URL !== 'undefined' &&
            'canParse' in URL &&
            typeof URL.canParse === 'function';
        var supportsCSSHas = typeof CSS !== 'undefined' &&
            typeof CSS.supports === 'function' &&
            CSS.supports('selector(:has(*))');
        return Boolean(supportsToSorted && supportsURLCanParse && supportsCSSHas);
    }
    catch (_a) {
        return false;
    }
}
