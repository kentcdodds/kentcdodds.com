"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamEmoji = exports.useTeam = void 0;
exports.TeamProvider = TeamProvider;
var React = require("react");
var misc_tsx_1 = require("./misc.tsx");
var providers_tsx_1 = require("./providers.tsx");
var use_root_data_ts_1 = require("./use-root-data.ts");
var _a = (0, providers_tsx_1.createSimpleContext)('Team'), TeamProviderBase = _a.Provider, useTeam = _a.useValue;
exports.useTeam = useTeam;
function TeamProvider(_a) {
    var children = _a.children;
    var user = (0, use_root_data_ts_1.useRootData)().user;
    var _b = React.useState('UNKNOWN'), team = _b[0], setTeam = _b[1];
    // if the user logs out, we want to reset the team to unknown
    React.useEffect(function () {
        if (!user)
            setTeam('UNKNOWN');
    }, [user]);
    // NOTE: calling set team will do nothing useful if we're given an actual team
    return (<TeamProviderBase value={[user && (0, misc_tsx_1.isTeam)(user.team) ? user.team : team, setTeam]}>
			{children}
		</TeamProviderBase>);
}
exports.teamEmoji = {
    RED: '🔴',
    BLUE: '🔵',
    YELLOW: '🟡',
    UNKNOWN: '⚪',
};
