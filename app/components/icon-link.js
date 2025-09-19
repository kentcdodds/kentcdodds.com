"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IconLink = IconLink;
var React = require("react");
function IconLink(props) {
    var _a;
    return (<a {...props} className={"".concat((_a = props.className) !== null && _a !== void 0 ? _a : '', " text-primary hover:text-team-current focus:text-team-current focus:outline-none")}>
			{props.children}
		</a>);
}
