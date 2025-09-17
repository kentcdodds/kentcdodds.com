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
exports.meta = exports.headers = void 0;
exports.loader = loader;
var node_1 = require("@remix-run/node");
var react_1 = require("@remix-run/react");
var React = require("react");
var grid_tsx_1 = require("#app/components/grid.tsx");
var icons_tsx_1 = require("#app/components/icons.tsx");
var header_section_tsx_1 = require("#app/components/sections/header-section.tsx");
var hero_section_tsx_1 = require("#app/components/sections/hero-section.tsx");
var spacer_tsx_1 = require("#app/components/spacer.tsx");
var typography_tsx_1 = require("#app/components/typography.tsx");
var images_tsx_1 = require("#app/images.tsx");
var lodash_ts_1 = require("#app/utils/cjs/lodash.ts");
var credits_server_ts_1 = require("#app/utils/credits.server.ts");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var seo_ts_1 = require("#app/utils/seo.ts");
function loader(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var people;
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, credits_server_ts_1.getPeople)({ request: request })];
                case 1:
                    people = _c.sent();
                    return [2 /*return*/, (0, node_1.json)({ people: (0, lodash_ts_1.shuffle)(people) }, {
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
var meta = function (_a) {
    var _b;
    var matches = _a.matches;
    var requestInfo = (_b = matches.find(function (m) { return m.id === 'root'; })) === null || _b === void 0 ? void 0 : _b.data.requestInfo;
    var domain = new URL((0, misc_tsx_1.getOrigin)(requestInfo)).host;
    return (0, seo_ts_1.getSocialMetas)({
        title: "Who built ".concat(domain),
        description: "It took a team of people to create ".concat(domain, ". This page will tell you a little bit about them."),
        url: (0, misc_tsx_1.getUrl)(requestInfo),
        image: (0, images_tsx_1.getSocialImageWithPreTitle)({
            url: (0, misc_tsx_1.getDisplayUrl)(requestInfo),
            featuredImage: images_tsx_1.images.kentCodingOnCouch.id,
            title: "The fantastic people who built ".concat(domain),
            preTitle: 'Check out these people',
        }),
    });
};
exports.meta = meta;
var icons = {
    website: <icons_tsx_1.GlobeIcon title="Website"/>,
    github: <icons_tsx_1.GithubIcon />,
    x: <icons_tsx_1.XIcon />,
    instagram: <icons_tsx_1.InstagramIcon />,
    dribbble: <icons_tsx_1.DribbbleIcon />,
    codepen: <icons_tsx_1.CodepenIcon />,
    twitch: <icons_tsx_1.TwitchIcon />,
    linkedin: <icons_tsx_1.LinkedInIcon />,
    behance: <icons_tsx_1.BehanceIcon />,
};
function ProfileCard(_a) {
    var person = _a.person;
    return (<div className="relative flex w-full flex-col">
			<div className="mb-8 aspect-[3/4] w-full flex-none">
				<img {...(0, images_tsx_1.getImgProps)((0, images_tsx_1.getImageBuilder)(person.cloudinaryId), {
        className: 'rounded-lg object-cover',
        widths: [280, 560, 840, 1100, 1300, 1650],
        sizes: [
            '(max-width:639px) 80vw',
            '(min-width:640px) and (max-width:1023px) 40vw',
            '(min-width:1024px) and (max-width:1620px) 25vw',
            '410px',
        ],
    })}/>
			</div>

			<div className="flex-auto">
				<div className="mb-4 text-xl font-medium lowercase text-slate-500">
					{person.role}
				</div>
				<typography_tsx_1.H3 className="mb-6">{person.name}</typography_tsx_1.H3>
				<typography_tsx_1.Paragraph className="mb-8">{person.description}</typography_tsx_1.Paragraph>
			</div>

			<div className="text-secondary flex flex-none space-x-4">
				{Object.entries(icons).map(function (_a) {
            var key = _a[0], Icon = _a[1];
            var url = person[key];
            return url ? (<a key={key} href={url} className="hover:text-primary focus:text-primary">
							{React.cloneElement(Icon, { size: 32 })}
						</a>) : null;
        })}
			</div>
		</div>);
}
function CreditsIndex() {
    var data = (0, react_1.useLoaderData)();
    return (<>
			<hero_section_tsx_1.HeroSection title="Curious to see all the people who helped out making this website?" subtitle="Start scrolling to learn more about everyone involved." image={<img {...(0, hero_section_tsx_1.getHeroImageProps)(images_tsx_1.images.kentCodingOnCouch, {
            className: 'rounded-lg',
            transformations: {
                resize: {
                    aspectRatio: '3:4',
                    type: 'crop',
                },
                gravity: 'face',
            },
        })}/>} arrowUrl="#intro" arrowLabel="Get to know more here"/>

			<grid_tsx_1.Grid className="mb-24 lg:mb-64">
				<div className="col-span-full mb-12 lg:col-span-4 lg:mb-0">
					<typography_tsx_1.H6 id="intro">{"Producing this site was a team effort"}</typography_tsx_1.H6>
				</div>
				<div className="col-span-full mb-8 lg:col-span-8 lg:mb-20">
					<typography_tsx_1.H2 className="mb-8">
						{"\n              kentcdodds.com is more than just my developer portfolio. It's a\n              place for me to share my thoughts, ideas, and experiences as\n              well as the thoughts, ideas, and experiences of others (yourself\n              included). It's a full fleged\u2013"}
						<a target="_blank" rel="noreferrer noopener" href="https://github.com/kentcdodds/kentcdodds.com">
							open source
						</a>
						{"\u2013web application."}
					</typography_tsx_1.H2>
					<typography_tsx_1.H2 variant="secondary" as="p">
						<a href="https://egghead.io?af=5236ad">egghead.io</a>
						{"\n              and I have collaborated to make this website a\n              truly high-quality and delightful learning experience for you and\n              others.\n            "}
					</typography_tsx_1.H2>
				</div>
				<typography_tsx_1.Paragraph className="lg:mb:0 col-span-full mb-4 lg:col-span-4 lg:col-start-5 lg:mr-12">
					{"\n            It would be impossible to list everyone who has contributed to the\n            creation of this website (I'd have to list my parents, teachers,\n            etc, etc, etc).\n          "}
				</typography_tsx_1.Paragraph>
				<typography_tsx_1.Paragraph className="col-span-full lg:col-span-4 lg:col-start-9 lg:mr-12">
					{"\n            But hopefully with this page, you can get an idea of the primary\n            group of folks who worked to make this site great.\n          "}
				</typography_tsx_1.Paragraph>
			</grid_tsx_1.Grid>

			<header_section_tsx_1.HeaderSection className="mb-16" title="Everyone that helped out." subTitle="In no particular order."/>

			<grid_tsx_1.Grid className="gap-y-20 lg:gap-y-32">
				{data.people.map(function (person) { return (<div key={person.name} className="col-span-4">
						<ProfileCard person={person}/>
					</div>); })}
			</grid_tsx_1.Grid>

			<spacer_tsx_1.Spacer size="base"/>

			<header_section_tsx_1.HeaderSection title="Shout-outs" subTitle="Some other awesome folks" className="mb-16"/>
			<grid_tsx_1.Grid className="prose prose-light gap-y-20 dark:prose-dark lg:gap-y-32">
				<typography_tsx_1.Paragraph className="col-span-4">
					<a href="https://x.com/ryanflorence">Ryan Florence</a>
					{" and other friends at "}
					<a href="https://remix.run">Remix.run</a>
					{"\n            were super helpful as I was figuring out the best way to rewrite my\n            website in this new technology with completely new and improved\n            features that far exceeded what my website had been previously.\n          "}
				</typography_tsx_1.Paragraph>
				<typography_tsx_1.Paragraph className="col-span-4">
					The syntax highlighting theme in blog posts is inspired by{' '}
					<a href="https://x.com/sarah_edo">Sarah Drasner&apos;s</a>{' '}
					<a href="https://github.com/sdras/night-owl-vscode-theme">
						Night Owl
					</a>
					.
				</typography_tsx_1.Paragraph>
				<typography_tsx_1.Paragraph className="col-span-4">
					{"\n            To prepare for the launch of this website, a number of terrific\n            folks reviewed and\n          "}
					<a href="https://github.com/kentcdodds/kentcdodds.com/issues?q=is%3Aissue">
						opened issues
					</a>
					{" and even made "}
					<a href="https://github.com/kentcdodds/kentcdodds.com/pulls?q=is%3Apr">
						pull requests
					</a>
					{" to get it ready for launch. Thank you!"}
				</typography_tsx_1.Paragraph>
				<typography_tsx_1.Paragraph className="col-span-4">
					{"The folks at "}
					<a href="https://fly.io">Fly.io</a>
					{"\n            were an enormous help in getting me off the ground with hosting the\n            site and databases. The backend is totally not my domain and they\n            seriously helped me be successful.\n          "}
				</typography_tsx_1.Paragraph>
			</grid_tsx_1.Grid>
		</>);
}
exports.default = CreditsIndex;
