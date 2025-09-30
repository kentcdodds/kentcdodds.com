"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
exports.loader = loader;
exports.default = TalksScreen;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var clsx_1 = require("clsx");
var React = require("react");
var grid_tsx_1 = require("#app/components/grid.tsx");
var icons_tsx_1 = require("#app/components/icons.tsx");
var course_section_tsx_1 = require("#app/components/sections/course-section.tsx");
var hero_section_tsx_1 = require("#app/components/sections/hero-section.tsx");
var tag_tsx_1 = require("#app/components/tag.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var images_tsx_1 = require("#app/images.tsx");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var seo_ts_1 = require("#app/utils/seo.ts");
var talks_server_ts_1 = require("#app/utils/talks.server.ts");
var meta = function (_a) {
    var _b;
    var data = _a.data, matches = _a.matches;
    var _c = data !== null && data !== void 0 ? data : {}, _d = _c.talks, talks = _d === void 0 ? [] : _d, _e = _c.tags, tags = _e === void 0 ? [] : _e;
    var requestInfo = (_b = matches.find(function (m) { return m.id === 'root'; })) === null || _b === void 0 ? void 0 : _b.data.requestInfo;
    var talkCount = talks.length;
    var deliveryCount = talks.flatMap(function (t) { return t.deliveries; }).length;
    var title = "".concat(talkCount, " talks by Kent all about software development");
    var topicsList = (0, misc_tsx_1.listify)(tags.slice(0, 6));
    return (0, seo_ts_1.getSocialMetas)({
        title: title,
        description: "Check out Kent's ".concat(talkCount, " talks he's delivered ").concat(deliveryCount, " times. Topics include: ").concat(topicsList),
        url: (0, misc_tsx_1.getUrl)(requestInfo),
        image: (0, images_tsx_1.getGenericSocialImage)({
            url: (0, misc_tsx_1.getDisplayUrl)(requestInfo),
            featuredImage: images_tsx_1.images.teslaY.id,
            words: title,
        }),
    });
};
exports.meta = meta;
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var talksAndTags;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, talks_server_ts_1.getTalksAndTags)({ request: request })];
                case 1:
                    talksAndTags = _c.sent();
                    return [2 /*return*/, (0, node_1.json)(talksAndTags, {
                            headers: {
                                'Cache-Control': 'public, max-age=3600',
                                Vary: 'Cookie',
                            },
                        })];
            }
        });
    });
}
exports.headers = misc_tsx_1.reuseUsefulLoaderHeaders;
function Card(_a) {
    var tag = _a.tag, tags = _a.tags, title = _a.title, slug = _a.slug, deliveries = _a.deliveries, descriptionHTML = _a.descriptionHTML, resourceHTMLs = _a.resourceHTMLs, active = _a.active;
    var latestDelivery = deliveries
        .filter(function (x) { return x.date; })
        .sort(function (l, r) { return (0, misc_tsx_1.parseDate)(r.date).getTime() - (0, misc_tsx_1.parseDate)(l.date).getTime(); })[0];
    var isInFuture = (latestDelivery === null || latestDelivery === void 0 ? void 0 : latestDelivery.date)
        ? (0, misc_tsx_1.parseDate)(latestDelivery.date).getTime() > Date.now()
        : true;
    return (<div className={(0, clsx_1.clsx)('relative flex h-full w-full flex-col rounded-lg bg-gray-100 p-6 dark:bg-gray-800 md:p-16', {
            'focus-ring ring-2': active,
        })}>
			{/* place the scroll marker a bit above the element to act as view margin */}
			<div data-talk={slug} className="absolute -top-8"/>

			<div className="mb-8 flex flex-none flex-col justify-between md:flex-row">
				<div className="inline-flex items-baseline">
					{isInFuture ? (<div className="block h-3 w-3 flex-none rounded-full bg-green-600"/>) : (<div className="block h-3 w-3 flex-none rounded-full bg-gray-400 dark:bg-gray-600"/>)}
					{latestDelivery ? (<typography_tsx_1.H6 as="p" className="pl-4">
							{latestDelivery.dateDisplay}
						</typography_tsx_1.H6>) : null}
				</div>

				<div className="mt-8 flex space-x-2 md:mt-0">
					{tag ? (<div className="-my-4 -mr-8 inline-block self-start whitespace-nowrap rounded-full bg-white px-8 py-4 text-lg text-black dark:bg-gray-600 dark:text-white">
							{tag}
						</div>) : null}
				</div>
			</div>

			<react_1.Link to={"./".concat(slug)} className="mb-4 flex h-48 flex-none items-end">
				<typography_tsx_1.H3 as="div">{title}</typography_tsx_1.H3>
			</react_1.Link>

			<div className="mb-10 flex-auto">
				<typography_tsx_1.Paragraph as="div" className="html mb-20" dangerouslySetInnerHTML={{ __html: descriptionHTML || '&nbsp;' }}/>

				{tags.length ? (<>
						<typography_tsx_1.H6 as="div" className="mb-2 mt-10">
							Keywords
						</typography_tsx_1.H6>
						<typography_tsx_1.Paragraph className="flex">{tags.join(', ')}</typography_tsx_1.Paragraph>
					</>) : null}

				{deliveries.length ? (<>
						<typography_tsx_1.H6 as="div" className="mb-2 mt-10">
							Presentations
						</typography_tsx_1.H6>
						<ul className="space-y-1">
							{deliveries.map(function (delivery, index) {
                var _a;
                return (<li key={index}>
									<div className="flex w-full items-center gap-2">
										{delivery.date &&
                        (0, misc_tsx_1.parseDate)(delivery.date).getTime() > Date.now() ? (<div className="block h-2 w-2 flex-none animate-pulse rounded-full bg-green-600"/>) : null}
										<typography_tsx_1.Paragraph as="div" className="html" prose={true} dangerouslySetInnerHTML={{
                        __html: (_a = delivery.eventHTML) !== null && _a !== void 0 ? _a : '',
                    }}/>

										{delivery.recording ? (<a className="text-secondary ml-2 flex-none hover:text-team-current" href={delivery.recording}>
												<icons_tsx_1.YoutubeIcon size={32}/>
											</a>) : null}

										<div className="flex-auto"/>
										<typography_tsx_1.Paragraph className="ml-2 flex-none tabular-nums" as="span">
											{delivery.date
                        ? (0, misc_tsx_1.formatDate)(delivery.date, 'yyyy-MM-dd')
                        : null}
										</typography_tsx_1.Paragraph>
									</div>
								</li>);
            })}
						</ul>
					</>) : null}

				{resourceHTMLs.length ? (<>
						<typography_tsx_1.H6 className="mb-2 mt-10" as="div">
							Resources
						</typography_tsx_1.H6>
						<ul className="space-y-1">
							{resourceHTMLs.map(function (resource) { return (<li key={resource}>
									<typography_tsx_1.Paragraph as="div" className="html" prose={false} dangerouslySetInnerHTML={{ __html: resource }}/>
								</li>); })}
						</ul>
					</>) : null}
			</div>
		</div>);
}
function TalksScreen() {
    var data = (0, react_1.useLoaderData)();
    var pathname = (0, react_1.useLocation)().pathname;
    var activeSlug = pathname.split('/').slice(-1)[0];
    // An effect to scroll to the talk's position when opening a direct link,
    // use a ref so that it doesn't hijack scroll when the user is browsing talks
    React.useEffect(function () {
        var _a;
        (_a = document.querySelector("[data-talk=\"".concat(activeSlug, "\"]"))) === null || _a === void 0 ? void 0 : _a.scrollIntoView();
    }, [activeSlug]);
    // this bit is very similar to what's on the blogs page.
    // Next time we need to do work in here, let's make an abstraction for them
    var searchParams = (0, react_1.useSearchParams)()[0];
    var _a = React.useState(function () {
        var _a;
        return (_a = searchParams.get('q')) !== null && _a !== void 0 ? _a : '';
    }), queryValue = _a[0], setQuery = _a[1];
    var talks = queryValue
        ? data.talks.filter(function (talk) {
            return queryValue.split(',').every(function (tag) { return talk.tags.includes(tag); });
        })
        : data.talks;
    var visibleTags = new Set(talks.flatMap(function (x) { return x.tags; }));
    function toggleTag(tag) {
        setQuery(function (q) {
            var existing = q
                .split(',')
                .map(function (x) { return x.trim(); })
                .filter(Boolean);
            var newQuery = existing.includes(tag)
                ? existing.filter(function (t) { return t !== tag; })
                : __spreadArray(__spreadArray([], existing, true), [tag], false);
            return newQuery.join(',');
        });
    }
    (0, misc_tsx_1.useUpdateQueryStringValueWithoutNavigation)('q', queryValue);
    return (<>
			<hero_section_tsx_1.HeroSection title="Check out these talks." subtitle={<>
						Mostly on{' '}
						<a href="https://kcd.im/map" className="underline">
							location
						</a>
						, sometimes remote.
					</>} imageBuilder={images_tsx_1.images.teslaY} imageSize="large"/>

			<grid_tsx_1.Grid className="mb-14">
				<typography_tsx_1.H6 as="div" className="col-span-full mb-6">
					Search talks by topics
				</typography_tsx_1.H6>
				<div className="col-span-full -mb-4 -mr-4 flex flex-wrap lg:col-span-10">
					{data.tags.map(function (tag) { return (<tag_tsx_1.Tag key={tag} tag={tag} selected={queryValue.includes(tag)} onClick={function () { return toggleTag(tag); }} disabled={Boolean(!visibleTags.has(tag) && !queryValue.includes(tag))}/>); })}
				</div>
			</grid_tsx_1.Grid>

			<grid_tsx_1.Grid className="mb-64">
				<typography_tsx_1.H6 as="h2" className="col-span-full mb-6">
					{queryValue
            ? talks.length === 1
                ? "1 talk found"
                : "".concat(talks.length, " talks found")
            : 'Showing all talks'}
				</typography_tsx_1.H6>

				<div className="col-span-full">
					<grid_tsx_1.Grid nested rowGap>
						{talks.map(function (talk) {
            return (<div key={talk.slug} className="col-span-full lg:col-span-6">
									<Card active={activeSlug === talk.slug} {...talk}/>
								</div>);
        })}
					</grid_tsx_1.Grid>
				</div>
			</grid_tsx_1.Grid>

			<course_section_tsx_1.CourseSection />
		</>);
}
