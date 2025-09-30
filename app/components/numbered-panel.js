"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NumberedPanel = NumberedPanel;
var typography_tsx_1 = require("./typography.tsx");
function NumberedPanel(_a) {
    var number = _a.number, title = _a.title, titleHTML = _a.titleHTML, description = _a.description, descriptionHTML = _a.descriptionHTML;
    // Note, we can move the counters to pure css if needed, but I'm not sure if it adds anything
    return (<li>
			<typography_tsx_1.H6 as="h3" className="relative mb-6 lg:mb-8">
				<span className="mb-4 block lg:absolute lg:-left-16 lg:mb-0">
					{number.toString().padStart(2, '0')}.
				</span>
				{titleHTML ? (<span dangerouslySetInnerHTML={{ __html: titleHTML }}/>) : (title)}
			</typography_tsx_1.H6>
			{descriptionHTML ? (<typography_tsx_1.Paragraph dangerouslySetInnerHTML={{ __html: descriptionHTML }}/>) : (<typography_tsx_1.Paragraph>{description}</typography_tsx_1.Paragraph>)}
		</li>);
}
