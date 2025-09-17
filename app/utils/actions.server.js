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
exports.handleFormSubmission = handleFormSubmission;
var node_1 = require("@remix-run/node");
var misc_tsx_1 = require("./misc.tsx");
function handleFormSubmission(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var requestText, _i, _c, fieldName, formValue, nonNullFields, response, error_1;
        var _this = this;
        var form = _b.form, request = _b.request, validators = _b.validators, 
        // @ts-expect-error ts(2322) 🤷‍♂️
        _d = _b.actionData, 
        // @ts-expect-error ts(2322) 🤷‍♂️
        actionData = _d === void 0 ? { fields: {}, errors: {} } : _d, handleFormValues = _b.handleFormValues;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _e.trys.push([0, 5, , 6]);
                    if (!!form) return [3 /*break*/, 2];
                    return [4 /*yield*/, request.text()];
                case 1:
                    requestText = _e.sent();
                    form = new URLSearchParams(requestText);
                    _e.label = 2;
                case 2:
                    // collect all values first because validators can reference them
                    for (_i = 0, _c = Object.keys(validators); _i < _c.length; _i++) {
                        fieldName = _c[_i];
                        formValue = form.get(fieldName);
                        // Default the value to empty string so it doesn't have trouble with
                        // getNonNull later. This allows us to have a validator that allows
                        // for optional values.
                        actionData.fields[fieldName] = formValue !== null && formValue !== void 0 ? formValue : '';
                    }
                    return [4 /*yield*/, Promise.all(Object.entries(validators).map(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                            var formValue, _c, _d;
                            var fieldName = _b[0], validator = _b[1];
                            return __generator(this, function (_e) {
                                switch (_e.label) {
                                    case 0:
                                        formValue = form.get(fieldName);
                                        // Default the value to empty string so it doesn't have trouble with
                                        // getNonNull later. This allows us to have a validator that allows
                                        // for optional values.
                                        _c = actionData.errors;
                                        _d = fieldName;
                                        return [4 /*yield*/, validator(formValue, actionData.fields)];
                                    case 1:
                                        // Default the value to empty string so it doesn't have trouble with
                                        // getNonNull later. This allows us to have a validator that allows
                                        // for optional values.
                                        _c[_d] = _e.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 3:
                    _e.sent();
                    if (Object.values(actionData.errors).some(function (err) { return err !== null; })) {
                        return [2 /*return*/, (0, node_1.json)(__assign(__assign({}, actionData), { status: 'error' }), 400)];
                    }
                    nonNullFields = (0, misc_tsx_1.getNonNull)(actionData.fields);
                    return [4 /*yield*/, handleFormValues(nonNullFields)];
                case 4:
                    response = _e.sent();
                    return [2 /*return*/, response];
                case 5:
                    error_1 = _e.sent();
                    actionData.errors.generalError = (0, misc_tsx_1.getErrorMessage)(error_1);
                    return [2 /*return*/, (0, node_1.json)(actionData, 500)];
                case 6: return [2 /*return*/];
            }
        });
    });
}
