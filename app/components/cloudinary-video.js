"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryVideo = CloudinaryVideo;
function CloudinaryVideo(_a) {
    var className = _a.className, _b = _a.width, width = _b === void 0 ? 1000 : _b, height = _a.height, aspectRatio = _a.aspectRatio, _c = _a.crop, crop = _c === void 0 ? 'fill' : _c, cloudinaryId = _a.cloudinaryId;
    var transforms = [
        "f_auto:video",
        "q_auto",
        "c_".concat(crop),
        "ac_none",
        aspectRatio ? "ar_".concat(aspectRatio) : null,
        "w_".concat(width),
        height ? "h_".concat(height) : null,
        'fl_keep_dar',
    ]
        .filter(Boolean)
        .join(',');
    return (<video className={className} autoPlay src={"https://res.cloudinary.com/kentcdodds-com/video/upload/".concat(transforms, "/").concat(cloudinaryId)} muted loop controls={false} style={__assign({ width: '100%' }, (aspectRatio ? { aspectRatio: aspectRatio.replace(':', '/') } : {}))}/>);
}
