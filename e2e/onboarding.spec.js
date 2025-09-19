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
var test_1 = require("@playwright/test");
var tiny_invariant_1 = require("tiny-invariant");
var utils_ts_1 = require("./utils.ts");
(0, test_1.test)('A new user can create an account', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var firstName, emailAddress, email, magicLink, mainContent;
    var page = _b.page;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                firstName = faker_1.faker.person.firstName();
                emailAddress = faker_1.faker.internet.email({
                    firstName: firstName,
                    lastName: faker_1.faker.person.lastName(),
                    provider: 'example.com',
                });
                return [4 /*yield*/, page.goto('/')];
            case 1:
                _c.sent();
                return [4 /*yield*/, page
                        .getByRole('navigation')
                        .getByRole('link', { name: 'Login' })
                        .click()];
            case 2:
                _c.sent();
                return [4 /*yield*/, (0, test_1.expect)(page).toHaveURL(/.*login/)];
            case 3:
                _c.sent();
                return [4 /*yield*/, (0, test_1.expect)(page.getByRole('heading', { level: 2, name: /Log.?in/i })).toBeVisible()
                    // submit email to sign up
                ];
            case 4:
                _c.sent();
                // submit email to sign up
                return [4 /*yield*/, page
                        .getByRole('banner')
                        .getByRole('textbox', { name: /email/i })
                        .fill(emailAddress)];
            case 5:
                // submit email to sign up
                _c.sent();
                return [4 /*yield*/, page
                        .getByRole('banner')
                        .getByRole('textbox', { name: /email/i })
                        .press('Enter')];
            case 6:
                _c.sent();
                return [4 /*yield*/, (0, test_1.expect)(page.getByText(/magic link has been sent/i)).toBeVisible()
                    // read and verify the email
                ];
            case 7:
                _c.sent();
                return [4 /*yield*/, (0, utils_ts_1.readEmail)(emailAddress)];
            case 8:
                email = _c.sent();
                (0, tiny_invariant_1.default)(email, 'Email not found');
                (0, test_1.expect)(email.to).toBe(emailAddress);
                (0, test_1.expect)(email.from).toMatch(/team\+kcd@kentcdodds.com/);
                (0, test_1.expect)(email.subject).toMatch(/magic/i);
                magicLink = (0, utils_ts_1.extractUrl)(email.text);
                (0, tiny_invariant_1.default)(magicLink, 'Magic Link not found');
                return [4 /*yield*/, page.goto(magicLink)
                    // sign up for an account
                ];
            case 9:
                _c.sent();
                mainContent = page.getByRole('main');
                return [4 /*yield*/, (0, test_1.expect)(page).toHaveURL(/.*signup/)];
            case 10:
                _c.sent();
                return [4 /*yield*/, mainContent.getByRole('textbox', { name: /name/i }).fill(firstName)];
            case 11:
                _c.sent();
                return [4 /*yield*/, mainContent.getByRole('radio', { name: /blue/i }).check({ force: true })];
            case 12:
                _c.sent();
                return [4 /*yield*/, mainContent.getByRole('button', { name: /create account/i }).click()];
            case 13:
                _c.sent();
                return [4 /*yield*/, (0, test_1.expect)(page).toHaveURL(/.*me/)];
            case 14:
                _c.sent();
                return [4 /*yield*/, (0, test_1.expect)(page.getByRole('heading', { level: 2, name: /profile/i })).toBeVisible()];
            case 15:
                _c.sent();
                return [4 /*yield*/, (0, utils_ts_1.deleteUserByEmail)(emailAddress)];
            case 16:
                _c.sent();
                return [4 /*yield*/, page.reload()];
            case 17:
                _c.sent();
                return [4 /*yield*/, (0, test_1.expect)(page).toHaveURL(/.*login/)];
            case 18:
                _c.sent();
                return [2 /*return*/];
        }
    });
}); });
