"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePassword = exports.EmailSchema = exports.UsernameSchema = exports.NameSchema = exports.PasswordSchema = void 0;
exports.getPasswordValidationMessage = getPasswordValidationMessage;
exports.isPasswordValid = isPasswordValid;
var zod_1 = require("zod");
exports.PasswordSchema = zod_1.z
    .string({ required_error: 'Password is required' })
    .min(6, { message: 'Password is too short' })
    .max(100, { message: 'Password is too long' });
exports.NameSchema = zod_1.z
    .string({ required_error: 'Name is required' })
    .min(1, { message: 'Name is required' })
    .max(40, { message: 'Name is too long' })
    .regex(/^[a-zA-Z\s'`\-\.]+$/, {
    message: 'Name can only include letters, spaces, and some punctuation',
});
exports.UsernameSchema = zod_1.z
    .string({ required_error: 'Username is required' })
    .min(3, { message: 'Username is too short' })
    .max(20, { message: 'Username is too long' })
    .regex(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only include letters, numbers, and underscores',
})
    // users can type the username in any case, but we store it in lowercase
    .transform(function (value) { return value.toLowerCase(); });
exports.EmailSchema = zod_1.z
    .string({ required_error: 'Email is required' })
    .email({ message: 'Email is invalid' })
    .min(3, { message: 'Email is too short' })
    .max(100, { message: 'Email is too long' })
    // users can type the email in any case, but we store it in lowercase
    .transform(function (value) { return value.toLowerCase(); });
function getPasswordValidationMessage(password) {
    if (!password || password.length < 6) {
        return 'Password must be at least 6 characters';
    }
    if (password.length > 100) {
        return 'Password is too long';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
        return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
        return 'Password must contain at least one number';
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
        return 'Password must contain at least one special character';
    }
    return null;
}
function isPasswordValid(password) {
    return getPasswordValidationMessage(password) === null;
}
exports.validatePassword = getPasswordValidationMessage;
