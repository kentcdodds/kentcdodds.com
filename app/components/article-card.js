"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArticleCard = ArticleCard;
var react_1 = require("@remix-run/react");
var clsx_1 = require("clsx");
var images_tsx_1 = require("#app/images.tsx");
var mdx_tsx_1 = require("#app/utils/mdx.tsx");
var use_root_data_ts_1 = require("#app/utils/use-root-data.ts");
var blurrable_image_tsx_1 = require("./blurrable-image.tsx");
var clipboard_copy_button_tsx_1 = require("./clipboard-copy-button.tsx");
var kifs_tsx_1 = require("./kifs.tsx");
var typography_tsx_1 = require("./typography.tsx");
function ArticleCard(_a) {
    var _b, _c;
    var leadingTeam = _a.leadingTeam, _d = _a.article, readTime = _d.readTime, dateDisplay = _d.dateDisplay, slug = _d.slug, frontmatter = _d.frontmatter, _e = _d.frontmatter, _f = _e.title, title = _f === void 0 ? 'Untitled Post' : _f, bannerCloudinaryId = _e.bannerCloudinaryId, bannerBlurDataUrl = _e.bannerBlurDataUrl;
    var requestInfo = (0, use_root_data_ts_1.useRootData)().requestInfo;
    var permalink = "".concat(requestInfo.origin, "/blog/").concat(slug);
    return (<div className={(0, clsx_1.clsx)('relative w-full', leadingTeam
            ? "set-color-team-current-".concat(leadingTeam.toLowerCase())
            : null)}>
			<react_1.Link prefetch="intent" className="group peer relative block w-full focus:outline-none" to={"/blog/".concat(slug)}>
				{bannerCloudinaryId ? (<blurrable_image_tsx_1.BlurrableImage key={bannerCloudinaryId} blurDataUrl={bannerBlurDataUrl} className="aspect-[3/4] rounded-lg" img={<img title={(_b = frontmatter.title) !== null && _b !== void 0 ? _b : (0, mdx_tsx_1.getBannerTitleProp)(frontmatter)} {...(0, images_tsx_1.getImgProps)((0, images_tsx_1.getImageBuilder)(bannerCloudinaryId, (0, mdx_tsx_1.getBannerAltProp)(frontmatter)), {
                widths: [280, 560, 840, 1100, 1300, 1650],
                sizes: [
                    '(max-width:639px) 80vw',
                    '(min-width:640px) and (max-width:1023px) 40vw',
                    '(min-width:1024px) and (max-width:1620px) 25vw',
                    '420px',
                ],
                transformations: {
                    background: 'rgb:e6e9ee',
                    resize: {
                        type: 'fill',
                        aspectRatio: '3:4',
                    },
                },
            })} className="focus-ring w-full rounded-lg object-cover object-center transition" loading="lazy"/>}/>) : (<div className="aspect-[3/4]">
						<div className="focus-ring w-full rounded-lg transition">
							<kifs_tsx_1.MissingSomething aspectRatio="3:4"/>
						</div>
					</div>)}

				<div className="mt-8 text-xl font-medium text-gray-500">
					{[dateDisplay, (_c = readTime === null || readTime === void 0 ? void 0 : readTime.text) !== null && _c !== void 0 ? _c : 'quick read']
            .filter(Boolean)
            .join(' — ')}
				</div>
				<typography_tsx_1.H3 as="div" className="mt-4">
					{title}
				</typography_tsx_1.H3>
			</react_1.Link>

			{leadingTeam ? (<div className="absolute right-6 top-6 z-10 h-4 w-4 rounded-full bg-team-current p-1 lg:left-6"/>) : null}
			<clipboard_copy_button_tsx_1.ClipboardCopyButton value={permalink} className="absolute left-6 top-6 z-10"/>
		</div>);
}
