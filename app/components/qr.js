"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var qrcode_1 = require("qrcode");
var React = require("react");
function QRCode(_a) {
    var text = _a.text;
    var canvasRef = React.useRef(null);
    React.useEffect(function () {
        void (0, qrcode_1.toCanvas)(canvasRef.current, text);
    }, [text]);
    return <canvas ref={canvasRef}/>;
}
// default export for code splitting
exports.default = QRCode;
