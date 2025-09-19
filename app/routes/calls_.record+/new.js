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
exports.action = action;
exports.default = RecordScreen;
exports.ErrorBoundary = ErrorBoundary;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var React = require("react");
var recorder_tsx_1 = require("#app/components/calls/recorder.tsx");
var submit_recording_form_tsx_1 = require("#app/components/calls/submit-recording-form.tsx");
var grid_tsx_1 = require("#app/components/grid.tsx");
var kifs_tsx_1 = require("#app/components/kifs.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var call_kent_ts_1 = require("#app/utils/call-kent.ts");
var discord_server_ts_1 = require("#app/utils/discord.server.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var prisma_server_ts_1 = require("#app/utils/prisma.server.ts");
var session_server_ts_1 = require("#app/utils/session.server.ts");
var team_provider_tsx_1 = require("#app/utils/team-provider.tsx");
var use_root_data_ts_1 = require("#app/utils/use-root-data.ts");
exports.handle = {
    getSitemapEntries: function () { return null; },
};
function action(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var user, actionData, domainUrl, requestText, form, formData, _c, audio, title, description, keywords, call, createdCall, channelId, adminUserId, firstName, team, discordId, userMention, emoji, message, error_1;
        var request = _b.request;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, (0, session_server_ts_1.requireUser)(request)];
                case 1:
                    user = _d.sent();
                    actionData = { fields: {}, errors: {} };
                    domainUrl = (0, misc_tsx_1.getDomainUrl)(request);
                    _d.label = 2;
                case 2:
                    _d.trys.push([2, 5, , 6]);
                    return [4 /*yield*/, request.text()];
                case 3:
                    requestText = _d.sent();
                    form = new URLSearchParams(requestText);
                    formData = {
                        audio: form.get('audio'),
                        title: form.get('title'),
                        description: form.get('description'),
                        keywords: form.get('keywords'),
                    };
                    actionData.fields = {
                        title: formData.title,
                        description: formData.description,
                        keywords: formData.keywords,
                    };
                    actionData.errors = {
                        audio: (0, call_kent_ts_1.getErrorForAudio)(formData.audio),
                        title: (0, call_kent_ts_1.getErrorForTitle)(formData.title),
                        description: (0, call_kent_ts_1.getErrorForDescription)(formData.description),
                        keywords: (0, call_kent_ts_1.getErrorForKeywords)(formData.keywords),
                    };
                    if (Object.values(actionData.errors).some(function (err) { return err !== null; })) {
                        return [2 /*return*/, (0, node_1.json)(actionData, 401)];
                    }
                    _c = (0, misc_tsx_1.getNonNull)(formData), audio = _c.audio, title = _c.title, description = _c.description, keywords = _c.keywords;
                    call = {
                        title: title,
                        description: description,
                        keywords: keywords,
                        userId: user.id,
                        base64: audio,
                    };
                    return [4 /*yield*/, prisma_server_ts_1.prisma.call.create({ data: call })];
                case 4:
                    createdCall = _d.sent();
                    try {
                        channelId = (0, misc_tsx_1.getRequiredServerEnvVar)('DISCORD_PRIVATE_BOT_CHANNEL');
                        adminUserId = (0, misc_tsx_1.getRequiredServerEnvVar)('DISCORD_ADMIN_USER_ID');
                        firstName = user.firstName, team = user.team, discordId = user.discordId;
                        userMention = discordId ? "<@!".concat(discordId, ">") : firstName;
                        emoji = team_provider_tsx_1.teamEmoji[(0, misc_tsx_1.getOptionalTeam)(team)];
                        message = "\uD83D\uDCF3 <@!".concat(adminUserId, "> ring ring! New call from ").concat(userMention, " ").concat(emoji, ": \"").concat(title, "\"\n\n").concat(description, "\n\n").concat(domainUrl, "/calls/admin/").concat(createdCall.id);
                        void (0, discord_server_ts_1.sendMessageFromDiscordBot)(channelId, message);
                    }
                    catch (error) {
                        console.error('Problem sending a call message', error);
                        // ignore
                    }
                    return [2 /*return*/, (0, node_1.redirect)("/calls/record/".concat(createdCall.id))];
                case 5:
                    error_1 = _d.sent();
                    actionData.errors.generalError = (0, misc_tsx_1.getErrorMessage)(error_1);
                    return [2 /*return*/, (0, node_1.json)(actionData, 500)];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function RecordScreen() {
    var actionData = (0, react_1.useActionData)();
    var _a = React.useState(null), audio = _a[0], setAudio = _a[1];
    var _b = (0, use_root_data_ts_1.useRootData)(), user = _b.user, userInfo = _b.userInfo;
    // should be impossible...
    if (!user || !userInfo)
        throw new Error('user and userInfo required');
    return (<div>
			{audio ? (<submit_recording_form_tsx_1.RecordingForm audio={audio} data={actionData}/>) : (<div>
					<typography_tsx_1.Paragraph className="mb-4">
						{"\n              Choose which recording device you would like to use.\n              Then click \"Start Recording,\" introduce yourself\n              (\"Hi, Kent, my name is ".concat(user.firstName, "\") and say whatever you'd like.\n              Try to keep it 2 minutes or less. Thanks!\n            ")}
					</typography_tsx_1.Paragraph>
					{userInfo.avatar.hasGravatar ? null : (<typography_tsx_1.Paragraph className="mb-4">
							{"\n                Oh, and I noticed that your avatar is generic. If you want your\n                episode art to be a photo of you, then you'll want to set your\n                avatar to a photo of you\n              "}
							<a href="https://gravatar.com" target="_blank" rel="noreferrer noopener">
								on Gravatar
							</a>
							{'.'}
						</typography_tsx_1.Paragraph>)}
					<recorder_tsx_1.CallRecorder onRecordingComplete={function (recording) { return setAudio(recording); }} team={user.team}/>
				</div>)}
		</div>);
}
function ErrorBoundary() {
    var error = (0, misc_tsx_1.useCapturedRouteError)();
    console.error(error);
    return (<div>
			<grid_tsx_1.Grid nested>
				<div className="col-span-6">
					<typography_tsx_1.H4 as="p">{"Yikes... Something went wrong. Sorry about that."}</typography_tsx_1.H4>
					<typography_tsx_1.H4 as="p" variant="secondary" className="mt-3">
						{"Want to "}
						<react_1.Link to=".">try again?</react_1.Link>
					</typography_tsx_1.H4>
				</div>
				<kifs_tsx_1.Grimmacing className="col-span-5 col-start-7 rounded-lg" aspectRatio="3:4"/>
			</grid_tsx_1.Grid>
		</div>);
}
