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
exports.kitHandlers = void 0;
var msw_1 = require("msw");
var kitHandlers = [
    msw_1.http.get('https://api.kit.com/v3/subscribers', function () {
        return msw_1.HttpResponse.json({
            total_subscribers: 0,
            page: 1,
            total_pages: 1,
            subscribers: [],
        });
    }),
    msw_1.http.get('https://api.kit.com/v3/subscribers/:subscriberId/tags', function () {
        return msw_1.HttpResponse.json({
            tags: [
                {
                    id: 1,
                    name: 'Subscribed: general newsletter',
                    created_at: '2021-06-09T17:54:22Z',
                },
            ],
        });
    }),
    msw_1.http.post('https://api.kit.com/v3/forms/:formId/subscribe', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var body, formId, first_name, email, fields;
        var request = _b.request, params = _b.params;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, request.json()];
                case 1:
                    body = _c.sent();
                    formId = params.formId;
                    first_name = body.first_name, email = body.email, fields = body.fields;
                    console.log('Subscribing to form', { formId: formId, body: body });
                    return [2 /*return*/, msw_1.HttpResponse.json({
                            subscription: {
                                id: 1234567890,
                                state: 'active',
                                created_at: new Date().toJSON(),
                                source: 'API::V3::SubscriptionsController (external)',
                                referrer: null,
                                subscribable_id: formId,
                                subscribable_type: 'form',
                                subscriber: {
                                    id: 987654321,
                                    first_name: first_name,
                                    email_address: email,
                                    state: 'inactive',
                                    created_at: new Date().toJSON(),
                                    fields: fields,
                                },
                            },
                        })];
            }
        });
    }); }),
    msw_1.http.post('https://api.kit.com/v3/tags/:tagId/subscribe', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var body, tagId, first_name, email, fields;
        var request = _b.request, params = _b.params;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, request.json()];
                case 1:
                    body = _c.sent();
                    tagId = params.tagId;
                    first_name = body.first_name, email = body.email, fields = body.fields;
                    console.log('Subscribing to tag', { tagId: tagId, body: body });
                    return [2 /*return*/, msw_1.HttpResponse.json({
                            subscription: {
                                id: 1234567890,
                                state: 'active',
                                created_at: new Date().toJSON(),
                                source: 'API::V3::SubscriptionsController (external)',
                                referrer: null,
                                subscribable_id: tagId,
                                subscribable_type: 'tag',
                                subscriber: {
                                    id: 987654321,
                                    first_name: first_name,
                                    email_address: email,
                                    state: 'inactive',
                                    created_at: new Date().toJSON(),
                                    fields: fields,
                                },
                            },
                        })];
            }
        });
    }); }),
];
exports.kitHandlers = kitHandlers;
