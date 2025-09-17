"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestimonialCard = TestimonialCard;
var images_tsx_1 = require("#app/images.tsx");
function TestimonialCard(_a) {
    var testimonial = _a.testimonial, _b = _a.className, className = _b === void 0 ? '' : _b;
    var img = (<img {...(0, images_tsx_1.getImgProps)((0, images_tsx_1.getImageBuilder)(testimonial.cloudinaryId, "".concat(testimonial.author, " profile")), {
        className: 'mr-8 h-16 w-16 flex-none rounded-full object-cover',
        widths: [64, 128, 256],
        sizes: ['4rem'],
        transformations: {
            gravity: 'face:center',
            resize: {
                aspectRatio: '1:1',
                type: 'fill',
            },
        },
    })}/>);
    return (<div className={"bg-secondary col-span-4 flex flex-col justify-between gap-2 rounded-lg p-16 ".concat(className)} id={testimonial.id}>
			<div className="quote-child prose-base mb-6" dangerouslySetInnerHTML={{ __html: testimonial.testimonial }}/>

			<div className="flex items-center gap-2">
				{testimonial.link ? (<a href={testimonial.link} target="_blank" rel="noreferrer">
						{img}
					</a>) : (img)}
				<div>
					<p className="text-primary mb-2 text-lg font-medium leading-none">
						{testimonial.link ? (<a className="underline" href={testimonial.link} target="_blank" rel="noreferrer">
								{testimonial.author}
							</a>) : (testimonial.author)}
					</p>
					<p className="text-secondary text-sm leading-none">
						{testimonial.company}
					</p>
				</div>
			</div>
		</div>);
}
