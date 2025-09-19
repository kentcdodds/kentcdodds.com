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
exports.sendEmail = sendEmail;
exports.sendMagicLinkEmail = sendMagicLinkEmail;
var images_1 = require("#app/images");
var markdown_server_ts_1 = require("./markdown.server.ts");
var misc_tsx_1 = require("./misc.tsx");
var mailgunDomain = 'mg.example.com';
if (process.env.MAILGUN_DOMAIN) {
    mailgunDomain = process.env.MAILGUN_DOMAIN;
}
else if (process.env.NODE_ENV === 'production') {
    throw new Error('MAILGUN_DOMAIN is required');
}
var mailgunSendingKey = 'example_send_key';
if (process.env.MAILGUN_SENDING_KEY) {
    mailgunSendingKey = process.env.MAILGUN_SENDING_KEY;
}
else if (process.env.NODE_ENV === 'production') {
    throw new Error('MAILGUN_SENDING_KEY is required');
}
function sendEmail(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var auth, body;
        var to = _b.to, from = _b.from, subject = _b.subject, text = _b.text, html = _b.html;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    auth = "".concat(Buffer.from("api:".concat(mailgunSendingKey)).toString('base64'));
                    if (!(html === undefined)) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, markdown_server_ts_1.markdownToHtmlDocument)(text)];
                case 1:
                    html = _c.sent();
                    return [3 /*break*/, 3];
                case 2:
                    if (html === null) {
                        html = text;
                    }
                    _c.label = 3;
                case 3:
                    body = new URLSearchParams({
                        to: to,
                        from: from,
                        subject: subject,
                        text: text,
                        html: html,
                    });
                    return [4 /*yield*/, fetch("https://api.mailgun.net/v3/".concat(mailgunDomain, "/messages"), {
                            method: 'POST',
                            body: body,
                            headers: {
                                Authorization: "Basic ".concat(auth),
                            },
                        })];
                case 4:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function sendMagicLinkEmail(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var sender, hostname, userExists, randomSportyKody, text, html, message;
        var _c;
        var emailAddress = _b.emailAddress, magicLink = _b.magicLink, user = _b.user, domainUrl = _b.domainUrl;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    sender = "\"Kent C. Dodds Team\" <team+kcd@kentcdodds.com>";
                    hostname = new URL(domainUrl).hostname;
                    userExists = Boolean(user);
                    randomSportyKody = (0, images_1.getRandomFlyingKody)(user ? (0, misc_tsx_1.getOptionalTeam)(user.team) : undefined);
                    text = "\nHere's your sign-in link for ".concat(hostname, ":\n\n").concat(magicLink, "\n\n").concat(userExists
                        ? "Welcome back ".concat(emailAddress, "!")
                        : "\nClicking the link above will create a *new* account on ".concat(hostname, " with the email ").concat(emailAddress, ". Welcome!\nIf you'd instead like to change your email address for an existing account, please send an email to team+email-change@kentcdodds.com from the original email address.\n      ").trim(), "\n\nThanks!\n\n\u2013 The KCD Team\n\nP.S. If you did not request this email, you can safely ignore it.\n  ").trim();
                    html = "\n<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\">\n<html>\n  <head>\n    <meta http-equiv=\"Content-Type\" content=\"text/html charset=UTF-8\" />\n    <style type=\"text/css\">\n      @font-face {\n        font-weight: 500;\n        font-style: normal;\n        font-display: swap;\n      }\n\n      @font-face {\n        font-weight: normal;\n        font-style: normal;\n        font-display: swap;\n      }\n    </style>\n  </head>\n  <body style=\"font-family:ui-sans-serif, sans-serif;\">\n    <div style=\"margin: 0 auto; max-width: 450px;\">\n\n      <h2 style=\"text-align: center\">".concat(user
                        ? "Hey ".concat(user.firstName, "! Welcome back to ").concat(hostname, "!")
                        : "Hey ".concat(emailAddress, "! Welcome to ").concat(hostname), "</h2>\n\n      <a href=\"").concat(magicLink, "\" style=\"display: block; margin: 0 auto; width: 80%; padding: 1.5rem; background: #A6DEE4; border-radius: 7px; border-width: 0; font-size: 1.1rem; text-align: center; font-family: sans-serif; text-decoration: none; color: black\">\n        ").concat(userExists ? 'Login' : 'Create Account', "\n      </a>\n\n      <br />\n\n      <center><img src=\"https://res.cloudinary.com/kentcdodds-com/image/upload/w_800,q_auto,f_auto/").concat(randomSportyKody.id, "\" style=\"max-width: 80%;").concat(((_c = randomSportyKody.style) === null || _c === void 0 ? void 0 : _c.aspectRatio)
                        ? "aspect-ratio: ".concat(randomSportyKody.style.aspectRatio, ";")
                        : '', "\"></center>\n\n      <h3 style=\"text-align: center\">Click the button above to login to ").concat(hostname, "</h3>\n\n      <div style=\"text-align: center; margin-top: 1rem; font-size: .9rem\">\n        <div style=\"color: grey\">This link is valid for 30 minutes.</div>\n        <a href=\"").concat(domainUrl, "/login\" style=\"margin-top: .4rem; display: block\">Click here to request a new link.</a>\n        <div style=\"color: grey\">Be certain the link opens in the same browser you requested it from.</div>\n      </div>\n        \n      <hr style=\"width: 20%; height: 0px; border: 1px solid lightgrey; margin-top: 2rem; margin-bottom: 2rem\">\n        \n      <div style=\"text-align: center; color: grey; font-size: .8rem; line-height: 1.2rem\">\n        You received this because your email address was used to sign up for an account on\n        <a href=\"").concat(domainUrl, "\" style=\"color: grey\">").concat(hostname, "</a>. If you didn't sign up for an account,\n        feel free to disregard this email.\n      </div>\n    </div>\n  </body>\n</html>\n  ");
                    message = {
                        from: sender,
                        to: emailAddress,
                        subject: "Here's your Magic \u2728 sign-in link for kentcdodds.com",
                        text: text,
                        html: html,
                    };
                    return [4 /*yield*/, sendEmail(message)];
                case 1:
                    _d.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/*
eslint
  max-statements: "off",
*/
