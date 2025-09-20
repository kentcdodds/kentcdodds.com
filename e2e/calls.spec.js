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
var faker_1 = require("@faker-js/faker");
var tiny_invariant_1 = require("tiny-invariant");
var utils_ts_1 = require("./utils.ts");
(0, utils_ts_1.test)('Call Kent recording flow', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var user, title, mainContent, email;
    var page = _b.page, login = _b.login;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, login()];
            case 1:
                user = _c.sent();
                return [4 /*yield*/, page.goto('/calls')];
            case 2:
                _c.sent();
                title = faker_1.faker.lorem.words(2);
                return [4 /*yield*/, page
                        .getByRole('banner')
                        .getByRole('link', { name: /record/i })
                        .click()];
            case 3:
                _c.sent();
                return [4 /*yield*/, (0, utils_ts_1.expect)(page).toHaveURL(/.*record/)];
            case 4:
                _c.sent();
                return [4 /*yield*/, (0, utils_ts_1.expect)(page.getByRole('heading', { level: 2, name: /record your call/i })).toBeVisible()];
            case 5:
                _c.sent();
                mainContent = page.getByRole('main');
                return [4 /*yield*/, mainContent.getByRole('link', { name: /new recording/i }).click()];
            case 6:
                _c.sent();
                return [4 /*yield*/, mainContent.getByRole('button', { name: /current.*device/i }).click()];
            case 7:
                _c.sent();
                return [4 /*yield*/, mainContent
                        .getByRole('checkbox', { name: /default/i })
                        .click({ force: true })];
            case 8:
                _c.sent();
                return [4 /*yield*/, mainContent.getByRole('button', { name: /start/i }).click()];
            case 9:
                _c.sent();
                return [4 /*yield*/, page.waitForTimeout(50)]; // let the sample.wav file play for a bit
            case 10:
                _c.sent(); // let the sample.wav file play for a bit
                return [4 /*yield*/, mainContent.getByRole('button', { name: /pause/i }).click()];
            case 11:
                _c.sent();
                return [4 /*yield*/, mainContent.getByRole('button', { name: /resume/i }).click()];
            case 12:
                _c.sent();
                return [4 /*yield*/, page.waitForTimeout(50)]; // let the sample.wav file play for a bit more
            case 13:
                _c.sent(); // let the sample.wav file play for a bit more
                return [4 /*yield*/, mainContent.getByRole('button', { name: /stop/i }).click()];
            case 14:
                _c.sent();
                return [4 /*yield*/, mainContent.getByRole('button', { name: /re-record/i }).click()];
            case 15:
                _c.sent();
                return [4 /*yield*/, mainContent.getByRole('button', { name: /start/i }).click()];
            case 16:
                _c.sent();
                return [4 /*yield*/, page.waitForTimeout(500)]; // let the sample.wav file play for a bit more
            case 17:
                _c.sent(); // let the sample.wav file play for a bit more
                return [4 /*yield*/, mainContent.getByRole('button', { name: /stop/i }).click()];
            case 18:
                _c.sent();
                return [4 /*yield*/, mainContent.getByRole('button', { name: /accept/i }).click()];
            case 19:
                _c.sent();
                return [4 /*yield*/, mainContent.getByRole('textbox', { name: /title/i }).type(title)];
            case 20:
                _c.sent();
                return [4 /*yield*/, mainContent
                        .getByRole('textbox', { name: /description/i })
                        .type(faker_1.faker.lorem.paragraph())];
            case 21:
                _c.sent();
                return [4 /*yield*/, mainContent
                        .getByRole('textbox', { name: /keywords/i })
                        .type(faker_1.faker.lorem.words(3).split(' ').join(','))];
            case 22:
                _c.sent();
                return [4 /*yield*/, mainContent.getByRole('button', { name: /submit/i }).click()];
            case 23:
                _c.sent();
                return [4 /*yield*/, login({ role: 'ADMIN' })];
            case 24:
                _c.sent();
                return [4 /*yield*/, page.goto('/calls/admin')];
            case 25:
                _c.sent();
                return [4 /*yield*/, page.getByRole('link', { name: new RegExp(title, 'i') }).click()];
            case 26:
                _c.sent();
                return [4 /*yield*/, page.getByRole('button', { name: /start/i }).click()];
            case 27:
                _c.sent();
                return [4 /*yield*/, page.waitForTimeout(500)]; // let the sample.wav file play for a bit more
            case 28:
                _c.sent(); // let the sample.wav file play for a bit more
                return [4 /*yield*/, page.getByRole('button', { name: /stop/i }).click()];
            case 29:
                _c.sent();
                return [4 /*yield*/, page.getByRole('button', { name: /accept/i }).click()];
            case 30:
                _c.sent();
                return [4 /*yield*/, page.getByRole('button', { name: /submit/i }).click()];
            case 31:
                _c.sent();
                return [4 /*yield*/, (0, utils_ts_1.expect)(page).toHaveURL(/.*calls\/\d+/)
                    // processing the audio takes a while, so let the timeout run
                ];
            case 32:
                _c.sent();
                // processing the audio takes a while, so let the timeout run
                return [4 /*yield*/, (0, utils_ts_1.expect)(page
                        .getByRole('banner')
                        .getByRole('heading', { level: 2, name: /calls with kent/i })).toBeVisible({ timeout: 10000 })];
            case 33:
                // processing the audio takes a while, so let the timeout run
                _c.sent();
                return [4 /*yield*/, (0, utils_ts_1.readEmail)(function (em) { return em.to.includes(user.email); })];
            case 34:
                email = _c.sent();
                (0, tiny_invariant_1.default)(email, 'Notification email not found');
                (0, utils_ts_1.expect)(email.subject).toMatch(/published/i);
                // NOTE: domain is hard coded for image generation and stuff
                (0, utils_ts_1.expect)(email.text).toContain('https://kentcdodds.com/calls');
                return [2 /*return*/];
        }
    });
}); });
