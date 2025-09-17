"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.heroTextAnimation = void 0;
/**
 * This file generates keyframes for any animation, you can extend it with more properties if needed.
 * It is designed to be used with Tailwind config and CSS variables.
 * Main problem it solves is implementing a sequence of animations with static keyframes
 * and allowing it to be controlled with CSS variables.
 * @param name Name of the animation, will be used as a prefix for CSS variables
 * @param steps Maximum amount of steps the animation will have including all conditional steps
 * @param initial Initial style for the animation
 * @param visible Visible style for the animation
 */
function generateAnimation(_a) {
    var _b, _c, _d;
    var name = _a.name, steps = _a.steps, initial = _a.initial, visible = _a.visible;
    var keyframes = new Map();
    keyframes.set('0%', {
        opacity: ((_b = initial.opacity) !== null && _b !== void 0 ? _b : 0).toString(),
        transform: "translate(".concat((_c = initial.x) !== null && _c !== void 0 ? _c : 0, ", ").concat((_d = initial.y) !== null && _d !== void 0 ? _d : 0, ")"),
    });
    for (var step = 0; step < steps; step++) {
        keyframes.set("".concat((100 * (step + 1)) / steps, "%"), {
            opacity: "var(--".concat(name, "-opacity-step-").concat(step, ")"),
            transform: "translate(var(--".concat(name, "-x-step-").concat(step, "), var(--").concat(name, "-y-step-").concat(step, "))"),
        });
    }
    function getVariables(activeStep) {
        var _a, _b, _c;
        var variables = new Map();
        for (var step = 0; step < steps; step++) {
            var value = step >= activeStep ? visible : initial;
            variables.set("--".concat(name, "-opacity-step-").concat(step), (_a = value.opacity) !== null && _a !== void 0 ? _a : 0);
            variables.set("--".concat(name, "-x-step-").concat(step), (_b = value.x) !== null && _b !== void 0 ? _b : 0);
            variables.set("--".concat(name, "-y-step-").concat(step), (_c = value.y) !== null && _c !== void 0 ? _c : 0);
        }
        return Object.fromEntries(variables);
    }
    return {
        name: name,
        keyframes: Object.fromEntries(keyframes),
        getVariables: getVariables,
    };
}
exports.heroTextAnimation = generateAnimation({
    name: 'hero-text-reveal',
    steps: 4,
    initial: {
        opacity: 0,
        y: '25px',
    },
    visible: {
        opacity: 1,
        y: '0px',
    },
});
