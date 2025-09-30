"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tag = Tag;
var checkbox_1 = require("@reach/checkbox");
var clsx_1 = require("clsx");
function Tag(_a) {
    var tag = _a.tag, selected = _a.selected, onClick = _a.onClick, disabled = _a.disabled;
    return (<checkbox_1.CustomCheckboxContainer as="label" checked={selected} onChange={onClick} className={(0, clsx_1.clsx)('relative mb-4 mr-4 block h-auto w-auto cursor-pointer rounded-full px-6 py-3 transition', {
            'text-primary bg-secondary': !selected,
            'text-inverse bg-inverse': selected,
            'focus-ring opacity-100': !disabled,
            'opacity-25': disabled,
        })} disabled={disabled}>
			<checkbox_1.CustomCheckboxInput checked={selected} value={tag} className="sr-only"/>
			<span>{tag}</span>
		</checkbox_1.CustomCheckboxContainer>);
}
