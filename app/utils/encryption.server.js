"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
var crypto_1 = require("crypto");
var misc_tsx_1 = require("./misc.tsx");
var algorithm = 'aes-256-gcm';
var secret = (0, misc_tsx_1.getRequiredServerEnvVar)('MAGIC_LINK_SECRET');
var ENCRYPTION_KEY = crypto_1.default.scryptSync(secret, 'salt', 32);
var IV_LENGTH = 12;
var UTF8 = 'utf8';
var HEX = 'hex';
function encrypt(text) {
    var iv = crypto_1.default.randomBytes(IV_LENGTH);
    var cipher = crypto_1.default.createCipheriv(algorithm, ENCRYPTION_KEY, iv);
    var encrypted = cipher.update(text, UTF8, HEX);
    encrypted += cipher.final(HEX);
    var authTag = cipher.getAuthTag();
    return "".concat(iv.toString(HEX), ":").concat(authTag.toString(HEX), ":").concat(encrypted);
}
function decrypt(text) {
    var _a = text.split(':'), ivPart = _a[0], authTagPart = _a[1], encryptedText = _a[2];
    if (!ivPart || !authTagPart || !encryptedText) {
        throw new Error('Invalid text.');
    }
    var iv = Buffer.from(ivPart, HEX);
    var authTag = Buffer.from(authTagPart, HEX);
    var decipher = crypto_1.default.createDecipheriv(algorithm, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    var decrypted = decipher.update(encryptedText, HEX, UTF8);
    decrypted += decipher.final(UTF8);
    return decrypted;
}
