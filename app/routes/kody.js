"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meta = void 0;
exports.default = KodyPage;
var React = require("react");
var react_error_boundary_1 = require("react-error-boundary");
var hero_section_tsx_1 = require("#app/components/sections/hero-section.tsx");
var typography_js_1 = require("#app/components/typography.js");
var images_tsx_1 = require("#app/images.tsx");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var team_provider_tsx_1 = require("#app/utils/team-provider.tsx");
var meta = function () { return [
    { title: 'Kody the Koala' },
    {
        name: 'description',
        content: 'Meet Kody the Koala, the friendly mascot of the KCD Community! Learn about his story and download your favorite Kody image.',
    },
]; };
exports.meta = meta;
function KodyChooser() {
    var _a;
    var userTeam = (0, team_provider_tsx_1.useTeam)()[0];
    var _b = React.useState(userTeam !== null && userTeam !== void 0 ? userTeam : 'UNKNOWN'), team = _b[0], setTeam = _b[1];
    var _c = React.useState('normal'), style = _c[0], setStyle = _c[1];
    // Define image type options for each style
    var normalImageOptions = [
        { label: 'Profile', value: 'profile' },
        { label: 'Snowboarding', value: 'snowboarding' },
        { label: 'Skiing', value: 'skiing' },
        { label: 'Onewheeling', value: 'onewheeling' },
        { label: 'Playing Soccer', value: 'playingSoccer' },
        { label: 'Back Flipping', value: 'backFlipping' },
    ];
    var flyingImageOptions = [
        { label: 'Snowboarding', value: 'flyingSnowboarding' },
        { label: 'Skiing', value: 'flyingSkiing' },
        { label: 'Onewheeling', value: 'flyingOnewheeling' },
        { label: 'Playing Soccer', value: 'flyingPlayingSoccer' },
        { label: 'Back Flipping', value: 'flyingBackFlipping' },
    ];
    var imageOptions = style === 'normal' ? normalImageOptions : flyingImageOptions;
    // Default to first option for the style
    var _d = React.useState(imageOptions[0].value), type = _d[0], setType = _d[1];
    var imageObj = (_a = images_tsx_1.kodyImages[type]) === null || _a === void 0 ? void 0 : _a[team !== null && team !== void 0 ? team : 'UNKNOWN'];
    return (<div className="mx-auto my-8 flex flex-col gap-4 text-center">
			<div className="flex flex-wrap items-center justify-center gap-4">
				<label>
					Team Color:{' '}
					<select value={team} onChange={function (e) { return setTeam(e.target.value); }}>
						{misc_tsx_1.optionalTeams.map(function (t) { return (<option key={t} value={t}>
								{t.charAt(0) + t.slice(1).toLowerCase()}
							</option>); })}
					</select>
				</label>
				<label>
					Style:{' '}
					<select value={style} onChange={function (e) {
            var newStyle = e.target.value;
            setStyle(newStyle);
            if (newStyle === 'flying' && type === 'profile') {
                setType(flyingImageOptions[0].value);
            }
            else if (newStyle === 'normal') {
                var withoutFlying = type.replace('flying', '');
                var newType = withoutFlying.charAt(0).toLowerCase() + withoutFlying.slice(1);
                setType(newType);
            }
            else if (newStyle === 'flying') {
                setType("flying".concat(type.charAt(0).toUpperCase()).concat(type.slice(1)));
            }
        }}>
						<option value="normal">Normal</option>
						<option value="flying">Flying</option>
					</select>
				</label>
				<label>
					Kody Image:{' '}
					<select value={type} onChange={function (e) { return setType(e.target.value); }}>
						{imageOptions.map(function (t) { return (<option key={t.value} value={t.value}>
								{t.label}
							</option>); })}
					</select>
				</label>
			</div>
			<div className="flex flex-col items-center">
				<img key={"".concat(team, "-").concat(type, "-").concat(style)} src={imageObj({ resize: { width: 800, height: 800, type: 'pad' } })} alt={imageObj.alt} className="h-96 w-96 rounded-lg object-contain"/>
				<div style={{ marginTop: 12 }}>
					<a href={imageObj()} download={"kody-".concat(team.toLowerCase(), "-").concat(type, ".png")} className="text-blue-600 underline">
						Download this image
					</a>
				</div>
			</div>
		</div>);
}
function KodyPage() {
    var userTeam = (0, team_provider_tsx_1.useTeam)()[0];
    var profileImage = userTeam === 'BLUE'
        ? images_tsx_1.images.kodyProfileBlue
        : userTeam === 'RED'
            ? images_tsx_1.images.kodyProfileRed
            : userTeam === 'YELLOW'
                ? images_tsx_1.images.kodyProfileYellow
                : images_tsx_1.images.kodyProfileGray;
    return (<>
			<hero_section_tsx_1.HeroSection title="Meet Kody the Koala 🐨" subtitle="The friendly mascot of the KCD Community." image={<img {...(0, hero_section_tsx_1.getHeroImageProps)(profileImage)} alt="Kody the Koala" className="rounded-lg"/>} imageSize="medium" arrowUrl="#chooser" arrowLabel="Choose your Kody image"/>
			<main className="mx-auto flex flex-col items-center">
				<section className="prose dark:prose-dark">
					<typography_js_1.H2>Who is Kody?</typography_js_1.H2>
					<p className="mb-8 text-lg">
						Kody the Koala is the beloved mascot of the KCD Community. If you've
						participated in Kent's workshops or courses, you've probably seen
						Kody pop up as an emoji (🐨) whenever you're supposed to <em>do</em>{' '}
						something. Kody helps make learning more fun and engaging!
					</p>
					<typography_js_1.H2>Where did Kody come from?</typography_js_1.H2>
					<p className="mb-4">
						When Kent was creating self-paced workshops, he wanted a way to
						clearly show the difference between explanations and actionable
						steps. The solution? A friendly mascot! Kody the Koala became the
						symbol for action, encouragement, and community spirit. (Fun fact:
						Kody replaced Terry the Tiger 🐯 as the original mascot!)
					</p>
					<ul className="mb-4 list-inside list-disc">
						<li>Friendly encouragement</li>
						<li>Community and teamwork</li>
						<li>Taking action and having fun while learning</li>
					</ul>
				</section>
				<section className="prose dark:prose-dark" id="chooser">
					<typography_js_1.H2>Choose Your Favorite Kody</typography_js_1.H2>
					<p className="mb-4">
						Kody comes in many styles and team colors! Use the chooser below to
						pick your favorite Kody image, then download it to use as an avatar,
						sticker, or just for fun.
					</p>
					<react_error_boundary_1.ErrorBoundary fallback={<p>Error</p>}>
						<KodyChooser />
					</react_error_boundary_1.ErrorBoundary>
				</section>
				<section className="mx-auto max-w-2xl border-t pt-8 text-center">
					<p>
						Want to see Kody in action? Join the{' '}
						<a href="/discord" className="text-blue-600 underline">
							KCD Community
						</a>{' '}
						and pick your team color to participate in fun activities, earn
						points, and connect with others!
					</p>
				</section>
			</main>
		</>);
}
