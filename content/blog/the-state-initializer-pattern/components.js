"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleCounter = SimpleCounter;
exports.InitialCounterAlmostThere = InitialCounterAlmostThere;
exports.BugReproduced = BugReproduced;
exports.FinishedCounter = FinishedCounter;
exports.KeyPropReset = KeyPropReset;
var React = require("react");
function SimpleCounter() {
    var _a = React.useState(0), count = _a[0], setCount = _a[1];
    var increment = function () { return setCount(function (c) { return c + 1; }); };
    var reset = function () { return setCount(0); };
    return <CountUI count={count} increment={increment} reset={reset}/>;
}
function InitialCounterAlmostThere(_a) {
    var _b = _a.initialCount, initialCount = _b === void 0 ? 0 : _b;
    var _c = React.useState(initialCount), count = _c[0], setCount = _c[1];
    var increment = function () { return setCount(function (c) { return c + 1; }); };
    var reset = function () { return setCount(initialCount); };
    return <CountUI count={count} increment={increment} reset={reset}/>;
}
function BugReproduced() {
    var _a = React.useState(3), initialCount = _a[0], setInitialCount = _a[1];
    React.useEffect(function () {
        var interval = setInterval(function () {
            setInitialCount(Math.floor(Math.random() * 50));
        }, 500);
        return function () {
            clearInterval(interval);
        };
    }, []);
    return <InitialCounterAlmostThere initialCount={initialCount}/>;
}
function FinishedCounter(_a) {
    var _b = _a.initialCount, initialCount = _b === void 0 ? 0 : _b;
    var initialState = React.useRef({ count: initialCount }).current;
    var _c = React.useState(initialState.count), count = _c[0], setCount = _c[1];
    var increment = function () { return setCount(function (c) { return c + 1; }); };
    var reset = function () { return setCount(initialState.count); };
    return <CountUI count={count} increment={increment} reset={reset}/>;
}
function KeyPropReset() {
    var _a = React.useState(0), key = _a[0], setKey = _a[1];
    var resetCounter = function () { return setKey(function (k) { return k + 1; }); };
    return <KeyPropResetCounter key={key} reset={resetCounter}/>;
}
function KeyPropResetCounter(_a) {
    var reset = _a.reset;
    var _b = React.useState(0), count = _b[0], setCount = _b[1];
    var increment = function () { return setCount(function (c) { return c + 1; }); };
    return <CountUI count={count} increment={increment} reset={reset}/>;
}
function CountUI(_a) {
    var count = _a.count, increment = _a.increment, reset = _a.reset;
    return (<div style={{
            display: 'flex',
            gap: '1rem',
            flexDirection: 'column',
            maxWidth: '5rem',
        }}>
			<button style={{ flex: 1 }} onClick={increment}>
				{count}
			</button>
			<button style={{ flex: 1 }} onClick={reset}>
				Reset
			</button>
		</div>);
}
