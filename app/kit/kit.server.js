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
exports.getKitSubscriber = getKitSubscriber;
exports.getKitSubscriberTags = getKitSubscriberTags;
exports.tagKCDSiteSubscriber = tagKCDSiteSubscriber;
exports.addTagToSubscriber = addTagToSubscriber;
exports.addSubscriberToForm = addSubscriberToForm;
var misc_tsx_1 = require("../utils/misc.tsx");
var KIT_API_SECRET = (0, misc_tsx_1.getRequiredServerEnvVar)('KIT_API_SECRET');
var KIT_API_KEY = (0, misc_tsx_1.getRequiredServerEnvVar)('KIT_API_KEY');
function getKitSubscriber(email) {
    return __awaiter(this, void 0, void 0, function () {
        var url, resp, json, _a, _b, _c, subscriber;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    url = new URL('https://api.kit.com/v3/subscribers');
                    url.searchParams.set('api_secret', KIT_API_SECRET);
                    url.searchParams.set('email_address', email);
                    return [4 /*yield*/, fetch(url.toString())];
                case 1:
                    resp = _d.sent();
                    return [4 /*yield*/, resp.json()];
                case 2:
                    json = _d.sent();
                    _a = json.subscribers, _b = _a === void 0 ? [] : _a, _c = _b[0], subscriber = _c === void 0 ? { state: 'inactive' } : _c;
                    return [2 /*return*/, subscriber.state === 'active' ? subscriber : null];
            }
        });
    });
}
function getKitSubscriberTags(subscriberId) {
    return __awaiter(this, void 0, void 0, function () {
        var url, resp, json;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = new URL("https://api.kit.com/v3/subscribers/".concat(subscriberId, "/tags"));
                    url.searchParams.set('api_secret', KIT_API_SECRET);
                    return [4 /*yield*/, fetch(url.toString())];
                case 1:
                    resp = _a.sent();
                    return [4 /*yield*/, resp.json()];
                case 2:
                    json = (_a.sent());
                    return [2 /*return*/, json.tags];
            }
        });
    });
}
function ensureSubscriber(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var subscriber;
        var email = _b.email, firstName = _b.firstName;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, getKitSubscriber(email)];
                case 1:
                    subscriber = _c.sent();
                    if (!!subscriber) return [3 /*break*/, 3];
                    return [4 /*yield*/, addSubscriberToForm({
                            email: email,
                            firstName: firstName,
                            kitFormId: '2500372',
                        })];
                case 2:
                    // this is a basic form that doesn't really do anything. It's just a way to
                    // get the users on the mailing list
                    subscriber = _c.sent();
                    _c.label = 3;
                case 3: return [2 /*return*/, subscriber];
            }
        });
    });
}
function addSubscriberToForm(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var subscriberData, response, json;
        var email = _b.email, firstName = _b.firstName, kitFormId = _b.kitFormId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    subscriberData = {
                        api_key: KIT_API_KEY,
                        api_secret: KIT_API_SECRET,
                        first_name: firstName,
                        email: email,
                    };
                    return [4 /*yield*/, fetch("https://api.kit.com/v3/forms/".concat(kitFormId, "/subscribe"), {
                            method: 'POST',
                            body: JSON.stringify(subscriberData),
                            headers: { 'Content-Type': 'application/json' },
                        })];
                case 1:
                    response = _c.sent();
                    return [4 /*yield*/, response.json()];
                case 2:
                    json = (_c.sent());
                    return [2 /*return*/, json.subscription.subscriber];
            }
        });
    });
}
function addTagToSubscriber(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var subscriberData, subscribeUrl, response, json;
        var email = _b.email, firstName = _b.firstName, kitTagId = _b.kitTagId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, ensureSubscriber({ email: email, firstName: firstName })];
                case 1:
                    _c.sent();
                    subscriberData = {
                        api_key: KIT_API_KEY,
                        api_secret: KIT_API_SECRET,
                        first_name: firstName,
                        email: email,
                    };
                    subscribeUrl = "https://api.kit.com/v3/tags/".concat(kitTagId, "/subscribe");
                    return [4 /*yield*/, fetch(subscribeUrl, {
                            method: 'POST',
                            body: JSON.stringify(subscriberData),
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        })];
                case 2:
                    response = _c.sent();
                    return [4 /*yield*/, response.json()];
                case 3:
                    json = (_c.sent());
                    return [2 /*return*/, json.subscription.subscriber];
            }
        });
    });
}
function tagKCDSiteSubscriber(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var subscriber, kcdTagId, kcdSiteForm, subscriberData, subscribeUrl, updatedRes, updatedJson;
        var email = _b.email, firstName = _b.firstName, fields = _b.fields;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, getKitSubscriber(email)];
                case 1:
                    subscriber = _c.sent();
                    kcdTagId = '2466369';
                    kcdSiteForm = '2393887';
                    subscriberData = {
                        api_key: KIT_API_KEY,
                        api_secret: KIT_API_SECRET,
                        first_name: firstName,
                        email: email,
                        fields: fields,
                    };
                    subscribeUrl = subscriber
                        ? "https://api.kit.com/v3/tags/".concat(kcdTagId, "/subscribe")
                        : "https://api.kit.com/v3/forms/".concat(kcdSiteForm, "/subscribe");
                    return [4 /*yield*/, fetch(subscribeUrl, {
                            method: 'POST',
                            body: JSON.stringify(subscriberData),
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        })];
                case 2:
                    updatedRes = _c.sent();
                    return [4 /*yield*/, updatedRes.json()];
                case 3:
                    updatedJson = (_c.sent());
                    return [2 /*return*/, updatedJson.subscription.subscriber];
            }
        });
    });
}
