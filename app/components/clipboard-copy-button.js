"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClipboardCopyButton = ClipboardCopyButton;
var clsx_1 = require("clsx");
var React = require("react");
var icons_tsx_1 = require("./icons.tsx");
function copyToClipboard(value) {
    return __awaiter(this, void 0, void 0, function () {
        var element, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    if (!('clipboard' in navigator)) return [3 /*break*/, 2];
                    return [4 /*yield*/, navigator.clipboard.writeText(value)];
                case 1:
                    _b.sent();
                    return [2 /*return*/, true];
                case 2:
                    element = document.createElement('textarea');
                    element.value = value;
                    document.body.appendChild(element);
                    element.select();
                    document.execCommand('copy');
                    element.remove();
                    return [2 /*return*/, true];
                case 3:
                    _a = _b.sent();
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    });
}
var State;
(function (State) {
    State["Idle"] = "idle";
    State["Copy"] = "copy";
    State["Copied"] = "copied";
})(State || (State = {}));
function ClipboardCopyButton(_a) {
    var value = _a.value, className = _a.className;
    var _b = React.useState(State.Idle), state = _b[0], setState = _b[1];
    React.useEffect(function () {
        function transition() {
            return __awaiter(this, void 0, void 0, function () {
                var _a, res;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = state;
                            switch (_a) {
                                case State.Copy: return [3 /*break*/, 1];
                                case State.Copied: return [3 /*break*/, 3];
                            }
                            return [3 /*break*/, 4];
                        case 1: return [4 /*yield*/, copyToClipboard(value)];
                        case 2:
                            res = _b.sent();
                            console.info('copied', res);
                            setState(State.Copied);
                            return [3 /*break*/, 5];
                        case 3:
                            {
                                setTimeout(function () {
                                    setState(State.Idle);
                                }, 2000);
                                return [3 /*break*/, 5];
                            }
                            _b.label = 4;
                        case 4: return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        }
        void transition();
    }, [state, value]);
    return (<button onClick={function () { return setState(State.Copy); }} className={(0, clsx_1.clsx)('whitespace-nowrap rounded-lg bg-white p-3 text-lg font-medium text-black shadow ring-team-current transition hover:opacity-100 hover:shadow-md hover:ring-4 focus:opacity-100 focus:outline-none focus:ring-4 group-hover:opacity-100 peer-hover:opacity-100 peer-focus:opacity-100 lg:px-8 lg:py-4 lg:opacity-0', className)}>
			<span className="sr-only lg:not-sr-only lg:inline">
				{state === State.Copied ? 'Copied to clipboard' : 'Click to copy url'}
			</span>
			<span className="inline lg:sr-only">
				{state === State.Copied ? <icons_tsx_1.CheckIcon /> : <icons_tsx_1.CopyIcon />}
			</span>
		</button>);
}
