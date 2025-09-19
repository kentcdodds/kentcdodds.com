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
exports.loader = loader;
exports.action = action;
exports.default = PasskeysRoute;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var browser_1 = require("@simplewebauthn/browser");
var zod_1 = require("zod");
var button_tsx_1 = require("#app/components/button.tsx");
var prisma_server_ts_1 = require("#app/utils/prisma.server.ts");
var session_server_ts_1 = require("#app/utils/session.server.ts");
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var user, passkeys;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, session_server_ts_1.requireUser)(request)];
                case 1:
                    user = _c.sent();
                    return [4 /*yield*/, prisma_server_ts_1.prisma.passkey.findMany({
                            where: { userId: user.id },
                            orderBy: { createdAt: 'desc' },
                            select: {
                                id: true,
                                createdAt: true,
                                deviceType: true,
                                transports: true,
                            },
                        })];
                case 2:
                    passkeys = _c.sent();
                    return [2 /*return*/, (0, node_1.json)({ passkeys: passkeys })];
            }
        });
    });
}
function action(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var user, formData, intent, passkeyId;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, session_server_ts_1.requireUser)(request)];
                case 1:
                    user = _c.sent();
                    return [4 /*yield*/, request.formData()];
                case 2:
                    formData = _c.sent();
                    intent = formData.get('intent');
                    passkeyId = formData.get('passkeyId');
                    if (!(intent === 'delete' && typeof passkeyId === 'string')) return [3 /*break*/, 4];
                    return [4 /*yield*/, prisma_server_ts_1.prisma.passkey.delete({
                            where: {
                                id: passkeyId,
                                userId: user.id, // Ensure the passkey belongs to the user
                            },
                        })];
                case 3:
                    _c.sent();
                    _c.label = 4;
                case 4: return [2 /*return*/, (0, node_1.json)({ success: true })];
            }
        });
    });
}
var RegistrationResultSchema = zod_1.z.object({
    options: zod_1.z.object({
        rp: zod_1.z.object({
            id: zod_1.z.string(),
            name: zod_1.z.string(),
        }),
        user: zod_1.z.object({
            id: zod_1.z.string(),
            name: zod_1.z.string(),
            displayName: zod_1.z.string(),
        }),
        challenge: zod_1.z.string(),
        pubKeyCredParams: zod_1.z.array(zod_1.z.object({
            type: zod_1.z.literal('public-key'),
            alg: zod_1.z.number(),
        })),
    }),
});
function PasskeysRoute() {
    var revalidator = (0, react_1.useRevalidator)();
    var passkeys = (0, react_1.useLoaderData)().passkeys;
    function handleAddPasskey() {
        return __awaiter(this, void 0, void 0, function () {
            var resp, jsonResult, parsedResult, regResult, verificationResp, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, fetch('/resources/webauthn/generate-registration-options')];
                    case 1:
                        resp = _a.sent();
                        return [4 /*yield*/, resp.json()];
                    case 2:
                        jsonResult = _a.sent();
                        parsedResult = RegistrationResultSchema.parse(jsonResult);
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 6, , 7]);
                        return [4 /*yield*/, (0, browser_1.startRegistration)({
                                optionsJSON: parsedResult.options,
                            })];
                    case 4:
                        regResult = _a.sent();
                        return [4 /*yield*/, fetch('/resources/webauthn/verify-registration', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify(regResult),
                            })];
                    case 5:
                        verificationResp = _a.sent();
                        if (!verificationResp.ok) {
                            throw new Error('Failed to verify registration');
                        }
                        revalidator.revalidate();
                        return [3 /*break*/, 7];
                    case 6:
                        err_1 = _a.sent();
                        console.error('Failed to create passkey:', err_1);
                        alert('Failed to create passkey. Please try again.');
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    }
    return (<div className="mx-auto max-w-2xl py-8">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold">Passkeys</h1>
				<form action={handleAddPasskey}>
					<button_tsx_1.Button>Add Passkey</button_tsx_1.Button>
				</form>
			</div>

			{passkeys.length === 0 ? (<div className="py-8 text-center text-gray-500">
					<p>You haven't set up any passkeys yet.</p>
					<p className="mt-2">
						Passkeys provide a secure, passwordless way to sign in to your
						account.
					</p>
				</div>) : (<div className="space-y-4">
					{passkeys.map(function (passkey) { return (<div key={passkey.id} className="flex items-center justify-between rounded-lg border p-4">
							<div>
								<div className="font-medium">
									{passkey.deviceType === 'singleDevice'
                    ? 'Single-device'
                    : 'Multi-device'}{' '}
									Passkey
								</div>
								<div className="text-sm text-gray-500">
									Added {new Date(passkey.createdAt).toLocaleDateString()}
								</div>
								{passkey.transports && (<div className="text-sm text-gray-500">
										Transports: {passkey.transports.split(',').join(', ')}
									</div>)}
							</div>
							<react_1.Form method="post">
								<input type="hidden" name="passkeyId" value={passkey.id}/>
								<button_tsx_1.Button type="submit" name="intent" value="delete" variant="danger" size="small">
									Remove
								</button_tsx_1.Button>
							</react_1.Form>
						</div>); })}
				</div>)}
		</div>);
}
