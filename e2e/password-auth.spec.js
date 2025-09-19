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
test_1.test.describe('Password Authentication', function () {
    test_1.test.beforeEach(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // Navigate to login page
                return [4 /*yield*/, page.goto('/login')];
                case 1:
                    // Navigate to login page
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should show password and magic link toggle options', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // Check that both password and magic link options are available
                return [4 /*yield*/, (0, test_1.expect)(page.getByText('Password')).toBeVisible()];
                case 1:
                    // Check that both password and magic link options are available
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByText('Magic Link')).toBeVisible()
                        // Password mode should be selected by default
                    ];
                case 2:
                    _c.sent();
                    // Password mode should be selected by default
                    return [4 /*yield*/, (0, test_1.expect)(page.getByRole('button', { name: 'Password' })).toHaveClass(/primary/)];
                case 3:
                    // Password mode should be selected by default
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should toggle between password and magic link modes', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // Start in password mode
                return [4 /*yield*/, (0, test_1.expect)(page.getByLabelText('Password')).toBeVisible()
                    // Switch to magic link mode
                ];
                case 1:
                    // Start in password mode
                    _c.sent();
                    // Switch to magic link mode
                    return [4 /*yield*/, page.getByRole('button', { name: 'Magic Link' }).click()];
                case 2:
                    // Switch to magic link mode
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByLabelText('Password')).not.toBeVisible()];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByRole('button', { name: 'Email a login link' })).toBeVisible()
                        // Switch back to password mode
                    ];
                case 4:
                    _c.sent();
                    // Switch back to password mode
                    return [4 /*yield*/, page.getByRole('button', { name: 'Password' }).click()];
                case 5:
                    // Switch back to password mode
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByLabelText('Password')).toBeVisible()];
                case 6:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByRole('button', { name: 'Sign in' })).toBeVisible()];
                case 7:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should validate required fields in password mode', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // Try to submit without email
                return [4 /*yield*/, page.getByRole('button', { name: 'Sign in' }).click()
                    // Should not be able to submit (button should be disabled)
                ];
                case 1:
                    // Try to submit without email
                    _c.sent();
                    // Should not be able to submit (button should be disabled)
                    return [4 /*yield*/, (0, test_1.expect)(page.getByRole('button', { name: 'Sign in' })).toBeDisabled()
                        // Add email, still missing password
                    ];
                case 2:
                    // Should not be able to submit (button should be disabled)
                    _c.sent();
                    // Add email, still missing password
                    return [4 /*yield*/, page.getByLabelText('Email address').fill('test@example.com')];
                case 3:
                    // Add email, still missing password
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByRole('button', { name: 'Sign in' })).toBeDisabled()
                        // Add password
                    ];
                case 4:
                    _c.sent();
                    // Add password
                    return [4 /*yield*/, page.getByLabelText('Password').fill('Password123!')];
                case 5:
                    // Add password
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByRole('button', { name: 'Sign in' })).toBeEnabled()];
                case 6:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should show forgot password option in password mode', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.getByLabelText('Email address').fill('test@example.com')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByRole('button', { name: 'Forgot password?' })).toBeVisible()
                        // Forgot password button should be disabled without email
                    ];
                case 2:
                    _c.sent();
                    // Forgot password button should be disabled without email
                    return [4 /*yield*/, page.getByLabelText('Email address').clear()];
                case 3:
                    // Forgot password button should be disabled without email
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByRole('button', { name: 'Forgot password?' })).toBeDisabled()];
                case 4:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should show onboarding help section', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, test_1.expect)(page.getByText('New to passwords?')).toBeVisible()];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByText('We\'re transitioning from magic links to passwords')).toBeVisible()];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByRole('link', { name: 'Click here for help setting up your password' })).toBeVisible()];
                case 3:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should navigate to onboarding page', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.getByRole('link', { name: 'Click here for help setting up your password' }).click()];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page).toHaveURL('/onboarding')];
                case 2:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
test_1.test.describe('Password Reset Flow', function () {
    (0, test_1.test)('should navigate to reset password page with verification', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var verificationParams;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    verificationParams = new URLSearchParams({
                        code: '123456',
                        type: 'reset-password',
                        target: 'test@example.com',
                    });
                    return [4 /*yield*/, page.goto("/verify?".concat(verificationParams))
                        // Should redirect to reset password page after verification
                    ];
                case 1:
                    _c.sent();
                    // Should redirect to reset password page after verification
                    return [4 /*yield*/, (0, test_1.expect)(page).toHaveURL('/reset-password')];
                case 2:
                    // Should redirect to reset password page after verification
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should show password requirements on reset page', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // Navigate directly to reset password (would normally require verification)
                return [4 /*yield*/, page.goto('/reset-password')];
                case 1:
                    // Navigate directly to reset password (would normally require verification)
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByText('Password Requirements')).toBeVisible()];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByText('At least 6 characters long')).toBeVisible()];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByText('Contains at least one uppercase letter')).toBeVisible()];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByText('Contains at least one lowercase letter')).toBeVisible()];
                case 5:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByText('Contains at least one number')).toBeVisible()];
                case 6:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByText('Contains at least one special character')).toBeVisible()];
                case 7:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should validate password requirements', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/reset-password')
                    // Test weak password
                ];
                case 1:
                    _c.sent();
                    // Test weak password
                    return [4 /*yield*/, page.getByLabelText('New Password').fill('weak')];
                case 2:
                    // Test weak password
                    _c.sent();
                    return [4 /*yield*/, page.getByLabelText('Confirm Password').fill('weak')
                        // Should show validation errors
                    ];
                case 3:
                    _c.sent();
                    // Should show validation errors
                    return [4 /*yield*/, (0, test_1.expect)(page.getByText('Password must be at least 6 characters')).toBeVisible()
                        // Test strong password
                    ];
                case 4:
                    // Should show validation errors
                    _c.sent();
                    // Test strong password
                    return [4 /*yield*/, page.getByLabelText('New Password').fill('StrongPass123!')];
                case 5:
                    // Test strong password
                    _c.sent();
                    return [4 /*yield*/, page.getByLabelText('Confirm Password').fill('StrongPass123!')];
                case 6:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByRole('button', { name: 'Reset Password' })).toBeEnabled()];
                case 7:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should validate password confirmation match', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/reset-password')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.getByLabelText('New Password').fill('StrongPass123!')];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.getByLabelText('Confirm Password').fill('DifferentPass123!')];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByText('Passwords do not match')).toBeVisible()];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByRole('button', { name: 'Reset Password' })).toBeDisabled()];
                case 5:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
test_1.test.describe('Onboarding Flow', function () {
    test_1.test.beforeEach(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/onboarding')];
                case 1:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should explain the change from magic links to passwords', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, test_1.expect)(page.getByText('Set up your password')).toBeVisible()];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByText('We\'re moving from magic links to passwords for better reliability')).toBeVisible()];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByText('What\'s changing?')).toBeVisible()];
                case 3:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should show benefits of the change', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, test_1.expect)(page.getByText('Set up a password if you\'re an existing user')).toBeVisible()];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByText('Create a new account if you\'re new')).toBeVisible()];
                case 2:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should validate email input', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // Button should be disabled initially
                return [4 /*yield*/, (0, test_1.expect)(page.getByRole('button', { name: 'Continue' })).toBeDisabled()
                    // Invalid email
                ];
                case 1:
                    // Button should be disabled initially
                    _c.sent();
                    // Invalid email
                    return [4 /*yield*/, page.getByLabelText('Email Address').fill('invalid-email')];
                case 2:
                    // Invalid email
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByRole('button', { name: 'Continue' })).toBeDisabled()
                        // Valid email
                    ];
                case 3:
                    _c.sent();
                    // Valid email
                    return [4 /*yield*/, page.getByLabelText('Email Address').fill('test@example.com')];
                case 4:
                    // Valid email
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByRole('button', { name: 'Continue' })).toBeEnabled()];
                case 5:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should show link to login page for users with passwords', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, test_1.expect)(page.getByText('Already have a password?')).toBeVisible()];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByRole('link', { name: 'go directly to the login page' })).toBeVisible()];
                case 2:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
test_1.test.describe('Signup with Password', function () {
    (0, test_1.test)('should support password creation for new users', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var signupParams;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    signupParams = new URLSearchParams({
                        verified: 'true',
                        type: 'onboarding',
                        email: 'newuser@example.com',
                    });
                    return [4 /*yield*/, page.goto("/signup?".concat(signupParams))
                        // Should show password fields for new users
                    ];
                case 1:
                    _c.sent();
                    // Should show password fields for new users
                    return [4 /*yield*/, (0, test_1.expect)(page.getByLabelText('Password')).toBeVisible()];
                case 2:
                    // Should show password fields for new users
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByLabelText('Confirm Password')).toBeVisible()];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByText('Password Requirements')).toBeVisible()];
                case 4:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should validate all signup fields including password', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/signup')
                    // Fill in team selection (required)
                ];
                case 1:
                    _c.sent();
                    // Fill in team selection (required)
                    return [4 /*yield*/, page.getByRole('radio', { name: /Red Team/ }).first().click()
                        // Fill in first name
                    ];
                case 2:
                    // Fill in team selection (required)
                    _c.sent();
                    // Fill in first name
                    return [4 /*yield*/, page.getByLabelText('First name').fill('Test')
                        // For password-based signup, need password fields
                    ];
                case 3:
                    // Fill in first name
                    _c.sent();
                    return [4 /*yield*/, page.getByLabelText('Password').isVisible()];
                case 4:
                    if (!_c.sent()) return [3 /*break*/, 7];
                    return [4 /*yield*/, page.getByLabelText('Password').fill('TestPass123!')];
                case 5:
                    _c.sent();
                    return [4 /*yield*/, page.getByLabelText('Confirm Password').fill('TestPass123!')];
                case 6:
                    _c.sent();
                    _c.label = 7;
                case 7: return [4 /*yield*/, (0, test_1.expect)(page.getByRole('button', { name: 'Create account' })).toBeEnabled()];
                case 8:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
test_1.test.describe('Accessibility', function () {
    (0, test_1.test)('login form should be accessible', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var signInButton;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/login')
                    // Check form labels are properly associated
                ];
                case 1:
                    _c.sent();
                    // Check form labels are properly associated
                    return [4 /*yield*/, (0, test_1.expect)(page.getByLabelText('Email address')).toBeVisible()];
                case 2:
                    // Check form labels are properly associated
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByLabelText('Password')).toBeVisible()
                        // Check button states are announced
                    ];
                case 3:
                    _c.sent();
                    signInButton = page.getByRole('button', { name: 'Sign in' });
                    return [4 /*yield*/, (0, test_1.expect)(signInButton).toBeVisible()
                        // Check error messages are properly announced
                    ];
                case 4:
                    _c.sent();
                    // Check error messages are properly announced
                    return [4 /*yield*/, page.getByLabelText('Email address').fill('invalid')];
                case 5:
                    // Check error messages are properly announced
                    _c.sent();
                    return [4 /*yield*/, signInButton.click()
                        // Should have accessible error messages
                    ];
                case 6:
                    _c.sent();
                    // Should have accessible error messages
                    return [4 /*yield*/, (0, test_1.expect)(page.getByRole('alert')).toBeVisible()];
                case 7:
                    // Should have accessible error messages
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('password reset form should be accessible', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var requirements;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto('/reset-password')];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByLabelText('New Password')).toBeVisible()];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByLabelText('Confirm Password')).toBeVisible()
                        // Password requirements should be accessible
                    ];
                case 3:
                    _c.sent();
                    requirements = page.getByText('Password Requirements').locator('..');
                    return [4 /*yield*/, (0, test_1.expect)(requirements).toBeVisible()];
                case 4:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
