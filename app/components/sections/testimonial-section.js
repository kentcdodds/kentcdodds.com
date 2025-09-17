"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestimonialSection = TestimonialSection;
var react_1 = require("@remix-run/react");
var React = require("react");
var arrow_button_tsx_1 = require("../arrow-button.tsx");
var typography_tsx_1 = require("../typography.tsx");
var testimonial_card_tsx_1 = require("./testimonial-card.tsx");
function TestimonialSection(_a) {
    var testimonials = _a.testimonials, className = _a.className;
    var _b = React.useState(0), page = _b[0], setPage = _b[1];
    if (!testimonials.length)
        return null;
    return (<div className={"".concat(className, " mx-10vw mb-14 grid grid-cols-4 gap-6 lg:grid-cols-8 xl:grid-cols-12")}>
			<div className="col-span-full mb-20 flex flex-col space-y-10 lg:flex-row lg:items-end lg:justify-between lg:space-y-0">
				<div className="space-y-2 lg:space-y-0">
					<typography_tsx_1.H2>{"Don't just take my word for it."}</typography_tsx_1.H2>
					<typography_tsx_1.H2 variant="secondary" as="p">
						What{' '}
						<react_1.Link to="/testimonials" className="underline">
							others
						</react_1.Link>{' '}
						have to say
					</typography_tsx_1.H2>
				</div>

				{testimonials.length > 3 ? (<div className="col-span-2 col-start-11 mb-16 items-end justify-end space-x-3">
						<arrow_button_tsx_1.ArrowButton direction="left" onClick={function () { return setPage(function (p) { return p - 1; }); }}/>
						<arrow_button_tsx_1.ArrowButton direction="right" onClick={function () { return setPage(function (p) { return p + 1; }); }}/>
					</div>) : null}
			</div>

			{Array.from({
            length: testimonials.length > 3 ? 3 : testimonials.length,
        }).map(function (_, index) {
            var testimonialIndex = (page * 3 + index) % testimonials.length;
            var testimonial = testimonials[testimonialIndex];
            if (!testimonial)
                return null;
            return (<testimonial_card_tsx_1.TestimonialCard key={testimonialIndex} testimonial={testimonial} className={index >= 2 ? 'hidden xl:block' : ''}/>);
        })}
		</div>);
}
