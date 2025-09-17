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
exports.loader = loader;
var mdx_server_ts_1 = require("#app/utils/mdx.server.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var posts, blogUrl, rss;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, mdx_server_ts_1.getBlogMdxListItems)({ request: request })];
                case 1:
                    posts = _c.sent();
                    blogUrl = "".concat((0, misc_tsx_1.getDomainUrl)(request), "/blog");
                    rss = "\n    <rss xmlns:blogChannel=\"".concat(blogUrl, "\" version=\"2.0\">\n      <channel>\n        <title>Kent C. Dodds Blog</title>\n        <link>").concat(blogUrl, "</link>\n        <description>The Kent C. Dodds Blog</description>\n        <language>en-us</language>\n        <generator>Kody the Koala</generator>\n        <ttl>40</ttl>\n        ").concat(posts
                        .map(function (post) {
                        var _a, _b, _c;
                        return "\n            <item>\n              <title>".concat(cdata((_a = post.frontmatter.title) !== null && _a !== void 0 ? _a : 'Untitled Post'), "</title>\n              <description>").concat(cdata((_b = post.frontmatter.description) !== null && _b !== void 0 ? _b : 'This post is... indescribable'), "</description>\n              <pubDate>").concat((0, misc_tsx_1.formatDate)((_c = post.frontmatter.date) !== null && _c !== void 0 ? _c : new Date(), 'yyyy-MM-ii'), "</pubDate>\n              <link>").concat(blogUrl, "/").concat(post.slug, "</link>\n              <guid>").concat(blogUrl, "/").concat(post.slug, "</guid>\n            </item>\n          ").trim();
                    })
                        .join('\n'), "\n      </channel>\n    </rss>\n  ").trim();
                    return [2 /*return*/, new Response(rss, {
                            headers: {
                                'Content-Type': 'application/xml',
                                'Content-Length': String(Buffer.byteLength(rss)),
                            },
                        })];
            }
        });
    });
}
function cdata(s) {
    return "<![CDATA[".concat(s, "]]>");
}
