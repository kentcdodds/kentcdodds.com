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
exports.headers = exports.meta = void 0;
var react_1 = require("@remix-run/react");
var React = require("react");
var grid_tsx_1 = require("#app/components/grid.tsx");
var course_section_tsx_1 = require("#app/components/sections/course-section.tsx");
var hero_section_tsx_1 = require("#app/components/sections/hero-section.tsx");
var spacer_tsx_1 = require("#app/components/spacer.tsx");
var tag_tsx_1 = require("#app/components/tag.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var workshop_card_tsx_1 = require("#app/components/workshop-card.tsx");
var workshop_registration_panel_tsx_1 = require("#app/components/workshop-registration-panel.tsx");
var images_tsx_1 = require("#app/images.tsx");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var seo_ts_1 = require("#app/utils/seo.ts");
var _workshops_tsx_1 = require("./_workshops.tsx");
var meta = function (_a) {
    var _b, _c;
    var matches = _a.matches;
    var requestInfo = ((_b = matches.find(function (m) { return m.id === 'root'; })) === null || _b === void 0 ? void 0 : _b.data).requestInfo;
    var data = (_c = matches.find(function (m) { return m.id === 'routes/workshops+/_workshops'; })) === null || _c === void 0 ? void 0 : _c.data;
    var tagsSet = new Set();
    for (var _i = 0, _d = data.workshops; _i < _d.length; _i++) {
        var workshop = _d[_i];
        for (var _e = 0, _f = workshop.categories; _e < _f.length; _e++) {
            var category = _f[_e];
            tagsSet.add(category);
        }
    }
    return (0, seo_ts_1.getSocialMetas)({
        title: 'Workshops with Kent C. Dodds',
        description: "Get really good at making software with Kent C. Dodds' ".concat(data.workshops.length, " workshops on ").concat((0, misc_tsx_1.listify)(__spreadArray([], tagsSet, true))),
        keywords: Array.from(tagsSet).join(', '),
        url: (0, misc_tsx_1.getUrl)(requestInfo),
        image: (0, images_tsx_1.getSocialImageWithPreTitle)({
            url: (0, misc_tsx_1.getDisplayUrl)(requestInfo),
            featuredImage: 'kent/kent-workshopping-at-underbelly',
            preTitle: 'Check out these workshops',
            title: "Live and remote React, TypeScript, and Testing workshops with instructor Kent C. Dodds",
        }),
    });
};
exports.meta = meta;
var headers = function (_a) {
    var parentHeaders = _a.parentHeaders;
    return parentHeaders;
};
exports.headers = headers;
function WorkshopsHome() {
    var data = (0, _workshops_tsx_1.useWorkshopsData)();
    var tagsSet = new Set();
    for (var _i = 0, _a = data.workshops; _i < _a.length; _i++) {
        var workshop = _a[_i];
        for (var _b = 0, _c = workshop.categories; _b < _c.length; _b++) {
            var category = _c[_b];
            tagsSet.add(category);
        }
    }
    // this bit is very similar to what's on the blogs page.
    // Next time we need to do work in here, let's make an abstraction for them
    var tags = Array.from(tagsSet);
    var searchParams = (0, react_1.useSearchParams)()[0];
    var _d = React.useState(function () {
        var _a;
        return (_a = searchParams.get('q')) !== null && _a !== void 0 ? _a : '';
    }), queryValue = _d[0], setQuery = _d[1];
    var workshops = queryValue
        ? data.workshops.filter(function (workshop) {
            return queryValue.split(' ').every(function (tag) { return workshop.categories.includes(tag); });
        })
        : data.workshops;
    var visibleTags = queryValue
        ? new Set(workshops.flatMap(function (workshop) { return workshop.categories; }).filter(Boolean))
        : new Set(tags);
    function toggleTag(tag) {
        setQuery(function (q) {
            // create a regexp so that we can replace multiple occurrences (`react node react`)
            var expression = new RegExp(tag, 'ig');
            var newQuery = expression.test(q)
                ? q.replace(expression, '')
                : "".concat(q, " ").concat(tag);
            // trim and remove subsequent spaces (`react   node ` => `react node`)
            return newQuery.replace(/\s+/g, ' ').trim();
        });
    }
    (0, misc_tsx_1.useUpdateQueryStringValueWithoutNavigation)('q', queryValue);
    var workshopEvents = __spreadArray(__spreadArray([], workshops.flatMap(function (w) { return w.events; }), true), data.workshopEvents, true);
    return (<>
			<hero_section_tsx_1.HeroSection title="Check out these remote workshops." subtitle="See our upcoming events below." imageBuilder={images_tsx_1.images.teslaY} imageSize="large"/>

			{workshopEvents.length ? (<grid_tsx_1.Grid>
					<typography_tsx_1.H3 className="col-span-full">Currently Scheduled Workshops</typography_tsx_1.H3>
					<div className="col-span-full mt-6">
						{workshopEvents.map(function (workshopEvent, index) { return (<React.Fragment key={index}>
								<workshop_registration_panel_tsx_1.RegistrationPanel workshopEvent={workshopEvent}/>
								{index === workshopEvents.length - 1 ? null : (<spacer_tsx_1.Spacer size="2xs"/>)}
							</React.Fragment>); })}
					</div>
				</grid_tsx_1.Grid>) : null}

			<spacer_tsx_1.Spacer size="base"/>

			<grid_tsx_1.Grid className="mb-14">
				<div className="col-span-full flex flex-wrap gap-4 lg:col-span-10">
					{tags.map(function (tag) { return (<tag_tsx_1.Tag key={tag} tag={tag} selected={queryValue.includes(tag)} onClick={function () { return toggleTag(tag); }} disabled={Boolean(!visibleTags.has(tag) && !queryValue.includes(tag))}/>); })}
				</div>
			</grid_tsx_1.Grid>

			<grid_tsx_1.Grid className="mb-64">
				<typography_tsx_1.H6 as="h2" className="col-span-full mb-6">
					{queryValue
            ? workshops.length === 1
                ? "1 workshop found"
                : "".concat(workshops.length, " workshops found")
            : 'Showing all workshops'}
				</typography_tsx_1.H6>

				<div className="col-span-full">
					<grid_tsx_1.Grid nested rowGap>
						{workshops
            .sort(function (a, z) {
            return workshopHasEvents(a, data.workshopEvents)
                ? workshopHasEvents(z, data.workshopEvents)
                    ? 0
                    : -1
                : 1;
        })
            .map(function (workshop, idx) { return (<div key={idx} className="col-span-full md:col-span-4">
									<workshop_card_tsx_1.WorkshopCard workshop={workshop} titoEvents={data.workshopEvents.filter(function (e) { return e.metadata.workshopSlug === workshop.slug; })}/>
								</div>); })}
					</grid_tsx_1.Grid>
				</div>
			</grid_tsx_1.Grid>

			<course_section_tsx_1.CourseSection />
		</>);
}
function workshopHasEvents(workshop, titoEvents) {
    return Boolean(workshop.events.length ||
        titoEvents.filter(function (e) { return e.metadata.workshopSlug === workshop.slug; })
            .length);
}
exports.default = WorkshopsHome;
