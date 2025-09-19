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
exports.TeamCircle = TeamCircle;
function polarToCartesian(x, y, r, degrees) {
    var radians = (degrees * Math.PI) / 180.0;
    return [x + r * Math.cos(radians), y + r * Math.sin(radians)];
}
function getSegmentPath(_a, segment, span) {
    var size = _a.size, _b = _a.margin, margin = _b === void 0 ? 0.1 : _b, segments = _a.segments, _c = _a.radius, radius = _c === void 0 ? size / 2 : _c, _d = _a.width, width = _d === void 0 ? 1 : _d;
    if (span === void 0) { span = 1; }
    var center = size / 2;
    var degrees = 360 / segments;
    var shift = margin === 0 ? -90 : -90 + (degrees * margin) / 2;
    var start = shift + degrees * segment;
    var end = shift + degrees * (segment + span - margin) + (margin == 0 ? 1 : 0);
    var innerRadius = radius - width;
    var arc = Math.abs(start - end) > 180 ? 1 : 0;
    var point = function (rad, deg) {
        return polarToCartesian(center, center, rad, deg)
            .map(function (n) { return n.toPrecision(5); })
            .join(',');
    };
    return [
        "M".concat(point(radius, start)),
        "A".concat(radius, ",").concat(radius, ",0,").concat(arc, ",1,").concat(point(radius, end)),
        "L".concat(point(radius - width, end)),
        "A".concat(innerRadius, ",").concat(innerRadius, ",0,").concat(arc, ",0,").concat(point(innerRadius, start)),
        'Z',
    ].join('');
}
var colors = {
    YELLOW: 'text-team-yellow',
    BLUE: 'text-team-blue',
    RED: 'text-team-red',
    UNKNOWN: 'text-team-unknown',
};
function TeamCircle(_a) {
    var size = _a.size, _b = _a.width, width = _b === void 0 ? 2 : _b, team = _a.team;
    var options = { size: size, width: width, margin: 0.05, segments: 3 };
    if (team === 'UNKNOWN') {
        return (<svg height={size} width={size} viewBox={"0 0 ".concat(size, " ").concat(size)}>
				<path d={getSegmentPath(options, 0)} className="text-team-yellow" fill="currentColor"/>
				<path d={getSegmentPath(options, 1)} className="text-team-blue" fill="currentColor"/>
				<path d={getSegmentPath(options, 2)} className="text-team-red" fill="currentColor"/>
			</svg>);
    }
    var _c = Object.keys(colors).filter(function (x) { return x !== team; }), teamOne = _c[0], teamTwo = _c[1];
    // The relative size of the "current team" compared to the other teams. A 3
    // means that the current team is rendered 3 times as large as the other teams.
    var teamSpan = 3;
    options = __assign(__assign({}, options), { segments: 2 + 2 * teamSpan });
    return (<svg height={size} width={size} viewBox={"0 0 ".concat(size, " ").concat(size)}>
			<path d={getSegmentPath(options, 0, teamSpan)} className={colors[team]} fill="currentColor"/>
			<path d={getSegmentPath(options, teamSpan)} className={colors[teamOne]} fill="currentColor"/>
			<path d={getSegmentPath(options, teamSpan + 1, teamSpan)} className={colors[team]} fill="currentColor"/>
			<path d={getSegmentPath(options, options.segments - 1)} className={colors[teamTwo]} fill="currentColor"/>
		</svg>);
}
