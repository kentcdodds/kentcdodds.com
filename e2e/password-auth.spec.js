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
var test_1 = require("@playwright/test");
var playwright_utils_ts_1 = require("#tests/playwright-utils.ts");
test_1.test.describe('Password Authentication - Tabbed Interface', function () {
    test_1.test.beforeEach(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/login')];
                case 1:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should display three tabs: Sign In, Sign Up, and Forgot Password', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, test_1.expect)(page.locator('button:has-text("Sign In")')).toBeVisible()];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('button:has-text("Sign Up")')).toBeVisible()];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('button:has-text("Forgot Password")')).toBeVisible()];
                case 3:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should default to Sign In tab', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // Sign In tab should be active by default
                return [4 /*yield*/, (0, test_1.expect)(page.locator('button:has-text("Sign In")').first()).toHaveClass(/border-blue-500/)];
                case 1:
                    // Sign In tab should be active by default
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('button[type="submit"]:has-text("Sign In")')).toBeVisible()];
                case 2:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should switch between tabs and show appropriate forms', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // Sign In tab (default)
                return [4 /*yield*/, (0, test_1.expect)(page.locator('[name="email"]')).toBeVisible()];
                case 1:
                    // Sign In tab (default)
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('[name="password"]')).toBeVisible()];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('[name="firstName"]')).not.toBeVisible()
                        // Switch to Sign Up tab
                    ];
                case 3:
                    _c.sent();
                    // Switch to Sign Up tab
                    return [4 /*yield*/, page.locator('button:has-text("Sign Up")').first().click()];
                case 4:
                    // Switch to Sign Up tab
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('[name="email"]')).toBeVisible()];
                case 5:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('[name="firstName"]')).toBeVisible()];
                case 6:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('[name="lastName"]')).toBeVisible()];
                case 7:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('[name="password"]')).toBeVisible()];
                case 8:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('[name="confirmPassword"]')).toBeVisible()];
                case 9:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('button[type="submit"]:has-text("Create Account")')).toBeVisible()
                        // Switch to Forgot Password tab
                    ];
                case 10:
                    _c.sent();
                    // Switch to Forgot Password tab
                    return [4 /*yield*/, page.locator('button:has-text("Forgot Password")').first().click()];
                case 11:
                    // Switch to Forgot Password tab
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('[name="email"]')).toBeVisible()];
                case 12:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('[name="password"]')).not.toBeVisible()];
                case 13:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('button[type="submit"]:has-text("Send Reset Email")')).toBeVisible()];
                case 14:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should validate sign in form', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // Submit button should be disabled without valid inputs
                return [4 /*yield*/, (0, test_1.expect)(page.locator('button[type="submit"]:has-text("Sign In")')).toBeDisabled()
                    // Fill in email
                ];
                case 1:
                    // Submit button should be disabled without valid inputs
                    _c.sent();
                    // Fill in email
                    return [4 /*yield*/, page.fill('[name="email"]', 'test@example.com')];
                case 2:
                    // Fill in email
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('button[type="submit"]:has-text("Sign In")')).toBeDisabled()
                        // Fill in password
                    ];
                case 3:
                    _c.sent();
                    // Fill in password
                    return [4 /*yield*/, page.fill('[name="password"]', 'password123')];
                case 4:
                    // Fill in password
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('button[type="submit"]:has-text("Sign In")')).toBeEnabled()];
                case 5:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should show error for missing password in sign in', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.fill('[name="email"]', 'test@example.com')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.locator('button[type="submit"]:has-text("Sign In")').click()];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page).toHaveURL('/login')];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('[id="error-message"]')).toContainText('Password is required')];
                case 4:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should show error for wrong password', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var userData;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    userData = (0, playwright_utils_ts_1.createUser)();
                    return [4 /*yield*/, page.fill('[name="email"]', userData.email)];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.fill('[name="password"]', 'wrongpassword')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.locator('button[type="submit"]:has-text("Sign In")').click()];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page).toHaveURL('/login')];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('[id="error-message"]')).toContainText('Invalid email or password')];
                case 5:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should validate sign up form', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.locator('button:has-text("Sign Up")').first().click()
                    // Submit button should be disabled without valid inputs
                ];
                case 1:
                    _c.sent();
                    // Submit button should be disabled without valid inputs
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('button[type="submit"]:has-text("Create Account")')).toBeDisabled()
                        // Fill in required fields
                    ];
                case 2:
                    // Submit button should be disabled without valid inputs
                    _c.sent();
                    // Fill in required fields
                    return [4 /*yield*/, page.fill('[name="email"]', 'test@example.com')];
                case 3:
                    // Fill in required fields
                    _c.sent();
                    return [4 /*yield*/, page.fill('[name="firstName"]', 'John')];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, page.fill('[name="password"]', 'Password123!')];
                case 5:
                    _c.sent();
                    return [4 /*yield*/, page.fill('[name="confirmPassword"]', 'Password123!')];
                case 6:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('button[type="submit"]:has-text("Create Account")')).toBeEnabled()];
                case 7:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should show password mismatch error', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.locator('button:has-text("Sign Up")').first().click()];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.fill('[name="password"]', 'password1')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.fill('[name="confirmPassword"]', 'password2')];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=Passwords do not match')).toBeVisible()];
                case 4:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should validate forgot password form', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.locator('button:has-text("Forgot Password")').first().click()
                    // Submit button should be disabled without email
                ];
                case 1:
                    _c.sent();
                    // Submit button should be disabled without email
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('button[type="submit"]:has-text("Send Reset Email")')).toBeDisabled()
                        // Fill in email
                    ];
                case 2:
                    // Submit button should be disabled without email
                    _c.sent();
                    // Fill in email
                    return [4 /*yield*/, page.fill('[name="email"]', 'test@example.com')];
                case 3:
                    // Fill in email
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('button[type="submit"]:has-text("Send Reset Email")')).toBeEnabled()];
                case 4:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should handle forgot password submission', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.locator('button:has-text("Forgot Password")').first().click()];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.fill('[name="email"]', 'test@example.com')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.locator('button[type="submit"]:has-text("Send Reset Email")').click()];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=Check your email')).toBeVisible()];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=If an account with test@example.com exists')).toBeVisible()];
                case 5:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should show passkey login option', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, test_1.expect)(page.locator('button:has-text("Login with Passkey")')).toBeVisible()];
                case 1:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should handle form reset', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.fill('[name="email"]', 'test@example.com')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.fill('[name="password"]', 'password123')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.locator('button:has-text("Reset")').click()];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('[name="email"]')).toHaveValue('')];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('[name="password"]')).toHaveValue('')];
                case 5:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should be accessible with proper ARIA labels', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // Check tab accessibility
                return [4 /*yield*/, (0, test_1.expect)(page.locator('nav[aria-label="Tabs"]')).toBeVisible()
                    // Check form labels
                ];
                case 1:
                    // Check tab accessibility
                    _c.sent();
                    // Check form labels
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('label[for="email-address"]')).toBeVisible()];
                case 2:
                    // Check form labels
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('label[for="password"]')).toBeVisible()
                        // Test keyboard navigation between tabs
                    ];
                case 3:
                    _c.sent();
                    // Test keyboard navigation between tabs
                    return [4 /*yield*/, page.locator('button:has-text("Sign In")').first().focus()];
                case 4:
                    // Test keyboard navigation between tabs
                    _c.sent();
                    return [4 /*yield*/, page.keyboard.press('ArrowRight')];
                case 5:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('button:has-text("Sign Up")').first()).toBeFocused()];
                case 6:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should maintain context-appropriate descriptions', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // Sign In tab
                return [4 /*yield*/, (0, test_1.expect)(page.locator('text=To sign in to your account, enter your email and password above')).toBeVisible()
                    // Sign Up tab
                ];
                case 1:
                    // Sign In tab
                    _c.sent();
                    // Sign Up tab
                    return [4 /*yield*/, page.locator('button:has-text("Sign Up")').first().click()];
                case 2:
                    // Sign Up tab
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=Create a new account by filling out the form above')).toBeVisible()
                        // Forgot Password tab
                    ];
                case 3:
                    _c.sent();
                    // Forgot Password tab
                    return [4 /*yield*/, page.locator('button:has-text("Forgot Password")').first().click()];
                case 4:
                    // Forgot Password tab
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('text=Enter your email address and we\'ll send you instructions to reset your password')).toBeVisible()];
                case 5:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should have proper intent values for different forms', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // Sign In intent
                return [4 /*yield*/, (0, test_1.expect)(page.locator('input[name="intent"][value="signin"]')).toBeVisible()
                    // Sign Up intent
                ];
                case 1:
                    // Sign In intent
                    _c.sent();
                    // Sign Up intent
                    return [4 /*yield*/, page.locator('button:has-text("Sign Up")').first().click()];
                case 2:
                    // Sign Up intent
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('input[name="intent"][value="signup"]')).toBeVisible()
                        // Forgot Password intent
                    ];
                case 3:
                    _c.sent();
                    // Forgot Password intent
                    return [4 /*yield*/, page.locator('button:has-text("Forgot Password")').first().click()];
                case 4:
                    // Forgot Password intent
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.locator('input[name="intent"][value="forgot-password"]')).toBeVisible()];
                case 5:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
