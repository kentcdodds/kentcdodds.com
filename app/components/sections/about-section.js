"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AboutSection = AboutSection;
var images_tsx_1 = require("#app/images.tsx");
var arrow_button_tsx_1 = require("../arrow-button.tsx");
var grid_tsx_1 = require("../grid.tsx");
var typography_tsx_1 = require("../typography.tsx");
function AboutSection() {
    return (<grid_tsx_1.Grid>
			<div className="col-span-full table lg:col-span-6">
				<div className="table-cell text-center align-middle">
					<div>
						<img loading="lazy" {...(0, images_tsx_1.getImgProps)(images_tsx_1.images.kentSnowSports, {
        className: 'rounded-lg object-cover w-full h-full',
        widths: [300, 650, 1300, 1800, 2600],
        sizes: [
            '(max-width: 1023px) 80vw',
            '(min-width:1024px) and (max-width:1620px) 40vw',
            '630px',
        ],
        transformations: {
            resize: {
                type: 'fill',
                aspectRatio: '3:4',
            },
        },
    })}/>
					</div>
				</div>
			</div>

			<div className="col-span-full flex flex-col justify-center lg:col-span-4 lg:col-start-8 lg:mt-0">
				<img {...(0, images_tsx_1.getImgProps)(images_tsx_1.images.snowboard, {
        className: 'mt-20 w-full h-full object-contain self-start lg:mt-0',
        widths: [300, 600, 850, 1600, 2550],
        sizes: ['(min-width:1024px) and (max-width:1620px) 25vw', '410px'],
    })}/>

				<typography_tsx_1.H2 className="mt-12">{"Big extreme sports enthusiast."}</typography_tsx_1.H2>
				<typography_tsx_1.H2 className="mt-2" variant="secondary" as="p">
					{"With a big heart for helping people."}
				</typography_tsx_1.H2>

				<typography_tsx_1.Paragraph className="mt-8">
					{"\n            I'm a JavaScript engineer and teacher and I'm active in the open\n            source community. And I'm also a husband, father, and an extreme\n            sports and sustainability enthusiast.\n          "}
				</typography_tsx_1.Paragraph>

				<arrow_button_tsx_1.ArrowLink to="/about" direction="right" className="mt-14" prefetch="intent">
					Learn more about me
				</arrow_button_tsx_1.ArrowLink>
			</div>
		</grid_tsx_1.Grid>);
}
