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
exports.handle = void 0;
exports.loader = loader;
exports.default = DiscordCallback;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var react_2 = require("react");
var arrow_button_tsx_1 = require("#app/components/arrow-button.tsx");
var form_elements_tsx_1 = require("#app/components/form-elements.tsx");
var icons_tsx_1 = require("#app/components/icons.tsx");
var external_links_tsx_1 = require("#app/external-links.tsx");
var kit_server_ts_1 = require("#app/kit/kit.server.ts");
var litefs_js_server_ts_1 = require("#app/utils/litefs-js.server.ts");
var discord_server_ts_1 = require("#app/utils/discord.server.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var session_server_ts_1 = require("#app/utils/session.server.ts");
var use_root_data_ts_1 = require("#app/utils/use-root-data.ts");
var user_info_server_ts_1 = require("#app/utils/user-info.server.ts");
exports.handle = {
    getSitemapEntries: function () { return null; },
};
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var user, domainUrl, code, url, discordMemberPromise;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, litefs_js_server_ts_1.ensurePrimary)()];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, (0, session_server_ts_1.requireUser)(request)];
                case 2:
                    user = _c.sent();
                    domainUrl = (0, misc_tsx_1.getDomainUrl)(request);
                    code = new URL(request.url).searchParams.get('code');
                    url = new URL(domainUrl);
                    url.pathname = '/me';
                    try {
                        if (!code) {
                            throw (0, node_1.redirect)('/discord', { headers: { 'x-reason': 'no-code' } });
                        }
                        discordMemberPromise = (0, discord_server_ts_1.connectDiscord)({ user: user, code: code, domainUrl: domainUrl }).then(function (discordMember) {
                            void (0, kit_server_ts_1.tagKCDSiteSubscriber)({
                                email: user.email,
                                firstName: user.firstName,
                                fields: {
                                    kcd_site_id: user.id,
                                    kcd_team: user.team,
                                    discord_user_id: discordMember.user.id,
                                },
                            });
                            void (0, user_info_server_ts_1.deleteDiscordCache)(discordMember.user.id);
                            return discordMember;
                        });
                        return [2 /*return*/, (0, node_1.defer)({ discordMember: discordMemberPromise })];
                    }
                    catch (error) {
                        if ((0, misc_tsx_1.isResponse)(error))
                            throw error;
                        console.error(error);
                        return [2 /*return*/, (0, node_1.defer)({ discordMember: Promise.reject(error) })];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function DiscordCallback() {
    var data = (0, react_1.useLoaderData)();
    react_2.default.useEffect(function () {
        var newSearchParams = new URLSearchParams(window.location.search);
        newSearchParams.delete('code');
        window.history.replaceState(null, '', [window.location.pathname, newSearchParams.toString()]
            .filter(Boolean)
            .join('?'));
    });
    return (<react_2.Suspense fallback={<div className="flex flex-wrap gap-2">
					<span className="animate-reverse-spin">
						<icons_tsx_1.RefreshIcon />
					</span>
					<p className="animate-pulse">Connecting your account to discord...</p>
				</div>}>
			<react_1.Await resolve={data.discordMember} errorElement={<DiscordConnectionError />}>
				{function (discordMember) { return (<div className="flex flex-wrap gap-1">
						<span className="text-team-current">
							<icons_tsx_1.PartyIcon />
						</span>
						<span className="text-team-current">
							{discordMember.user.username}
						</span>
						{" has been connected to "}
						<span>
							<react_1.Link to="/me" className="text-team-current underline">
								your account
							</react_1.Link>
							!
						</span>
						<div className="my-6">
							<arrow_button_tsx_1.ArrowLink href="https://kcd.im/discord">
								Start chatting...
							</arrow_button_tsx_1.ArrowLink>
						</div>
					</div>); }}
			</react_1.Await>
		</react_2.Suspense>);
}
function DiscordConnectionError() {
    var error = (0, react_1.useAsyncError)();
    var _a = (0, use_root_data_ts_1.useRootData)(), requestInfo = _a.requestInfo, user = _a.user;
    var authorizeURL = user
        ? (0, misc_tsx_1.getDiscordAuthorizeURL)(requestInfo.origin)
        : external_links_tsx_1.externalLinks.discord;
    return (<form_elements_tsx_1.ErrorPanel>
			<div>Whoops! Sorry, there was an error 😬</div>
			<hr className="my-2"/>
			<pre className="whitespace-pre-wrap">{(0, misc_tsx_1.getErrorMessage)(error)}</pre>
			<hr className="my-2"/>
			<a href={authorizeURL} className="underline">
				Try again?
			</a>
		</form_elements_tsx_1.ErrorPanel>);
}
