"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.meta = exports.headers = exports.handle = void 0;
exports.loader = loader;
exports.default = WorkshopScreen;
exports.ErrorBoundary = ErrorBoundary;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var React = require("react");
var vite_env_only_1 = require("vite-env-only");
var arrow_button_tsx_1 = require("#app/components/arrow-button.tsx");
var button_tsx_1 = require("#app/components/button.tsx");
var error_boundary_tsx_1 = require("#app/components/error-boundary.tsx");
var errors_tsx_1 = require("#app/components/errors.tsx");
var grid_tsx_1 = require("#app/components/grid.tsx");
var numbered_panel_tsx_1 = require("#app/components/numbered-panel.tsx");
var testimonial_section_tsx_1 = require("#app/components/sections/testimonial-section.tsx");
var spacer_tsx_1 = require("#app/components/spacer.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var workshop_card_tsx_1 = require("#app/components/workshop-card.tsx");
var workshop_registration_panel_tsx_1 = require("#app/components/workshop-registration-panel.tsx");
var images_tsx_1 = require("#app/images.tsx");
var form_tsx_1 = require("#app/kit/form.tsx");
var blog_server_ts_1 = require("#app/utils/blog.server.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var seo_ts_1 = require("#app/utils/seo.ts");
var testimonials_server_ts_1 = require("#app/utils/testimonials.server.ts");
var timing_server_ts_1 = require("#app/utils/timing.server.ts");
var workshops_server_ts_1 = require("#app/utils/workshops.server.ts");
var _workshops_tsx_1 = require("./_workshops.tsx");
exports.handle = {
    getSitemapEntries: (0, vite_env_only_1.serverOnly$)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
        var workshops;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, workshops_server_ts_1.getWorkshops)({ request: request })];
                case 1:
                    workshops = _a.sent();
                    return [2 /*return*/, workshops.map(function (workshop) {
                            return {
                                route: "/workshops/".concat(workshop.slug),
                                priority: 0.4,
                            };
                        })];
            }
        });
    }); }),
};
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var timings, _c, workshops, blogRecommendations, workshop, testimonials, headers;
        var params = _b.params, request = _b.request;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    (0, misc_tsx_1.requireValidSlug)(params.slug);
                    timings = {};
                    return [4 /*yield*/, Promise.all([
                            (0, workshops_server_ts_1.getWorkshops)({ request: request, timings: timings }),
                            (0, blog_server_ts_1.getBlogRecommendations)({ request: request, timings: timings }),
                        ])];
                case 1:
                    _c = _d.sent(), workshops = _c[0], blogRecommendations = _c[1];
                    workshop = workshops.find(function (w) { return w.slug === params.slug; });
                    if (!workshop) {
                        throw (0, node_1.json)({ blogRecommendations: blogRecommendations }, { status: 404 });
                    }
                    return [4 /*yield*/, (0, testimonials_server_ts_1.getTestimonials)({
                            request: request,
                            timings: timings,
                            subjects: ["workshop: ".concat(params.slug)],
                            categories: __spreadArray([
                                'workshop'
                            ], workshop.categories, true),
                        })];
                case 2:
                    testimonials = _d.sent();
                    headers = {
                        'Cache-Control': 'private, max-age=3600',
                        Vary: 'Cookie',
                        'Server-Timings': (0, timing_server_ts_1.getServerTimeHeader)(timings),
                    };
                    return [2 /*return*/, (0, node_1.json)({ testimonials: testimonials, blogRecommendations: blogRecommendations }, { status: 200, headers: headers })];
            }
        });
    });
}
exports.headers = misc_tsx_1.reuseUsefulLoaderHeaders;
var meta = function (_a) {
    var _b, _c, _d, _e, _f;
    var matches = _a.matches, params = _a.params;
    var requestInfo = ((_b = matches.find(function (m) { return m.id === 'root'; })) === null || _b === void 0 ? void 0 : _b.data).requestInfo;
    var workshop;
    var workshopsData = (_c = matches.find(function (m) { return m.id === 'routes/workshops+/_workshops'; })) === null || _c === void 0 ? void 0 : _c.data;
    if (Array.isArray(workshopsData === null || workshopsData === void 0 ? void 0 : workshopsData.workshops)) {
        workshop = workshopsData.workshops.find(function (w) { return w.slug === params.slug; });
    }
    return (0, seo_ts_1.getSocialMetas)(__assign(__assign({ title: workshop ? workshop.title : 'Workshop not found', description: workshop ? workshop.description : 'No workshop here :(' }, workshop === null || workshop === void 0 ? void 0 : workshop.meta), { keywords: (_f = (_e = (_d = workshop === null || workshop === void 0 ? void 0 : workshop.meta.keywords) === null || _d === void 0 ? void 0 : _d.join(',')) !== null && _e !== void 0 ? _e : workshop === null || workshop === void 0 ? void 0 : workshop.categories.join(',')) !== null && _f !== void 0 ? _f : '', url: (0, misc_tsx_1.getUrl)(requestInfo), image: (0, images_tsx_1.getSocialImageWithPreTitle)({
            url: (0, misc_tsx_1.getDisplayUrl)(requestInfo),
            featuredImage: 'kent/kent-workshopping-at-underbelly',
            preTitle: 'Check out this workshop',
            title: workshop ? workshop.title : 'Workshop not found',
        }) }));
};
exports.meta = meta;
function TopicRow(_a) {
    var number = _a.number, topicHTML = _a.topicHTML;
    return (<div className="bg-secondary rounded-lg px-10 pb-14 pt-12 lg:py-12 lg:pl-36 lg:pr-56">
			<typography_tsx_1.H5 className="relative">
				<span className="lg:absolute lg:-left-24 lg:block">
					{number.toString().padStart(2, '0')}.
				</span>{' '}
				<div dangerouslySetInnerHTML={{ __html: topicHTML }}/>
			</typography_tsx_1.H5>
		</div>);
}
function restartArray(array, startIndex) {
    var newArray = [];
    for (var i = 0; i < array.length; i++) {
        var value = array[(i + startIndex) % array.length];
        if (value === undefined) {
            console.error('This is unusual...', value, i, array);
            continue;
        }
        newArray.push(value);
    }
    return newArray;
}
function WorkshopScreen() {
    var params = (0, react_1.useParams)();
    var _a = (0, _workshops_tsx_1.useWorkshopsData)(), titoEvents = _a.workshopEvents, workshops = _a.workshops;
    var data = (0, react_1.useLoaderData)();
    var workshop = workshops.find(function (w) { return w.slug === params.slug; });
    if (!workshop) {
        console.error("This should be impossible. There's no workshop even though we rendered the workshop screen...");
        return <div>Oh no... Email Kent</div>;
    }
    var workshopEvents = __spreadArray(__spreadArray([], workshop.events, true), titoEvents.filter(function (e) { return e.metadata.workshopSlug === params.slug; }), true);
    // restartArray allows us to make sure that the same workshops don't always appear in the list
    // without having to do something complicated to get a deterministic selection between server/client.
    var otherWorkshops = restartArray(workshops.filter(function (w) { return w.slug !== workshop.slug; }), workshops.indexOf(workshop));
    var scheduledWorkshops = otherWorkshops.filter(function (w) {
        return titoEvents.some(function (e) { return e.metadata.workshopSlug === w.slug; });
    });
    var similarWorkshops = otherWorkshops.filter(function (w) {
        return w.categories.some(function (c) { return workshop.categories.includes(c); });
    });
    var alternateWorkshops = Array.from(new Set(__spreadArray(__spreadArray(__spreadArray([], scheduledWorkshops, true), similarWorkshops, true), otherWorkshops, true))).slice(0, 3);
    var registerLink = '#sign-up';
    if (workshopEvents.length === 1 && workshopEvents[0]) {
        registerLink = workshopEvents[0].url;
    }
    return (<>
			<grid_tsx_1.Grid as="header" className="mb-24 mt-20 lg:mb-80 lg:mt-24">
				<div className="col-span-full lg:col-span-8">
					<arrow_button_tsx_1.BackLink to="/workshops" className="mb-10 lg:mb-24">
						Back to overview
					</arrow_button_tsx_1.BackLink>
					<typography_tsx_1.H2 className="mb-2">{"Join Kent C. Dodds for \"".concat(workshop.title, "\"")}</typography_tsx_1.H2>

					<typography_tsx_1.H6 as="p" className="lg:mb-22 mb-16">
						{workshopEvents.length
            ? (0, misc_tsx_1.listify)(workshopEvents.map(function (w) { return w.date; }))
            : 'Not currently scheduled'}
					</typography_tsx_1.H6>

					<div id="sign-up">
						{workshopEvents.length ? (workshopEvents.map(function (workshopEvent, index) { return (<React.Fragment key={workshopEvent.date}>
									<workshop_registration_panel_tsx_1.RegistrationPanel workshopEvent={workshopEvent}/>
									{index === workshopEvents.length - 1 ? null : (<spacer_tsx_1.Spacer size="2xs"/>)}
								</React.Fragment>); })) : workshop.kitTag ? (<>
								<typography_tsx_1.H6 as="p" className="mb-0">
									Sign up to be notified when this workshop is scheduled
								</typography_tsx_1.H6>
								<div className="mt-8">
									<form_tsx_1.KitForm formId="workshop-kit" kitTagId={workshop.kitTag}/>
								</div>
							</>) : null}
					</div>
				</div>
				<div className="col-span-1 col-start-12 hidden items-center justify-center lg:flex">
					<arrow_button_tsx_1.ArrowLink to="#problem" direction="down"/>
				</div>
			</grid_tsx_1.Grid>

			<grid_tsx_1.Grid as="main" className="mb-48">
				<div className="col-span-full mb-12 lg:col-span-4 lg:mb-0" id="problem">
					<typography_tsx_1.H6>The problem statement</typography_tsx_1.H6>
				</div>
				<div className="col-span-full mb-8 lg:col-span-8 lg:mb-20">
					<typography_tsx_1.H2 className="mb-8" dangerouslySetInnerHTML={{
            __html: workshop.problemStatementHTMLs.part1,
        }}/>
					<typography_tsx_1.H2 variant="secondary" as="p" dangerouslySetInnerHTML={{
            __html: workshop.problemStatementHTMLs.part2,
        }}/>
				</div>
				<typography_tsx_1.Paragraph className="lg:mb:0 col-span-full mb-4 lg:col-span-4 lg:col-start-5 lg:mr-12" dangerouslySetInnerHTML={{
            __html: workshop.problemStatementHTMLs.part3,
        }}/>
				<typography_tsx_1.Paragraph className="col-span-full lg:col-span-4 lg:col-start-9 lg:mr-12" dangerouslySetInnerHTML={{
            __html: workshop.problemStatementHTMLs.part4,
        }}/>
			</grid_tsx_1.Grid>

			<div className="mb-24 w-full px-5vw lg:mb-48">
				<div className="bg-secondary w-full rounded-lg py-24 lg:pb-40 lg:pt-36">
					<div className="-mx-5vw">
						<grid_tsx_1.Grid>
							<div className="col-span-full mb-40 flex flex-col items-stretch lg:col-span-5 lg:mb-0 lg:items-start">
								<typography_tsx_1.H2 className="mb-8">
									{"At the end of this workshop you'll be able to do all of\n                  these things yourself."}
								</typography_tsx_1.H2>
								<typography_tsx_1.H2 className="mb-16" variant="secondary" as="p">
									{"Here's why you should register for the workshop."}
								</typography_tsx_1.H2>
								<button_tsx_1.ButtonLink href={registerLink}>Register here</button_tsx_1.ButtonLink>
							</div>

							<div className="col-span-full lg:col-span-5 lg:col-start-8 lg:mr-12">
								{workshop.keyTakeawayHTMLs.length ? (<ol className="space-y-24 lg:space-y-16">
										{workshop.keyTakeawayHTMLs.map(function (_a, index) {
                var title = _a.title, description = _a.description;
                return (<numbered_panel_tsx_1.NumberedPanel key={index} number={index + 1} titleHTML={title} descriptionHTML={description}/>);
            })}
									</ol>) : (<typography_tsx_1.Paragraph>Key takeaways coming soon...</typography_tsx_1.Paragraph>)}
							</div>
						</grid_tsx_1.Grid>
					</div>
				</div>
			</div>

			<grid_tsx_1.Grid>
				<div className="col-span-8 mb-8 lg:mb-16">
					<typography_tsx_1.H2 className="mb-4 lg:mb-2">The topics we will be covering.</typography_tsx_1.H2>
					<typography_tsx_1.H2 variant="secondary">This is what we will talk about.</typography_tsx_1.H2>
				</div>

				<div className="col-span-full mb-16 flex flex-col items-stretch justify-end lg:col-span-4 lg:items-end lg:justify-center">
					<button_tsx_1.ButtonLink href={registerLink}>Register here</button_tsx_1.ButtonLink>
				</div>

				{workshop.topicHTMLs.length ? (<ol className="col-span-full space-y-4">
						{workshop.topicHTMLs.map(function (topicHTML, idx) { return (<TopicRow key={idx} number={idx + 1} topicHTML={topicHTML}/>); })}
					</ol>) : (<typography_tsx_1.Paragraph className="col-span-full">
						Topic list coming soon...
					</typography_tsx_1.Paragraph>)}
			</grid_tsx_1.Grid>

			<spacer_tsx_1.Spacer size="xs"/>

			<grid_tsx_1.Grid>
				{workshop.prerequisiteHTML ? (<>
						<div className="col-span-full lg:col-span-5">
							<typography_tsx_1.H6 className="mb-4">Required experience</typography_tsx_1.H6>
							<typography_tsx_1.Paragraph dangerouslySetInnerHTML={{ __html: workshop.prerequisiteHTML }}/>
						</div>
						<div className="col-span-full lg:col-span-2">
							<spacer_tsx_1.Spacer size="2xs"/>
						</div>
					</>) : null}
				<div className="col-span-full lg:col-span-5">
					<typography_tsx_1.H6 className="mb-4">Important Note</typography_tsx_1.H6>
					<typography_tsx_1.Paragraph>
						{"Depending on the questions asked during the workshop, or necessary changes in the material, the actual content of the workshop could differ from the above mentioned topics."}
					</typography_tsx_1.Paragraph>
				</div>
				<div className="col-span-full">
					<spacer_tsx_1.Spacer size="2xs"/>
				</div>
				<div className="col-span-full mt-6">
					<typography_tsx_1.H6 className="mb-4">What to expect from a Kent C. Dodds workshop</typography_tsx_1.H6>
					<div className="flex flex-col gap-2">
						<typography_tsx_1.Paragraph>
							{"\n                My primary goal is retention. If you can't remember what I've\n                taught you, then the whole experience was a waste of our time.\n              "}
						</typography_tsx_1.Paragraph>
						<typography_tsx_1.Paragraph>
							{"\n                With that in mind, we'll follow the teaching strategy I've\n                developed over years of teaching\n              "}
							{"("}
							<react_1.Link to="/blog/how-i-teach">
								learn more about my teaching strategy here
							</react_1.Link>
							{")."}
						</typography_tsx_1.Paragraph>
						<typography_tsx_1.Paragraph>
							{"\n                The short version is, you'll spend the majority of time working\n                through exercises that are specifically crafted to help you\n                experiment with topics you may have never experienced before.\n                I intentionally put you into the deep end and let you struggle a\n                bit to prepare your brain for the instruction.\n              "}
						</typography_tsx_1.Paragraph>
						<typography_tsx_1.Paragraph>
							{"\n                Based on both my personal experience and scientific research\n                around how people learn, this is an incredibly efficient way to\n                ensure you understand and remember what you're learning. This is\n                just one of the strategies I employ to improve your retention. I\n                think you'll love it!\n              "}
						</typography_tsx_1.Paragraph>
						<typography_tsx_1.Paragraph>
							{"I'm excited to be your guide as we learn together!"}
						</typography_tsx_1.Paragraph>
					</div>
				</div>
			</grid_tsx_1.Grid>

			{data.testimonials.length ? (<>
					<spacer_tsx_1.Spacer size="base"/>
					<testimonial_section_tsx_1.TestimonialSection testimonials={data.testimonials}/>
				</>) : null}

			<spacer_tsx_1.Spacer size="base"/>

			{workshopEvents.length ? (<grid_tsx_1.Grid className="mb-24 lg:mb-64">
					<div className="col-span-full lg:col-span-8 lg:col-start-3">
						<typography_tsx_1.H2 className="mb-6 text-center">
							{"Ready to learn more about ".concat(workshop.title, " in this workshop?")}
						</typography_tsx_1.H2>
						<typography_tsx_1.H2 className="mb-20 text-center" variant="secondary">
							{"You can register by using the button below. Can't wait to see you."}
						</typography_tsx_1.H2>
						{workshopEvents.map(function (workshopEvent, index) { return (<React.Fragment key={workshopEvent.date}>
								<workshop_registration_panel_tsx_1.RegistrationPanel workshopEvent={workshopEvent}/>
								{index === workshopEvents.length - 1 ? null : (<spacer_tsx_1.Spacer size="2xs"/>)}
							</React.Fragment>); })}
					</div>
				</grid_tsx_1.Grid>) : null}

			{alternateWorkshops.length ? (<grid_tsx_1.Grid>
					<div className="col-span-full mb-16">
						<typography_tsx_1.H2 className="mb-2">Have a look at my other workshops.</typography_tsx_1.H2>

						<typography_tsx_1.H2 variant="secondary" as="p">
							Learn more in these workshops.
						</typography_tsx_1.H2>
					</div>

					{alternateWorkshops.map(function (altWorkshop, idx) { return (<div key={idx} className="col-span-full mb-4 md:col-span-4 lg:mb-6">
							<workshop_card_tsx_1.WorkshopCard workshop={altWorkshop} titoEvents={titoEvents.filter(function (e) { return e.metadata.workshopSlug === altWorkshop.slug; })}/>
						</div>); })}
				</grid_tsx_1.Grid>) : null}
		</>);
}
function ErrorBoundary() {
    return (<error_boundary_tsx_1.GeneralErrorBoundary statusHandlers={{
            400: function (_a) {
                var error = _a.error;
                return <errors_tsx_1.FourHundred error={error.data}/>;
            },
            404: function (_a) {
                var error = _a.error;
                return (<errors_tsx_1.FourOhFour articles={error.data.recommendations}/>);
            },
        }}/>);
}
