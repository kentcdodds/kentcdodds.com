"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useInterval = useInterval;
var react_1 = require("react");
function useInterval(callback, delay) {
    var savedCallback = (0, react_1.useRef)(null);
    // Remember the latest callback.
    (0, react_1.useEffect)(function () {
        savedCallback.current = callback;
    }, [callback]);
    // Set up the interval.
    (0, react_1.useEffect)(function () {
        if (delay > 0) {
            var id_1 = setInterval(tick, delay);
            return function () { return clearInterval(id_1); };
        }
    }, [delay]);
    function tick() {
        if (savedCallback.current) {
            savedCallback.current();
        }
    }
}
