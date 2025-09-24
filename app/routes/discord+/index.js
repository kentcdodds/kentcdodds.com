"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DiscordIndex;
var button_tsx_1 = require("#app/components/button.tsx");
var external_links_tsx_1 = require("#app/external-links.tsx");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var use_root_data_ts_1 = require("#app/utils/use-root-data.ts");
function DiscordIndex() {
    var _a = (0, use_root_data_ts_1.useRootData)(), requestInfo = _a.requestInfo, user = _a.user;
    var authorizeURL = user
        ? (0, misc_tsx_1.getDiscordAuthorizeURL)(requestInfo.origin)
        : external_links_tsx_1.externalLinks.discord;
    return (<button_tsx_1.ButtonLink variant="primary" href={authorizeURL} className="mr-auto">
			Join Discord
		</button_tsx_1.ButtonLink>);
}
