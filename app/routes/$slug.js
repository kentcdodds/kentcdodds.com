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
exports.meta = exports.headers = exports.handle = void 0;
exports.loader = loader;
exports.default = MdxScreen;
exports.ErrorBoundary = ErrorBoundary;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var React = require("react");
var vite_env_only_1 = require("vite-env-only");
var arrow_button_tsx_1 = require("#app/components/arrow-button.tsx");
var blurrable_image_tsx_1 = require("#app/components/blurrable-image.tsx");
var error_boundary_1 = require("#app/components/error-boundary");
var errors_tsx_1 = require("#app/components/errors.tsx");
var grid_tsx_1 = require("#app/components/grid.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var images_tsx_1 = require("#app/images.tsx");
var other_routes_server_ts_1 = require("#app/other-routes.server.ts");
var blog_server_ts_1 = require("#app/utils/blog.server.ts");
var mdx_server_1 = require("#app/utils/mdx.server");
var mdx_tsx_1 = require("#app/utils/mdx.tsx");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var timing_server_ts_1 = require("#app/utils/timing.server.ts");
exports.handle = {
    getSitemapEntries: (0, vite_env_only_1.serverOnly$)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
        var pages;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, mdx_server_1.getMdxPagesInDirectory)('pages', { request: request })];
                case 1:
                    pages = _a.sent();
                    return [2 /*return*/, pages
                            .filter(function (page) { return !page.frontmatter.draft; })
                            .map(function (page) {
                            return { route: "/".concat(page.slug), priority: 0.6 };
                        })];
            }
        });
    }); }),
};
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var timings, page, headers, blogRecommendations;
        var params = _b.params, request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    (0, misc_tsx_1.requireValidSlug)(params.slug);
                    // because this is our catch-all thing, we'll do an early return for anything
                    // that has a other route setup. The response will be handled there.
                    if (other_routes_server_ts_1.pathedRoutes[new URL(request.url).pathname]) {
                        throw new Response('Use other route', { status: 404 });
                    }
                    timings = {};
                    return [4 /*yield*/, (0, mdx_server_1.getMdxPage)({ contentDir: 'pages', slug: params.slug }, { request: request, timings: timings }).catch(function () { return null; })];
                case 1:
                    page = _c.sent();
                    headers = {
                        'Cache-Control': 'private, max-age=3600',
                        Vary: 'Cookie',
                        'Server-Timing': (0, timing_server_ts_1.getServerTimeHeader)(timings),
                    };
                    if (!!page) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, blog_server_ts_1.getBlogRecommendations)({
                            request: request,
                            timings: timings,
                        })];
                case 2:
                    blogRecommendations = _c.sent();
                    throw (0, node_1.json)({ blogRecommendations: blogRecommendations }, { status: 404, headers: headers });
                case 3: return [2 /*return*/, (0, node_1.json)({ page: page }, { status: 200, headers: headers })];
            }
        });
    });
}
exports.headers = misc_tsx_1.reuseUsefulLoaderHeaders;
exports.meta = mdx_tsx_1.mdxPageMeta;
function MdxScreen() {
    var data = (0, react_1.useLoaderData)();
    var _a = data.page, code = _a.code, frontmatter = _a.frontmatter;
    var isDraft = Boolean(frontmatter.draft);
    var isArchived = Boolean(frontmatter.archived);
    var Component = (0, mdx_tsx_1.useMdxComponent)(code);
    return (<>
			<grid_tsx_1.Grid className="mb-10 mt-24 lg:mb-24">
				<div className="col-span-full flex justify-between lg:col-span-8 lg:col-start-3">
					<arrow_button_tsx_1.BackLink to="/">Back to home</arrow_button_tsx_1.BackLink>
				</div>
			</grid_tsx_1.Grid>

			<grid_tsx_1.Grid as="header" className="mb-12">
				<div className="col-span-full lg:col-span-8 lg:col-start-3">
					{isDraft ? (<div className="prose prose-light mb-6 max-w-full dark:prose-dark">
							{React.createElement('callout-warning', {}, "This blog post is a draft. Please don't share it in its current state.")}
						</div>) : null}
					{isArchived ? (<div className="prose prose-light mb-6 max-w-full dark:prose-dark">
							{React.createElement('callout-warning', {}, "This blog post is archived. It's no longer maintained and may contain outdated information.")}
						</div>) : null}
					<typography_tsx_1.H2>{frontmatter.title}</typography_tsx_1.H2>
					{frontmatter.description ? (<typography_tsx_1.H6 as="p" variant="secondary" className="mt-2">
							{frontmatter.description}
						</typography_tsx_1.H6>) : null}
				</div>
				{frontmatter.bannerCloudinaryId ? (<div className="col-span-full mt-10 lg:col-span-10 lg:col-start-2 lg:mt-16">
						<blurrable_image_tsx_1.BlurrableImage key={frontmatter.bannerCloudinaryId} blurDataUrl={frontmatter.bannerBlurDataUrl} className="md:aspect-1 aspect-[3/4] md:aspect-[3/2]" img={<img title={(0, mdx_tsx_1.getBannerTitleProp)(frontmatter)} {...(0, images_tsx_1.getImgProps)((0, images_tsx_1.getImageBuilder)(frontmatter.bannerCloudinaryId, (0, mdx_tsx_1.getBannerAltProp)(frontmatter)), {
                className: 'rounded-lg object-cover object-center w-full',
                widths: [280, 560, 840, 1100, 1650, 2500, 2100, 3100],
                sizes: [
                    '(max-width:1023px) 80vw',
                    '(min-width:1024px) and (max-width:1620px) 67vw',
                    '1100px',
                ],
                transformations: {
                    background: 'rgb:e6e9ee',
                },
            })}/>}/>
					</div>) : null}
			</grid_tsx_1.Grid>

			<grid_tsx_1.Grid as="main" className="prose prose-light dark:prose-dark">
				<Component />
			</grid_tsx_1.Grid>
		</>);
}
function ErrorBoundary() {
    return (<error_boundary_1.GeneralErrorBoundary statusHandlers={{
            400: function (_a) {
                var error = _a.error;
                return <errors_tsx_1.FourHundred error={error.data}/>;
            },
            404: function (_a) {
                var error = _a.error;
                return (<errors_tsx_1.FourOhFour articles={error.data.recommendations}/>);
            },
        }}/>);
}
