"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spacer = Spacer;
var spacerSizes = {
    '3xs': 'h-6 lg:h-8',
    '2xs': 'h-10 lg:h-12',
    xs: 'h-20 lg:h-24',
    sm: 'h-32 lg:h-36',
    base: 'h-40 lg:h-48',
    lg: 'h-56 lg:h-64',
};
function Spacer(_a) {
    var size = _a.size, _b = _a.className, className = _b === void 0 ? '' : _b;
    return <div className={"".concat(className, " ").concat(spacerSizes[size])}/>;
}
