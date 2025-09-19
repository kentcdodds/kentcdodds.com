"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeroSection = HeroSection;
exports.getHeroImageProps = getHeroImageProps;
var clsx_1 = require("clsx");
var framer_motion_1 = require("framer-motion");
var images_tsx_1 = require("#app/images.tsx");
var animations_ts_1 = require("#app/utils/animations.ts");
var arrow_button_tsx_1 = require("../arrow-button.tsx");
var grid_tsx_1 = require("../grid.tsx");
var typography_tsx_1 = require("../typography.tsx");
function HeroSection(_a) {
    var _b;
    var action = _a.action, title = _a.title, subtitle = _a.subtitle, arrowUrl = _a.arrowUrl, arrowLabel = _a.arrowLabel, image = _a.image, imageProps = _a.imageProps, imageBuilder = _a.imageBuilder, _c = _a.imageSize, imageSize = _c === void 0 ? 'medium' : _c, _d = _a.as, as = _d === void 0 ? 'header' : _d;
    var hasImage = Boolean((_b = image !== null && image !== void 0 ? image : imageProps) !== null && _b !== void 0 ? _b : imageBuilder);
    var shouldReduceMotion = (0, framer_motion_1.useReducedMotion)();
    var animationStep = 0;
    return (<grid_tsx_1.Grid as={as} className={(0, clsx_1.clsx)('lg: mb-24 h-auto pt-24 lg:min-h-[40rem] lg:pb-12', {
            'lg:mb-64': arrowLabel,
            'lg:mb-0': !arrowLabel,
        })}>
			{hasImage ? (<div className={(0, clsx_1.clsx)('col-span-full mb-12 lg:mb-0', {
                'px-10 lg:col-span-5 lg:col-start-7': imageSize === 'medium',
                'flex items-start justify-end pl-10 lg:col-span-6 lg:col-start-6': imageSize === 'large',
                'flex items-center justify-center lg:col-span-7 lg:col-start-6 lg:-mr-5vw lg:-mt-24 lg:px-0': imageSize === 'giant',
            })}>
					{imageProps ? (<framer_motion_1.motion.img {...imageProps} className={(0, clsx_1.clsx)('h-auto w-full object-contain', {
                    'max-h-50vh': imageSize === 'medium',
                    'max-h-75vh': imageSize === 'giant',
                }, imageProps.className)} initial={{ scale: shouldReduceMotion ? 1 : 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.75 }}/>) : imageBuilder ? (<img {...getHeroImageProps(imageBuilder, {
                className: (0, clsx_1.clsx)('h-auto w-full object-contain motion-safe:animate-hero-image-reveal', {
                    'max-h-50vh': imageSize === 'medium',
                    'max-h-75vh': imageSize === 'giant',
                }),
            })}/>) : (image)}
				</div>) : null}

			<div className={(0, clsx_1.clsx)('col-span-full pt-6 lg:col-start-1 lg:row-start-1 lg:flex lg:h-full lg:flex-col', {
            'lg:col-span-5': hasImage,
            'lg:col-span-7': !hasImage,
        })}>
				<div className="flex flex-auto flex-col">
					<typography_tsx_1.H2 as="h2" className="motion-safe:animate-hero-text-reveal" style={animations_ts_1.heroTextAnimation.getVariables(animationStep++)}>
						{title}
					</typography_tsx_1.H2>
					{subtitle ? (<typography_tsx_1.H2 as="p" variant="secondary" className="mt-3 motion-safe:animate-hero-text-reveal" style={animations_ts_1.heroTextAnimation.getVariables(animationStep++)}>
							{subtitle}
						</typography_tsx_1.H2>) : null}
					{action ? (<div className="mt-14 flex flex-col space-y-4 motion-safe:animate-hero-text-reveal" style={animations_ts_1.heroTextAnimation.getVariables(animationStep++)}>
							{action}
						</div>) : null}
				</div>
				{arrowUrl ? (<div className="hidden pt-12 motion-safe:animate-hero-text-reveal lg:block" style={animations_ts_1.heroTextAnimation.getVariables(animationStep++)}>
						<arrow_button_tsx_1.ArrowLink to={arrowUrl} direction="down" textSize="small">
							{arrowLabel}
						</arrow_button_tsx_1.ArrowLink>
					</div>) : null}
			</div>
		</grid_tsx_1.Grid>);
}
function getHeroImageProps(imageBuilder, _a) {
    var _b = _a === void 0 ? {} : _a, transformations = _b.transformations, style = _b.style, className = _b.className;
    return (0, images_tsx_1.getImgProps)(imageBuilder, {
        style: style,
        className: className,
        widths: [256, 550, 700, 900, 1300, 1800],
        sizes: [
            '(max-width: 1023px) 80vw',
            '(min-width: 1024px) and (max-width: 1279px) 50vw',
            '(min-width: 1280px) 900px',
        ],
        transformations: transformations,
    });
}
