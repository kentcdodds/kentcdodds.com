"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.loader = loader;
exports.default = RecordDetailScreenContainer;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var date_fns_1 = require("date-fns");
var React = require("react");
var button_tsx_1 = require("#app/components/button.tsx");
var recorder_tsx_1 = require("#app/components/calls/recorder.tsx");
var submit_recording_form_tsx_1 = require("#app/components/calls/submit-recording-form.tsx");
var form_elements_tsx_1 = require("#app/components/form-elements.tsx");
var spacer_tsx_1 = require("#app/components/spacer.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var call_kent_ts_1 = require("#app/utils/call-kent.ts");
var ffmpeg_server_ts_1 = require("#app/utils/ffmpeg.server.ts");
var markdown_server_ts_1 = require("#app/utils/markdown.server.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var prisma_server_ts_1 = require("#app/utils/prisma.server.ts");
var send_email_server_ts_1 = require("#app/utils/send-email.server.ts");
var session_server_ts_1 = require("#app/utils/session.server.ts");
var transistor_server_ts_1 = require("#app/utils/transistor.server.ts");
var use_root_data_ts_1 = require("#app/utils/use-root-data.ts");
exports.handle = {
    getSitemapEntries: function () { return null; },
};
function action(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var call, searchParams, actionData, requestText, form, formData, _c, response, title, description, keywords, episodeAudio, _d, episodeUrl, imageUrl, _e, error_1;
        var _f;
        var request = _b.request, params = _b.params;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0: return [4 /*yield*/, (0, session_server_ts_1.requireAdminUser)(request)];
                case 1:
                    _g.sent();
                    if (!(request.method === 'DELETE')) return [3 /*break*/, 3];
                    return [4 /*yield*/, prisma_server_ts_1.prisma.call.delete({ where: { id: params.callId } })];
                case 2:
                    _g.sent();
                    return [2 /*return*/, (0, node_1.redirect)('/calls/admin')];
                case 3: return [4 /*yield*/, prisma_server_ts_1.prisma.call.findFirst({
                        where: { id: params.callId },
                        include: { user: true },
                    })];
                case 4:
                    call = _g.sent();
                    if (!call) {
                        searchParams = new URLSearchParams();
                        searchParams.set('message', 'Call not found');
                        return [2 /*return*/, (0, node_1.redirect)("/calls/admin?".concat(searchParams.toString()))];
                    }
                    actionData = { fields: {}, errors: {} };
                    _g.label = 5;
                case 5:
                    _g.trys.push([5, 11, , 12]);
                    return [4 /*yield*/, request.text()];
                case 6:
                    requestText = _g.sent();
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
                        return [2 /*return*/, (0, node_1.json)(actionData, 400)];
                    }
                    _c = (0, misc_tsx_1.getNonNull)(formData), response = _c.audio, title = _c.title, description = _c.description, keywords = _c.keywords;
                    return [4 /*yield*/, (0, ffmpeg_server_ts_1.createEpisodeAudio)(call.base64, response)];
                case 7:
                    episodeAudio = _g.sent();
                    _e = transistor_server_ts_1.createEpisode;
                    _f = {
                        request: request,
                        audio: episodeAudio,
                        title: title,
                        summary: "".concat(call.user.firstName, " asked this on ").concat((0, date_fns_1.format)(call.createdAt, 'yyyy-MM-dd'))
                    };
                    return [4 /*yield*/, (0, markdown_server_ts_1.markdownToHtml)(description)];
                case 8: return [4 /*yield*/, _e.apply(void 0, [(_f.description = _g.sent(),
                            _f.user = call.user,
                            _f.keywords = keywords,
                            _f)])];
                case 9:
                    _d = _g.sent(), episodeUrl = _d.episodeUrl, imageUrl = _d.imageUrl;
                    if (episodeUrl) {
                        try {
                            void (0, send_email_server_ts_1.sendEmail)({
                                to: call.user.email,
                                from: "\"Kent C. Dodds\" <hello+calls@kentcdodds.com>",
                                subject: "Your \"Call Kent\" episode has been published",
                                text: "\nHi ".concat(call.user.firstName, ",\n\nThanks for your call. Kent just replied and the episode has been published to the podcast!\n\n[![").concat(title, "](").concat(imageUrl, ")](").concat(episodeUrl, ")\n          ").trim(),
                            });
                        }
                        catch (error) {
                            console.error("Problem sending email about a call: ".concat(episodeUrl), error);
                        }
                    }
                    return [4 /*yield*/, prisma_server_ts_1.prisma.call.delete({
                            where: { id: call.id },
                        })];
                case 10:
                    _g.sent();
                    return [2 /*return*/, (0, node_1.redirect)('/calls')];
                case 11:
                    error_1 = _g.sent();
                    actionData.errors.generalError = (0, misc_tsx_1.getErrorMessage)(error_1);
                    return [2 /*return*/, (0, node_1.json)(actionData, 500)];
                case 12: return [2 /*return*/];
            }
        });
    });
}
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var call, searchParams;
        var request = _b.request, params = _b.params;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!params.callId) {
                        throw new Error('params.callId is not defined');
                    }
                    return [4 /*yield*/, (0, session_server_ts_1.requireAdminUser)(request)];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, prisma_server_ts_1.prisma.call.findFirst({
                            where: { id: params.callId },
                            select: {
                                createdAt: true,
                                base64: true,
                                description: true,
                                keywords: true,
                                title: true,
                                id: true,
                                user: {
                                    select: { firstName: true, email: true, team: true, discordId: true },
                                },
                            },
                        })];
                case 2:
                    call = _c.sent();
                    if (!call) {
                        console.error("No call found at ".concat(params.callId));
                        searchParams = new URLSearchParams();
                        searchParams.set('message', 'Call not found');
                        return [2 /*return*/, (0, node_1.redirect)("/calls/admin?".concat(searchParams.toString()))];
                    }
                    return [2 /*return*/, (0, node_1.json)({
                            call: __assign(__assign({}, call), { formattedCreatedAt: (0, misc_tsx_1.formatDate)(call.createdAt) }),
                        })];
            }
        });
    });
}
function CallListing(_a) {
    var call = _a.call;
    var _b = React.useState(null), audioURL = _b[0], setAudioURL = _b[1];
    var _c = React.useState(null), audioEl = _c[0], setAudioEl = _c[1];
    var _d = React.useState(2), playbackRate = _d[0], setPlaybackRate = _d[1];
    var dc = (0, misc_tsx_1.useDoubleCheck)();
    React.useEffect(function () {
        var audio = new Audio(call.base64);
        setAudioURL(audio.src);
    }, [call.base64]);
    React.useEffect(function () {
        if (!audioEl)
            return;
        audioEl.playbackRate = playbackRate;
    }, [audioEl, playbackRate]);
    return (<section className={"set-color-team-current-".concat(call.user.team.toLowerCase())}>
			<strong className="text-team-current">{call.user.firstName}</strong> (
			<a href={"mailto:".concat(call.user.email)}>{call.user.email}</a>) asked on{' '}
			{call.formattedCreatedAt}
			<br />
			<strong>{call.title}</strong>
			<typography_tsx_1.Paragraph>{call.description}</typography_tsx_1.Paragraph>
			{audioURL ? (<div className="my-6 flex flex-wrap items-center gap-6">
					<audio className="flex-1" style={{ minWidth: '300px' }} ref={function (el) { return setAudioEl(el); }} src={audioURL} controls preload="metadata"/>
					<form_elements_tsx_1.Field value={playbackRate} onChange={function (e) { return setPlaybackRate(Number(e.target.value)); }} label="Playback rate" name="playbackRate" type="number" max="3" min="0.5" step="0.1"/>
				</div>) : null}
			<react_1.Form method="delete">
				<input type="hidden" name="callId" value={call.id}/>
				<button_tsx_1.Button type="submit" variant="danger" {...dc.getButtonProps()}>
					{dc.doubleCheck ? 'You sure?' : 'Delete'}
				</button_tsx_1.Button>
			</react_1.Form>
		</section>);
}
function RecordingDetailScreen() {
    var _a = React.useState(null), responseAudio = _a[0], setResponseAudio = _a[1];
    var data = (0, react_1.useLoaderData)();
    var actionData = (0, react_1.useActionData)();
    var user = (0, use_root_data_ts_1.useUser)();
    return (<div key={data.call.id}>
			<CallListing call={data.call}/>
			<spacer_tsx_1.Spacer size="xs"/>
			<strong>Record your response:</strong>
			<spacer_tsx_1.Spacer size="2xs"/>
			{responseAudio ? (<submit_recording_form_tsx_1.RecordingForm audio={responseAudio} data={{
                fields: __assign(__assign({}, data.call), actionData === null || actionData === void 0 ? void 0 : actionData.fields),
                errors: __assign({}, actionData === null || actionData === void 0 ? void 0 : actionData.errors),
            }}/>) : (<recorder_tsx_1.CallRecorder onRecordingComplete={function (recording) { return setResponseAudio(recording); }} team={user.team}/>)}
		</div>);
}
function RecordDetailScreenContainer() {
    var data = (0, react_1.useLoaderData)();
    return <RecordingDetailScreen key={data.call.id}/>;
}
