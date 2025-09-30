"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.headers = void 0;
exports.default = NoCallSelected;
var headers = function (_a) {
    var parentHeaders = _a.parentHeaders;
    return parentHeaders;
};
exports.headers = headers;
function NoCallSelected() {
    return <div>Select a call</div>;
}
