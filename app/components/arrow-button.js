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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArrowButton = ArrowButton;
exports.ArrowLink = ArrowLink;
exports.BackLink = BackLink;
var react_1 = require("@remix-run/react");
var clsx_1 = require("clsx");
var framer_motion_1 = require("framer-motion");
var use_element_state_tsx_1 = require("./hooks/use-element-state.tsx");
var icons_tsx_1 = require("./icons.tsx");
var typography_tsx_1 = require("./typography.tsx");
var arrowVariants = {
    down: {
        initial: { y: 0 },
        hover: { y: 4 },
        focus: {
            y: [0, 4, 0],
            transition: { repeat: Infinity },
        },
        active: { y: 12 },
    },
    up: {
        initial: { y: 0 },
        hover: { y: -4 },
        focus: {
            y: [0, -4, 0],
            transition: { repeat: Infinity },
        },
        active: { y: -12 },
    },
    left: {
        initial: { x: 0 },
        hover: { x: -4 },
        focus: {
            x: [0, -4, 0],
            transition: { repeat: Infinity },
        },
        active: { x: -12 },
    },
    right: {
        initial: { x: 0 },
        hover: { x: 4 },
        focus: {
            x: [0, 4, 0],
            transition: { repeat: Infinity },
        },
        active: { x: 12 },
    },
    'top-right': {
        initial: { x: 0, y: 0 },
        hover: { x: 4, y: -4 },
        focus: {
            x: [0, 4, 0],
            y: [0, -4, 0],
            transition: { repeat: Infinity },
        },
        active: { x: 12, y: -12 },
    },
};
// whileFocus takes precedence over whileTap, so while we can't move the arrow
// on focus (or on tap), we can still color and animate the circle.
// See: https://github.com/framer/motion/issues/1221
function getBaseProps(_a) {
    var textSize = _a.textSize, className = _a.className;
    return {
        className: (0, clsx_1.clsx)('text-primary inline-flex cursor-pointer items-center text-left font-medium transition focus:outline-none', {
            'text-xl': textSize === 'medium',
            'text-lg': textSize === 'small',
        }, className),
    };
}
function ArrowButtonContent(_a) {
    var children = _a.children, _b = _a.direction, direction = _b === void 0 ? 'right' : _b;
    var circumference = 28 * 2 * Math.PI;
    var strokeDasharray = "".concat(circumference, " ").concat(circumference);
    var shouldReduceMotion = (0, framer_motion_1.useReducedMotion)();
    return (<>
			{children &&
            (direction === 'right' ||
                direction === 'up' ||
                direction === 'top-right') ? (<span className="mr-8 text-xl font-medium">{children}</span>) : null}

			<div className="relative inline-flex h-14 w-14 flex-none items-center justify-center p-1">
				<div className="absolute text-gray-200 dark:text-gray-600">
					<svg width="60" height="60">
						<circle stroke="currentColor" strokeWidth="2" fill="transparent" r="28" cx="30" cy="30"/>

						<framer_motion_1.motion.circle className="text-primary" stroke="currentColor" strokeWidth="2" fill="transparent" r="28" cx="30" cy="30" style={{ strokeDasharray: strokeDasharray, rotate: -90 }} variants={{
            initial: { strokeDashoffset: circumference },
            hover: { strokeDashoffset: 0 },
            focus: { strokeDashoffset: 0 },
            active: { strokeDashoffset: 0 },
        }} transition={__assign({ damping: 0 }, (shouldReduceMotion ? { duration: 0 } : null))}/>
					</svg>
				</div>

				<framer_motion_1.motion.span transition={shouldReduceMotion ? { duration: 0 } : {}} variants={shouldReduceMotion ? {} : arrowVariants[direction]}>
					<icons_tsx_1.ArrowIcon direction={direction}/>
				</framer_motion_1.motion.span>
			</div>

			{children && (direction === 'left' || direction === 'down') ? (<span className="ml-8 text-xl font-medium">{children}</span>) : null}
		</>);
}
function ArrowButton(_a) {
    var onClick = _a.onClick, type = _a.type, props = __rest(_a, ["onClick", "type"]);
    var _b = (0, use_element_state_tsx_1.useElementState)(), ref = _b[0], state = _b[1];
    var shouldReduceMotion = (0, framer_motion_1.useReducedMotion)();
    return (<framer_motion_1.motion.button onClick={onClick} type={type} {...getBaseProps(props)} ref={ref} animate={state} transition={shouldReduceMotion ? { duration: 0 } : {}}>
			<ArrowButtonContent {...props}/>
		</framer_motion_1.motion.button>);
}
var MotionLink = (0, framer_motion_1.motion)(react_1.Link);
function ArrowLink(_a) {
    var to = _a.to, href = _a.href, props = __rest(_a, ["to", "href"]);
    var _b = (0, use_element_state_tsx_1.useElementState)(), ref = _b[0], state = _b[1];
    var shouldReduceMotion = (0, framer_motion_1.useReducedMotion)();
    if (href) {
        return (<framer_motion_1.motion.a href={href} {...getBaseProps(props)} ref={ref} animate={state} transition={shouldReduceMotion ? { duration: 0 } : {}}>
				<ArrowButtonContent {...props}/>
			</framer_motion_1.motion.a>);
    }
    else if (to) {
        return (<MotionLink to={to} {...getBaseProps(props)} ref={ref} animate={state} transition={shouldReduceMotion ? { duration: 0 } : {}}>
				<ArrowButtonContent {...props}/>
			</MotionLink>);
    }
    throw new Error('Must provide either to or href to ArrowLink');
}
function BackLink(_a) {
    var to = _a.to, className = _a.className, children = _a.children;
    var _b = (0, use_element_state_tsx_1.useElementState)(), ref = _b[0], state = _b[1];
    var shouldReduceMotion = (0, framer_motion_1.useReducedMotion)();
    return (<MotionLink to={to} className={(0, clsx_1.clsx)('text-primary flex space-x-4 focus:outline-none', className)} ref={ref} animate={state} transition={shouldReduceMotion ? { duration: 0 } : {}}>
			<framer_motion_1.motion.span variants={shouldReduceMotion ? {} : arrowVariants.left} transition={shouldReduceMotion ? { duration: 0 } : {}}>
				<icons_tsx_1.ArrowIcon direction="left"/>
			</framer_motion_1.motion.span>
			<typography_tsx_1.H6 as="span">{children}</typography_tsx_1.H6>
		</MotionLink>);
}
