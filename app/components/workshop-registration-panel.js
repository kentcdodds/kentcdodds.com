"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistrationPanel = RegistrationPanel;
var date_fns_1 = require("date-fns");
var button_tsx_1 = require("./button.tsx");
var typography_tsx_1 = require("./typography.tsx");
function RegistrationPanel(_a) {
    var workshopEvent = _a.workshopEvent;
    var discounts = workshopEvent.type === 'tito'
        ? Object.entries(workshopEvent.discounts).filter(function (_a) {
            var discount = _a[1];
            return (0, date_fns_1.isFuture)((0, date_fns_1.parseISO)(discount.ends));
        })
        : [];
    var hasDiscounts = discounts.length > 0;
    return (<div id="register" className="bg-secondary flex w-full flex-col items-stretch rounded-lg px-10 pb-10 pt-12 lg:flex-row-reverse lg:items-center lg:justify-end lg:py-8">
			<div className="mb-10 lg:mb-0 lg:ml-16">
				<div className="mb-10 inline-flex items-baseline lg:mb-2">
					<div className="block h-3 w-3 flex-none rounded-full bg-green-600"/>
					{workshopEvent.quantity ? (<typography_tsx_1.H6 as="p" className="pl-4">
							{workshopEvent.remaining === undefined
                ? "Only ".concat(workshopEvent.quantity, " spots total")
                : workshopEvent.remaining === 0
                    ? 'Sold out'
                    : "".concat(workshopEvent.remaining, " of ").concat(workshopEvent.quantity, " spots left")}
						</typography_tsx_1.H6>) : null}
				</div>
				<h5 className="text-2xl font-medium text-black dark:text-white">
					{workshopEvent.title}
				</h5>
				{workshopEvent.location ? (<p className="text-secondary inline-block">
						Location: {workshopEvent.location}
					</p>) : null}
				<div className="flex flex-wrap gap-2">
					<p className="text-secondary inline-block">{workshopEvent.date}</p>
					<span>{hasDiscounts ? ' | ' : null}</span>
					{hasDiscounts ? (<div>
							<p className="text-secondary inline-block">Grab a discount:</p>
							<div className="ml-1 inline-block">
								<ul className="flex list-none gap-2">
									{discounts.map(function (_a) {
                var code = _a[0], discount = _a[1];
                return (<li key={code} className="inline-block">
											<a href={discount.url} className="underlined">
												{code}
											</a>
										</li>);
            })}
								</ul>
							</div>
						</div>) : null}
				</div>
			</div>
			{/* note: this heading doesn't scale on narrow screens */}

			<button_tsx_1.ButtonLink href={workshopEvent.url} className="flex-none">
				Register here
			</button_tsx_1.ButtonLink>
		</div>);
}
