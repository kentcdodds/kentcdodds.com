"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listify = listify;
function listify(array, _a) {
    var _b = _a === void 0 ? {} : _a, _c = _b.type, type = _c === void 0 ? 'conjunction' : _c, _d = _b.style, style = _d === void 0 ? 'long' : _d, _e = _b.stringify, stringify = _e === void 0 ? function (thing) { return thing.toString(); } : _e;
    var stringified = array.map(function (item) { return stringify(item); });
    var formatter = new Intl.ListFormat('en', { style: style, type: type });
    return formatter.format(stringified);
}
