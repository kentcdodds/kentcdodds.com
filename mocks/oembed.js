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
exports.oembedHandlers = void 0;
var msw_1 = require("msw");
var oembedHandlers = [
    msw_1.http.get('https://oembed.com/providers.json', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, msw_1.HttpResponse.json([
                    {
                        provider_name: 'YouTube',
                        provider_url: 'https://www.youtube.com/',
                        endpoints: [
                            {
                                schemes: [
                                    'https://*.youtube.com/watch*',
                                    'https://*.youtube.com/v/*',
                                    'https://youtu.be/*',
                                    'https://*.youtube.com/playlist?list=*',
                                ],
                                url: 'https://www.youtube.com/oembed',
                                discovery: true,
                            },
                        ],
                    },
                    {
                        provider_name: 'CodeSandbox',
                        provider_url: 'https://codesandbox.io',
                        endpoints: [
                            {
                                schemes: [
                                    'https://codesandbox.io/s/*',
                                    'https://codesandbox.io/embed/*',
                                ],
                                url: 'https://codesandbox.io/oembed',
                            },
                        ],
                    },
                    {
                        provider_name: 'Twitter',
                        provider_url: 'http://www.twitter.com/',
                        endpoints: [
                            {
                                schemes: [
                                    'https://twitter.com/*/status/*',
                                    'https://*.twitter.com/*/status/*',
                                    'https://twitter.com/*/moments/*',
                                    'https://*.twitter.com/*/moments/*',
                                ],
                                url: 'https://publish.twitter.com/oembed',
                            },
                        ],
                    },
                    {
                        provider_name: 'X',
                        provider_url: 'http://www.x.com/',
                        endpoints: [
                            {
                                schemes: [
                                    'https://x.com/*',
                                    'https://x.com/*/status/*',
                                    'https://*.x.com/*/status/*',
                                ],
                                url: 'https://publish.x.com/oembed',
                            },
                        ],
                    },
                ])];
        });
    }); }),
    msw_1.http.get('https://publish.twitter.com/oembed', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, msw_1.HttpResponse.json({
                    html: '<blockquote class="twitter-tweet" data-dnt="true" data-theme="dark"><p lang="en" dir="ltr">I spent a few minutes working on this, just for you all. I promise, it wont disappoint. Though it may surprise 🎉<br><br>🙏 <a href="https://t.co/wgTJYYHOzD">https://t.co/wgTJYYHOzD</a></p>— Kent C. Dodds (@kentcdodds) <a href="https://x.com/kentcdodds/status/783161196945944580?ref_src=twsrc%5Etfw">October 4, 2016</a></blockquote>',
                })];
        });
    }); }),
    msw_1.http.get('https://publish.x.com/oembed', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, msw_1.HttpResponse.json({
                    html: '<blockquote class="twitter-tweet" data-dnt="true" data-theme="dark"><p lang="en" dir="ltr">I spent a few minutes working on this, just for you all. I promise, it wont disappoint. Though it may surprise 🎉<br><br>🙏 <a href="https://t.co/wgTJYYHOzD">https://t.co/wgTJYYHOzD</a></p>— Kent C. Dodds (@kentcdodds) <a href="https://x.com/kentcdodds/status/783161196945944580?ref_src=twsrc%5Etfw">October 4, 2016</a></blockquote>',
                })];
        });
    }); }),
    msw_1.http.get('https://codesandbox.io/oembed', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, msw_1.HttpResponse.json({
                    html: '<iframe width="1000" height="500" src="https://codesandbox.io/embed/ynn88nx9x?view=editor" sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin" style="width: 1000px; height: 500px; border: 0px; border-radius: 4px; overflow: hidden;"></iframe>',
                })];
        });
    }); }),
    msw_1.http.get('https://www.youtube.com/oembed', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, msw_1.HttpResponse.json({
                    html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/dQw4w9WgXcQ?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
                })];
        });
    }); }),
];
exports.oembedHandlers = oembedHandlers;
