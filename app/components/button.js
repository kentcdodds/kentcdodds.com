"use strict";
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
exports.Button = Button;
exports.ButtonLink = ButtonLink;
exports.LinkButton = LinkButton;
var clsx_1 = require("clsx");
var React = require("react");
var misc_tsx_1 = require("#app/utils/misc.tsx");
function getClassName(_a) {
    var className = _a.className;
    return (0, clsx_1.clsx)('group relative inline-flex text-lg font-medium opacity-100 transition focus:outline-none disabled:opacity-50', className);
}
function ButtonInner(_a) {
    var children = _a.children, variant = _a.variant, _b = _a.size, size = _b === void 0 ? 'large' : _b;
    return (<>
			<div className={(0, clsx_1.clsx)('focus-ring absolute inset-0 transform rounded-full opacity-100 transition disabled:opacity-50', {
            'border-secondary bg-primary border-2 group-hover:border-transparent group-focus:border-transparent': variant === 'secondary' || variant === 'danger',
            danger: variant === 'danger',
            'bg-inverse': variant === 'primary',
        })}/>

			<div className={(0, clsx_1.clsx)('relative flex h-full w-full items-center justify-center whitespace-nowrap', {
            'text-primary': variant === 'secondary',
            'text-inverse': variant === 'primary',
            'text-red-500': variant === 'danger',
            'space-x-5 px-11 py-6': size === 'large',
            'space-x-3 px-8 py-4': size === 'medium',
            'space-x-1 px-5 py-2 text-sm': size === 'small',
        })}>
				{children}
			</div>
		</>);
}
function Button(_a) {
    var children = _a.children, _b = _a.variant, variant = _b === void 0 ? 'primary' : _b, _c = _a.size, size = _c === void 0 ? 'large' : _c, className = _a.className, buttonProps = __rest(_a, ["children", "variant", "size", "className"]);
    return (<button {...buttonProps} className={getClassName({ className: className })}>
			<ButtonInner variant={variant} size={size}>
				{children}
			</ButtonInner>
		</button>);
}
/**
 * A button that looks like a link
 */
function LinkButton(_a) {
    var className = _a.className, underlined = _a.underlined, buttonProps = __rest(_a, ["className", "underlined"]);
    return (<button {...buttonProps} className={(0, clsx_1.clsx)(className, underlined
            ? 'underlined whitespace-nowrap focus:outline-none'
            : 'underline', (className === null || className === void 0 ? void 0 : className.includes('block')) ? '' : 'inline-block', 'text-primary')}/>);
}
/**
 * A link that looks like a button
 */
function ButtonLink(_a) {
    var children = _a.children, _b = _a.variant, variant = _b === void 0 ? 'primary' : _b, className = _a.className, ref = _a.ref, rest = __rest(_a, ["children", "variant", "className", "ref"]);
    return (<misc_tsx_1.AnchorOrLink ref={ref} className={getClassName({ className: className })} {...rest}>
			<ButtonInner variant={variant}>{children}</ButtonInner>
		</misc_tsx_1.AnchorOrLink>);
}
