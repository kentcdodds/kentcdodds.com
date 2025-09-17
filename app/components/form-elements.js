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
exports.Input = exports.inputClassName = void 0;
exports.FieldContainer = FieldContainer;
exports.Label = Label;
exports.InputError = InputError;
exports.Field = Field;
exports.ButtonGroup = ButtonGroup;
exports.ErrorPanel = ErrorPanel;
var clsx_1 = require("clsx");
var React = require("react");
function Label(_a) {
    var className = _a.className, labelProps = __rest(_a, ["className"]);
    return (<label {...labelProps} className={(0, clsx_1.clsx)('inline-block text-lg text-gray-500 dark:text-slate-500', className)}/>);
}
exports.inputClassName = 'placeholder-gray-500 dark:disabled:text-slate-500 focus-ring px-11 py-8 w-full text-black disabled:text-gray-400 dark:text-white text-lg font-medium bg-gray-100 dark:bg-gray-800 rounded-lg';
var Input = function Input(_a) {
    var ref = _a.ref, props = __rest(_a, ["ref"]);
    var className = (0, clsx_1.clsx)(exports.inputClassName, props.className);
    if (props.type === 'textarea') {
        return (<textarea {...props} className={className}/>);
    }
    return (<input {...props} className={className} ref={ref}/>);
};
exports.Input = Input;
function InputError(_a) {
    var children = _a.children, id = _a.id;
    if (!children) {
        return null;
    }
    return (<p role="alert" id={id} className="text-sm text-red-500">
			{children}
		</p>);
}
function Field(_a) {
    var ref = _a.ref, defaultValue = _a.defaultValue, error = _a.error, name = _a.name, label = _a.label, className = _a.className, description = _a.description, id = _a.id, props = __rest(_a, ["ref", "defaultValue", "error", "name", "label", "className", "description", "id"]);
    return (<FieldContainer id={id} label={label} className={className} error={error} description={description}>
			{function (_a) {
            var inputProps = _a.inputProps;
            return (<Input 
            // @ts-expect-error no idea 🤷‍♂️
            ref={ref} required {...props} {...inputProps} name={name} autoComplete={name} defaultValue={defaultValue}/>);
        }}
		</FieldContainer>);
}
function FieldContainer(_a) {
    var error = _a.error, label = _a.label, className = _a.className, description = _a.description, id = _a.id, children = _a.children;
    var defaultId = React.useId();
    var inputId = id !== null && id !== void 0 ? id : defaultId;
    var errorId = "".concat(inputId, "-error");
    var descriptionId = "".concat(inputId, "-description");
    return (<div className={(0, clsx_1.clsx)('mb-8', className)}>
			<div className="mb-4 flex items-baseline justify-between gap-2">
				<Label htmlFor={inputId}>{label}</Label>
				{error ? (<InputError id={errorId}>{error}</InputError>) : description ? (<div id={descriptionId} className="text-primary text-lg">
						{description}
					</div>) : null}
			</div>

			{children({
            inputProps: {
                id: inputId,
                'aria-describedby': error
                    ? errorId
                    : description
                        ? descriptionId
                        : undefined,
            },
        })}
		</div>);
}
function ButtonGroup(_a) {
    var children = _a.children;
    return (<div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
			{children}
		</div>);
}
function ErrorPanel(_a) {
    var children = _a.children, id = _a.id;
    return (<div role="alert" className="relative mt-8 px-11 py-8" id={id}>
			<div className="absolute inset-0 rounded-lg bg-red-500 opacity-25"/>
			<div className="text-primary relative text-lg font-medium">
				{children}
			</div>
		</div>);
}
