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
(0, utils_ts_1.test)('Users can send an email', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var user, mainContent, subject, bodyLorem, body, email;
    var page = _b.page, login = _b.login;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, login()];
            case 1:
                user = _c.sent();
                return [4 /*yield*/, page.goto('/')];
            case 2:
                _c.sent();
                return [4 /*yield*/, page
                        .getByRole('contentinfo')
                        .getByRole('link', { name: 'Email Kent' })
                        .click()];
            case 3:
                _c.sent();
                return [4 /*yield*/, (0, utils_ts_1.expect)(page).toHaveURL(/.*contact/)];
            case 4:
                _c.sent();
                return [4 /*yield*/, (0, utils_ts_1.expect)(page.getByRole('heading', { level: 2, name: /send me an email/i })).toBeVisible()
                    // verify name and email are prefilled
                ];
            case 5:
                _c.sent();
                mainContent = page.getByRole('main');
                return [4 /*yield*/, (0, utils_ts_1.expect)(mainContent.getByRole('textbox', { name: /name/i })).toHaveValue(user.firstName)];
            case 6:
                _c.sent();
                return [4 /*yield*/, (0, utils_ts_1.expect)(mainContent.getByRole('textbox', { name: /email/i })).toHaveValue(user.email)];
            case 7:
                _c.sent();
                subject = faker_1.faker.lorem.sentence();
                // fill in subject/body
                return [4 /*yield*/, mainContent.getByRole('textbox', { name: /subject/i }).fill(subject)];
            case 8:
                // fill in subject/body
                _c.sent();
                bodyLorem = faker_1.faker.lorem.paragraphs(1);
                body = "\nThis **supports markdown**\n\n".concat(bodyLorem, "\n  ").trim();
                return [4 /*yield*/, mainContent.getByRole('textbox', { name: /body/i }).fill(body)];
            case 9:
                _c.sent();
                return [4 /*yield*/, mainContent.getByRole('button', { name: /send/i }).click()];
            case 10:
                _c.sent();
                return [4 /*yield*/, (0, utils_ts_1.expect)(page.getByText(/email sent/i)).toBeVisible()];
            case 11:
                _c.sent();
                return [4 /*yield*/, (0, utils_ts_1.readEmail)(function (em) { return em.to.includes('me@kentcdodds.com'); })];
            case 12:
                email = _c.sent();
                (0, tiny_invariant_1.default)(email, 'Email not found');
                (0, utils_ts_1.expect)(email.from).toMatch(user.email);
                (0, utils_ts_1.expect)(email.subject).toMatch(subject);
                (0, utils_ts_1.expect)(email.text).toMatch(bodyLorem);
                (0, utils_ts_1.expect)(email.text).toMatch('- Sent via the KCD Contact Form');
                (0, utils_ts_1.expect)(email.html).toMatch("<strong>supports markdown</strong>");
                return [2 /*return*/];
        }
    });
}); });
