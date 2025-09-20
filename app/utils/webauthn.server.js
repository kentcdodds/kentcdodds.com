"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistrationResponseSchema = exports.PasskeyCookieSchema = exports.passkeyCookie = void 0;
exports.getWebAuthnConfig = getWebAuthnConfig;
var node_1 = require("@remix-run/node");
var zod_1 = require("zod");
var misc_tsx_1 = require("./misc.tsx");
exports.passkeyCookie = (0, node_1.createCookie)('webauthn-challenge', {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    maxAge: 60 * 60 * 2,
    secure: process.env.NODE_ENV === 'production',
    secrets: [process.env.SESSION_SECRET],
});
exports.PasskeyCookieSchema = zod_1.z.object({
    challenge: zod_1.z.string(),
    userId: zod_1.z.string(),
});
exports.RegistrationResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    rawId: zod_1.z.string(),
    response: zod_1.z.object({
        clientDataJSON: zod_1.z.string(),
        attestationObject: zod_1.z.string(),
        transports: zod_1.z
            .array(zod_1.z.enum([
            'ble',
            'cable',
            'hybrid',
            'internal',
            'nfc',
            'smart-card',
            'usb',
        ]))
            .optional(),
    }),
    authenticatorAttachment: zod_1.z.enum(['cross-platform', 'platform']).optional(),
    clientExtensionResults: zod_1.z.object({
        credProps: zod_1.z
            .object({
            rk: zod_1.z.boolean(),
        })
            .optional(),
    }),
    type: zod_1.z.literal('public-key'),
});
function getWebAuthnConfig(request) {
    var url = new URL((0, misc_tsx_1.getDomainUrl)(request));
    return {
        rpName: "KCD (".concat(url.hostname, ")"),
        rpID: url.hostname,
        origin: url.origin,
        // Common options for both registration and authentication
        authenticatorSelection: {
            residentKey: 'preferred',
            userVerification: 'preferred',
        },
    };
}
