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
Object.defineProperty(exports, "__esModule", { value: true });
exports.headers = exports.meta = void 0;
exports.loader = loader;
exports.default = Testimonials;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var arrow_button_tsx_1 = require("#app/components/arrow-button.tsx");
var button_tsx_1 = require("#app/components/button.tsx");
var grid_tsx_1 = require("#app/components/grid.tsx");
var hero_section_tsx_1 = require("#app/components/sections/hero-section.tsx");
var testimonial_card_tsx_1 = require("#app/components/sections/testimonial-card.tsx");
var spacer_tsx_1 = require("#app/components/spacer.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var images_tsx_1 = require("#app/images.tsx");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var seo_ts_1 = require("#app/utils/seo.ts");
var testimonials_server_ts_1 = require("#app/utils/testimonials.server.ts");
var timing_server_ts_1 = require("#app/utils/timing.server.ts");
var meta = function (_a) {
    var _b;
    var data = _a.data, matches = _a.matches;
    var testimonials = data === null || data === void 0 ? void 0 : data.testimonials;
    var requestInfo = (_b = matches.find(function (m) { return m.id === 'root'; })) === null || _b === void 0 ? void 0 : _b.data.requestInfo;
    var testimonialCount = testimonials ? "".concat(testimonials.length, " ") : '';
    var title = "".concat(testimonialCount, "testimonials about Kent C. Dodds");
    return (0, seo_ts_1.getSocialMetas)({
        title: title,
        description: "Check out ".concat(testimonialCount, "testimonials about Kent C. Dodds and how the things he's done has helped people in their goals."),
        url: (0, misc_tsx_1.getUrl)(requestInfo),
        image: (0, images_tsx_1.getGenericSocialImage)({
            url: (0, misc_tsx_1.getDisplayUrl)(requestInfo),
            featuredImage: images_tsx_1.images.kentHoldingOutCody.id,
            words: title,
        }),
    });
};
exports.meta = meta;
exports.headers = misc_tsx_1.reuseUsefulLoaderHeaders;
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var timings, _c;
        var _d;
        var request = _b.request;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    timings = {};
                    _c = node_1.json;
                    _d = {};
                    return [4 /*yield*/, (0, testimonials_server_ts_1.getTestimonials)({ request: request, timings: timings })];
                case 1: return [2 /*return*/, _c.apply(void 0, [(_d.testimonials = _e.sent(), _d), {
                            headers: {
                                'Cache-Control': 'private, max-age=3600',
                                'Server-Timings': (0, timing_server_ts_1.getServerTimeHeader)(timings),
                            },
                        }])];
            }
        });
    });
}
function Testimonials() {
    var data = (0, react_1.useLoaderData)();
    return (<>
			<hero_section_tsx_1.HeroSection title="Curious to read what people are saying?" subtitle="Checkout KCD testimonials below." image={<img {...(0, hero_section_tsx_1.getHeroImageProps)(images_tsx_1.images.kentHoldingOutCody, {
            className: 'rounded-lg',
            transformations: {
                resize: {
                    aspectRatio: '3:4',
                    type: 'crop',
                },
                gravity: 'face',
            },
        })}/>} arrowUrl="#list" arrowLabel="Start reading..." action={<button_tsx_1.ButtonLink variant="primary" to="https://kcd.im/testimonial" className="mr-auto">
						Submit your own
					</button_tsx_1.ButtonLink>}/>

			<div className="mx-10vw mb-14 grid grid-cols-4 gap-6 lg:grid-cols-8 xl:grid-cols-12" id="list">
				{data.testimonials.map(function (testimonial) { return (<testimonial_card_tsx_1.TestimonialCard key={testimonial.testimonial} testimonial={testimonial}/>); })}
			</div>

			<spacer_tsx_1.Spacer size="base"/>

			<grid_tsx_1.Grid>
				<div className="col-span-1 md:col-span-2 lg:col-span-3">
					<img {...(0, images_tsx_1.getImgProps)(images_tsx_1.images.microphone, {
        widths: [350, 512, 1024, 1536],
        sizes: [
            '20vw',
            '(min-width: 1024px) 30vw',
            '(min-width:1620px) 530px',
        ],
    })}/>
				</div>

				<div className="col-span-7 col-start-3 md:col-span-6 md:col-start-4 lg:col-span-8 lg:col-start-5">
					<typography_tsx_1.H2 className="mb-8">{"More of a listener?"}</typography_tsx_1.H2>
					<typography_tsx_1.H2 className="mb-16" variant="secondary" as="p">
						{"\n              Check out my Call Kent podcast and join in the conversation with your own call.\n            "}
					</typography_tsx_1.H2>
					<arrow_button_tsx_1.ArrowLink to="/calls">{"Check out the podcast"}</arrow_button_tsx_1.ArrowLink>
				</div>
			</grid_tsx_1.Grid>
		</>);
}
