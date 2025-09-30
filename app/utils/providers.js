"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCallsEpisodeUIState = exports.CallsEpisodeUIStateProvider = exports.useChatsEpisodeUIState = exports.ChatsEpisodeUIStateProvider = void 0;
exports.createSimpleContext = createSimpleContext;
exports.useMatchLoaderData = useMatchLoaderData;
exports.useOptionalMatchLoaderData = useOptionalMatchLoaderData;
var react_1 = require("@remix-run/react");
var React = require("react");
// This utility is handy, but in Remix apps these days you really shouldn't need
// context all that much. Instead you can useOutletContext: https://reactrouter.com/en/main/hooks/use-outlet-context
function createSimpleContext(name) {
    var defaultValue = Symbol("Default ".concat(name, " context value"));
    var Context = React.createContext(defaultValue);
    Context.displayName = name;
    function useValue() {
        var value = React.useContext(Context);
        if (value === defaultValue) {
            throw new Error("use".concat(name, " must be used within ").concat(name, "Provider"));
        }
        if (!value) {
            throw new Error("No value in ".concat(name, "Provider context. If the value is optional in this situation, try useOptional").concat(name, " instead of use").concat(name));
        }
        return value;
    }
    function useOptionalValue() {
        var value = React.useContext(Context);
        if (value === defaultValue) {
            throw new Error("useOptional".concat(name, " must be used within ").concat(name, "Provider"));
        }
        return value;
    }
    return { Provider: Context.Provider, useValue: useValue, useOptionalValue: useOptionalValue };
}
var _a = createSimpleContext('ChatsEpisodeUIState'), ChatsEpisodeUIStateProvider = _a.Provider, useChatsEpisodeUIState = _a.useValue;
exports.ChatsEpisodeUIStateProvider = ChatsEpisodeUIStateProvider;
exports.useChatsEpisodeUIState = useChatsEpisodeUIState;
var _b = createSimpleContext('CallsEpisodeUIState'), CallsEpisodeUIStateProvider = _b.Provider, useCallsEpisodeUIState = _b.useValue;
exports.CallsEpisodeUIStateProvider = CallsEpisodeUIStateProvider;
exports.useCallsEpisodeUIState = useCallsEpisodeUIState;
function useMatchLoaderData(handleId) {
    var matches = (0, react_1.useMatches)();
    var match = matches.find(function (_a) {
        var handle = _a.handle;
        return (handle === null || handle === void 0 ? void 0 : handle.id) === handleId;
    });
    if (!match) {
        throw new Error("No active route has a handle ID of ".concat(handleId));
    }
    return match.data;
}
function useOptionalMatchLoaderData(handleId) {
    var _a;
    var matches = (0, react_1.useMatches)();
    return (_a = matches.find(function (_a) {
        var handle = _a.handle;
        return (handle === null || handle === void 0 ? void 0 : handle.id) === handleId;
    })) === null || _a === void 0 ? void 0 : _a.data;
}
