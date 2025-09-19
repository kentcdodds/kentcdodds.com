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
exports.handleKitFormSubmission = handleKitFormSubmission;
var node_1 = require("@remix-run/node");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var user_info_server_ts_1 = require("#app/utils/user-info.server.ts");
var ck = require("./kit.server.ts");
function getErrorForFirstName(name) {
    if (!name)
        return "Name is required";
    if (name.length > 60)
        return "Name is too long";
    return null;
}
function getErrorForEmail(email) {
    if (!email)
        return "Email is required";
    if (!/^.+@.+\..+$/.test(email))
        return "That's not an email";
    return null;
}
function getErrorForkitTagId(tagId, form) {
    if (!form.get('kitFormId') && !tagId) {
        return "kitTagId is required if kitFormId is not specified";
    }
    if (!tagId)
        return null;
    if (tagId.length < 2)
        return "Convert Kit Tag ID is incorrect";
    return null;
}
function getErrorForkitFormId(formId, form) {
    if (!form.get('kitTagId') && !formId) {
        return "kitFormId is required if kitTagId is not specified";
    }
    if (!formId)
        return null;
    if (formId.length < 2)
        return "Convert Kit Form ID is incorrect";
    return null;
}
function getErrorForFormId(value) {
    if (!value)
        return "Form ID is required";
    return null;
}
function handleKitFormSubmission(request) {
    return __awaiter(this, void 0, void 0, function () {
        var requestText, form, fields, errors, failedHoneypot, data, subscriberId, subscriber, subscriber, error_1;
        var _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0: return [4 /*yield*/, request.text()];
                case 1:
                    requestText = _f.sent();
                    form = new URLSearchParams(requestText);
                    fields = {
                        formId: (_a = form.get('formId')) !== null && _a !== void 0 ? _a : '',
                        firstName: (_b = form.get('firstName')) !== null && _b !== void 0 ? _b : '',
                        email: (_c = form.get('email')) !== null && _c !== void 0 ? _c : '',
                        kitTagId: (_d = form.get('kitTagId')) !== null && _d !== void 0 ? _d : '',
                        kitFormId: (_e = form.get('kitFormId')) !== null && _e !== void 0 ? _e : '',
                        url: form.get('url'),
                    };
                    errors = {
                        generalError: null,
                        formId: getErrorForFormId(fields.formId),
                        firstName: getErrorForFirstName(fields.firstName),
                        email: getErrorForEmail(fields.email),
                        kitTagId: getErrorForkitTagId(fields.kitTagId, form),
                        kitFormId: getErrorForkitFormId(fields.kitFormId, form),
                        url: null,
                    };
                    failedHoneypot = Boolean(fields.url);
                    if (failedHoneypot) {
                        console.info("FAILED HONEYPOT", fields);
                        return [2 /*return*/, (0, node_1.json)({ status: 'success' })];
                    }
                    if (Object.values(errors).some(function (err) { return err !== null; })) {
                        data = { status: 'error', errors: errors };
                        return [2 /*return*/, (0, node_1.json)(data, 400)];
                    }
                    _f.label = 2;
                case 2:
                    _f.trys.push([2, 9, , 10]);
                    subscriberId = null;
                    if (!fields.kitFormId) return [3 /*break*/, 4];
                    return [4 /*yield*/, ck.addSubscriberToForm(fields)];
                case 3:
                    subscriber = _f.sent();
                    subscriberId = subscriber.id;
                    _f.label = 4;
                case 4:
                    if (!fields.kitTagId) return [3 /*break*/, 6];
                    return [4 /*yield*/, ck.addTagToSubscriber(fields)];
                case 5:
                    subscriber = _f.sent();
                    subscriberId = subscriber.id;
                    _f.label = 6;
                case 6:
                    if (!subscriberId) return [3 /*break*/, 8];
                    // if this errors out it's not a big deal. The cache will expire eventually
                    return [4 /*yield*/, (0, user_info_server_ts_1.deleteKitCache)(subscriberId).catch(function () { })];
                case 7:
                    // if this errors out it's not a big deal. The cache will expire eventually
                    _f.sent();
                    _f.label = 8;
                case 8: return [3 /*break*/, 10];
                case 9:
                    error_1 = _f.sent();
                    errors.generalError = (0, misc_tsx_1.getErrorMessage)(error_1);
                    data = { status: 'error', errors: errors };
                    return [2 /*return*/, (0, node_1.json)(data, 500)];
                case 10:
                    data = { status: 'success' };
                    return [2 /*return*/, (0, node_1.json)(data)];
            }
        });
    });
}
