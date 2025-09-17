"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkshopCard = WorkshopCard;
var react_1 = require("@remix-run/react");
var spacer_tsx_1 = require("./spacer.tsx");
var typography_tsx_1 = require("./typography.tsx");
function truncate(text, length) {
    if (!text || text.length <= length) {
        return text;
    }
    return "".concat(text.substr(0, length).trim(), "\u2026");
}
function WorkshopCard(_a) {
    var _b, _c;
    var workshop = _a.workshop, titoEvents = _a.titoEvents;
    var workshopEvents = __spreadArray(__spreadArray([], workshop.events, true), titoEvents, true);
    return (<react_1.Link to={"/workshops/".concat(workshop.slug)} className="focus-ring flex h-full w-full flex-col rounded-lg bg-gray-100 p-12 pr-16 dark:bg-gray-800">
			<typography_tsx_1.H3 as="div" className="flex-none">
				{workshop.title}
			</typography_tsx_1.H3>

			<spacer_tsx_1.Spacer size="2xs"/>

			{workshop.categories.length ? (<div className="flex flex-none flex-wrap gap-2">
					{workshop.categories.map(function (c) { return (<div key={c} className="mb-4 inline-block rounded-full bg-white px-8 py-4 text-lg text-black dark:bg-gray-600 dark:text-white">
							{c}
						</div>); })}
				</div>) : null}

			<div className="flex-auto">
				<typography_tsx_1.Paragraph className="line-clamp-3">
					{/*
We do use css line-clamp, this is for the 10% of the browsers that
don't support that. Don't focus too much at perfection. It's important
that the truncated string remains longer than the line-clamp, so that
line-clamp precedes for the 90% supporting that.
*/}
					{truncate(workshop.description, 120)}
				</typography_tsx_1.Paragraph>
			</div>

			<spacer_tsx_1.Spacer size="2xs"/>

			<typography_tsx_1.H6 as="div" className="flex flex-wrap items-center gap-2">
				{workshopEvents.length ? (<>
						<div className="block h-3 w-3 flex-none rounded-full bg-green-600" title="Open for registration"/>
						{workshopEvents.length === 1
                ? [(_b = workshopEvents[0]) === null || _b === void 0 ? void 0 : _b.date, (_c = workshopEvents[0]) === null || _c === void 0 ? void 0 : _c.location]
                    .filter(Boolean)
                    .join(' | ')
                : 'Multiple events scheduled'}
					</>) : ('Not currently scheduled')}
			</typography_tsx_1.H6>
		</react_1.Link>);
}
