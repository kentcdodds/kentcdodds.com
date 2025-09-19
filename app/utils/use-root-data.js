"use strict";
// this is needed by things the root needs, so to avoid circular deps we have to
// put it in its own file which is silly I know...
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRootData = void 0;
exports.useUser = useUser;
exports.useOptionalUser = useOptionalUser;
var root_tsx_1 = require("../root.tsx");
var providers_tsx_1 = require("./providers.tsx");
var useRootData = function () {
    return (0, providers_tsx_1.useMatchLoaderData)(root_tsx_1.handle.id);
};
exports.useRootData = useRootData;
function useUser() {
    var user = (0, exports.useRootData)().user;
    if (!user)
        throw new Error('User is required when using useUser');
    return user;
}
function useOptionalUser() {
    var user = (0, exports.useRootData)().user;
    return user;
}
