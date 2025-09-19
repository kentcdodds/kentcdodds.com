"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vitest_1 = require("vitest");
var user_validation_ts_1 = require("../user-validation.ts");
(0, vitest_1.describe)('user-validation', function () {
    (0, vitest_1.describe)('getPasswordValidationMessage', function () {
        (0, vitest_1.test)('returns null for valid password', function () {
            var validPasswords = [
                'Password123!',
                'MySecure1@',
                'Test9$password',
                'Complex1@Password',
                'Strong2#Pass',
            ];
            validPasswords.forEach(function (password) {
                (0, vitest_1.expect)((0, user_validation_ts_1.getPasswordValidationMessage)(password)).toBeNull();
            });
        });
        (0, vitest_1.test)('returns error for password too short', function () {
            var shortPasswords = ['Pass1!', 'Ab1@', 'Xy3#'];
            shortPasswords.forEach(function (password) {
                var result = (0, user_validation_ts_1.getPasswordValidationMessage)(password);
                (0, vitest_1.expect)(result).toContain('at least 6 characters');
            });
        });
        (0, vitest_1.test)('returns error for password missing uppercase letter', function () {
            var noUppercasePasswords = [
                'password123!',
                'mypassword1@',
                'test9$pass',
            ];
            noUppercasePasswords.forEach(function (password) {
                var result = (0, user_validation_ts_1.getPasswordValidationMessage)(password);
                (0, vitest_1.expect)(result).toContain('uppercase letter');
            });
        });
        (0, vitest_1.test)('returns error for password missing lowercase letter', function () {
            var noLowercasePasswords = ['PASSWORD123!', 'MYPASSWORD1@', 'TEST9$PASS'];
            noLowercasePasswords.forEach(function (password) {
                var result = (0, user_validation_ts_1.getPasswordValidationMessage)(password);
                (0, vitest_1.expect)(result).toContain('lowercase letter');
            });
        });
        (0, vitest_1.test)('returns error for password missing number', function () {
            var noNumberPasswords = ['Password!', 'MyPassword@', 'Test$password'];
            noNumberPasswords.forEach(function (password) {
                var result = (0, user_validation_ts_1.getPasswordValidationMessage)(password);
                (0, vitest_1.expect)(result).toContain('number');
            });
        });
        (0, vitest_1.test)('returns error for password missing special character', function () {
            var noSpecialCharPasswords = [
                'Password123',
                'MyPassword1',
                'Test9password',
            ];
            noSpecialCharPasswords.forEach(function (password) {
                var result = (0, user_validation_ts_1.getPasswordValidationMessage)(password);
                (0, vitest_1.expect)(result).toContain('special character');
            });
        });
        (0, vitest_1.test)('returns first validation error encountered', function () {
            // This tests the order of validation checks
            var result = (0, user_validation_ts_1.getPasswordValidationMessage)('abc'); // short, no uppercase, no number, no special char
            (0, vitest_1.expect)(result).toContain('at least 6 characters');
        });
        (0, vitest_1.test)('handles edge cases', function () {
            // Empty password
            (0, vitest_1.expect)((0, user_validation_ts_1.getPasswordValidationMessage)('')).toContain('at least 6 characters');
            // Null/undefined
            (0, vitest_1.expect)((0, user_validation_ts_1.getPasswordValidationMessage)(null)).toContain('at least 6 characters');
            (0, vitest_1.expect)((0, user_validation_ts_1.getPasswordValidationMessage)(undefined)).toContain('at least 6 characters');
        });
        (0, vitest_1.test)('accepts various special characters', function () {
            var specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'];
            specialChars.forEach(function (char) {
                var password = "Password1".concat(char);
                (0, vitest_1.expect)((0, user_validation_ts_1.getPasswordValidationMessage)(password)).toBeNull();
            });
        });
        (0, vitest_1.test)('exactly 6 characters is valid if all requirements met', function () {
            var password = 'Pass1!';
            (0, vitest_1.expect)((0, user_validation_ts_1.getPasswordValidationMessage)(password)).toBeNull();
        });
        (0, vitest_1.test)('long password is valid if all requirements met', function () {
            var password = 'ThisIsAVeryLongPasswordWithNumbers123AndSpecialChars!';
            (0, vitest_1.expect)((0, user_validation_ts_1.getPasswordValidationMessage)(password)).toBeNull();
        });
    });
});
