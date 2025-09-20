"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissingSomething = MissingSomething;
exports.Grimmacing = Grimmacing;
exports.Facepalm = Facepalm;
var cloudinary_video_tsx_1 = require("./cloudinary-video.tsx");
function MissingSomething(props) {
    return (<cloudinary_video_tsx_1.CloudinaryVideo cloudinaryId="kentcdodds.com/misc/where_am_i" {...props}/>);
}
function Grimmacing(props) {
    return (<cloudinary_video_tsx_1.CloudinaryVideo cloudinaryId="kentcdodds.com/misc/grimmace" {...props}/>);
}
function Facepalm(props) {
    return (<cloudinary_video_tsx_1.CloudinaryVideo cloudinaryId="kentcdodds.com/misc/facepalm" {...props}/>);
}
