"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeaderSection = HeaderSection;
var clsx_1 = require("clsx");
var arrow_button_tsx_1 = require("../arrow-button.tsx");
var grid_tsx_1 = require("../grid.tsx");
var typography_tsx_1 = require("../typography.tsx");
function HeaderSection(_a) {
    var ctaUrl = _a.ctaUrl, cta = _a.cta, title = _a.title, subTitle = _a.subTitle, className = _a.className, as = _a.as;
    return (<grid_tsx_1.Grid as={as}>
			<div className={(0, clsx_1.clsx)('col-span-full flex flex-col space-y-10 lg:flex-row lg:items-end lg:justify-between lg:space-y-0', className)}>
				<div className="space-y-2 lg:space-y-0">
					<typography_tsx_1.H2>{title}</typography_tsx_1.H2>
					<typography_tsx_1.H2 variant="secondary" as="p">
						{subTitle}
					</typography_tsx_1.H2>
				</div>

				{cta && ctaUrl ? (<arrow_button_tsx_1.ArrowLink to={ctaUrl} direction="right">
						{cta}
					</arrow_button_tsx_1.ArrowLink>) : null}
			</div>
		</grid_tsx_1.Grid>);
}
