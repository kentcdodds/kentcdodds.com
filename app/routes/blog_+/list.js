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
exports.default = BlogList;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var grid_tsx_1 = require("#app/components/grid.tsx");
var icons_tsx_1 = require("#app/components/icons.tsx");
var hero_section_tsx_1 = require("#app/components/sections/hero-section.tsx");
var spacer_tsx_1 = require("#app/components/spacer.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var images_tsx_1 = require("#app/images.tsx");
var markdown_server_ts_1 = require("#app/utils/markdown.server.ts");
var mdx_server_ts_1 = require("#app/utils/mdx.server.ts");
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var posts;
        var _this = this;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, mdx_server_ts_1.getBlogMdxListItems)({ request: request }).then(function (allPosts) {
                        return Promise.all(allPosts
                            .filter(function (p) { return !p.frontmatter.draft; })
                            .map(function (p) { return __awaiter(_this, void 0, void 0, function () {
                            var _a;
                            var _b, _c;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        _a = {
                                            title: (_b = p.frontmatter.title) !== null && _b !== void 0 ? _b : 'Untitled'
                                        };
                                        return [4 /*yield*/, (0, markdown_server_ts_1.markdownToHtmlUnwrapped)((_c = p.frontmatter.description) !== null && _c !== void 0 ? _c : 'No description')];
                                    case 1: return [2 /*return*/, (_a.descriptionHTML = _d.sent(),
                                            _a.slug = p.slug,
                                            _a)];
                                }
                            });
                        }); }));
                    })];
                case 1:
                    posts = _c.sent();
                    return [2 /*return*/, (0, node_1.json)({ posts: posts }, {
                            headers: {
                                'Cache-Control': 'private, max-age=3600',
                                Vary: 'Cookie',
                            },
                        })];
            }
        });
    });
}
function BlogList() {
    var data = (0, react_1.useLoaderData)();
    return (<div>
			<hero_section_tsx_1.HeroSection title="Blog post list" subtitle={<>
						<span>{"For folks wanting something a bit more scrollable."}</span>
						<react_1.Link reloadDocument to="/blog/rss.xml" className="text-secondary underlined ml-2 inline-block hover:text-team-current focus:text-team-current">
							<icons_tsx_1.RssIcon title="Get my blog as RSS"/>
						</react_1.Link>
					</>} arrowUrl="#posts" arrowLabel={"".concat(data.posts.length, " Total Posts")} imageBuilder={images_tsx_1.images.skis}/>
			<grid_tsx_1.Grid as="main">
				<div className="col-span-full" id="posts">
					<typography_tsx_1.H3>Posts</typography_tsx_1.H3>
					<spacer_tsx_1.Spacer size="2xs"/>
					<div>
						<ul className="list-inside list-disc">
							{data.posts.map(function (post) { return (<li key={post.slug} className="leading-loose">
									<react_1.Link to={"/blog/".concat(post.slug)} className="text-xl">
										{post.title}
									</react_1.Link>{' '}
									<span className="text-secondary" dangerouslySetInnerHTML={{ __html: post.descriptionHTML }}/>
								</li>); })}
						</ul>
						<spacer_tsx_1.Spacer size="3xs"/>
					</div>
				</div>
			</grid_tsx_1.Grid>
		</div>);
}
