"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeaturedSection = FeaturedSection;
var clsx_1 = require("clsx");
var images_tsx_1 = require("#app/images.tsx");
var arrow_button_tsx_1 = require("../arrow-button.tsx");
var blurrable_image_tsx_1 = require("../blurrable-image.tsx");
var clipboard_copy_button_tsx_1 = require("../clipboard-copy-button.tsx");
var grid_tsx_1 = require("../grid.tsx");
var typography_tsx_1 = require("../typography.tsx");
function FeaturedSection(_a) {
    var _b;
    var slug = _a.slug, href = _a.href, _c = _a.caption, caption = _c === void 0 ? 'Featured article' : _c, _d = _a.cta, cta = _d === void 0 ? 'Read full article' : _d, imageBuilder = _a.imageBuilder, imageUrl = _a.imageUrl, imageAlt = _a.imageAlt, blurDataUrl = _a.blurDataUrl, _e = _a.title, title = _e === void 0 ? 'Untitled Post' : _e, subTitle = _a.subTitle, permalink = _a.permalink, leadingTeam = _a.leadingTeam;
    var img = imageBuilder ? (<img {...(0, images_tsx_1.getImgProps)(imageBuilder, {
        className: 'rounded-lg object-cover object-center',
        widths: [300, 600, 900, 1700, 2500],
        sizes: [
            '(max-width: 1023px) 80vw',
            '(min-width:1024px) and (max-width:1620px) 25vw',
            '410px',
        ],
        transformations: { background: 'rgb:e6e9ee' },
    })}/>) : (<img className="rounded-lg object-cover object-center" src={imageUrl} alt={imageAlt}/>);
    return (<div className={(0, clsx_1.clsx)('w-full px-8 lg:px-0', leadingTeam
            ? "set-color-team-current-".concat(leadingTeam.toLowerCase())
            : null)}>
			<div className="rounded-lg bg-gray-100 dark:bg-gray-800 lg:bg-transparent lg:dark:bg-transparent">
				<div className="-mx-8 lg:mx-0">
					<grid_tsx_1.Grid className="group rounded-lg pb-6 pt-14 md:pb-12 lg:bg-gray-100 lg:dark:bg-gray-800">
						<div className="col-span-full lg:col-span-5 lg:col-start-2 lg:flex lg:flex-col lg:justify-between">
							<div>
								<typography_tsx_1.H6 as="h2">{caption}</typography_tsx_1.H6>
								<typography_tsx_1.H2 as="h3" className="mt-12">
									{title}
								</typography_tsx_1.H2>

								<div className="mt-6 text-xl font-medium text-slate-500">
									{subTitle}
								</div>
							</div>

							<div className="mt-12 flex items-center justify-between">
								
								<arrow_button_tsx_1.ArrowLink to={(_b = slug !== null && slug !== void 0 ? slug : href) !== null && _b !== void 0 ? _b : '/'} prefetch="intent">
									{cta}
									<div className="focus-ring absolute inset-0 left-0 right-0 z-10 rounded-lg md:-left-12 md:-right-12 lg:left-0 lg:right-0"/>
								</arrow_button_tsx_1.ArrowLink>
							</div>
						</div>

						<div className="relative col-span-full mt-12 lg:col-span-4 lg:col-start-8">
							{blurDataUrl ? (<blurrable_image_tsx_1.BlurrableImage blurDataUrl={blurDataUrl} img={img} className="aspect-[4/3] lg:aspect-[4/5]"/>) : (<div className="aspect-[4/3] lg:aspect-[4/5]">{img}</div>)}
							{leadingTeam ? (<div className="absolute left-6 top-6 z-20 h-4 w-4 rounded-full bg-team-current p-1"/>) : null}
							{permalink ? (<clipboard_copy_button_tsx_1.ClipboardCopyButton className="absolute left-6 top-6 z-20" value={permalink}/>) : null}
						</div>
					</grid_tsx_1.Grid>
				</div>
			</div>
		</div>);
}
