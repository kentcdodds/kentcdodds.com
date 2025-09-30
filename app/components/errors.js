"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FourHundred = FourHundred;
exports.ErrorPage = ErrorPage;
exports.ServerError = ServerError;
exports.FourOhFour = FourOhFour;
var react_1 = require("@remix-run/react");
var clsx_1 = require("clsx");
var error_stack_parser_1 = require("error-stack-parser");
var React = require("react");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var arrow_button_tsx_1 = require("./arrow-button.tsx");
var kifs_tsx_1 = require("./kifs.tsx");
var blog_section_tsx_1 = require("./sections/blog-section.tsx");
var hero_section_tsx_1 = require("./sections/hero-section.tsx");
var typography_tsx_1 = require("./typography.tsx");
function RedBox(_a) {
    var error = _a.error;
    var _b = React.useState(true), isVisible = _b[0], setIsVisible = _b[1];
    var frames = error_stack_parser_1.default.parse(error);
    return (<div className={(0, clsx_1.clsx)('fixed inset-0 z-10 flex items-center justify-center transition', {
            'pointer-events-none opacity-0': !isVisible,
        })}>
			<button className="absolute inset-0 block h-full w-full bg-black opacity-75" onClick={function () { return setIsVisible(false); }}/>
			<div className="border-lg text-primary relative mx-5vw my-16 max-h-75vh overflow-y-auto rounded-lg bg-red-500 p-12">
				<typography_tsx_1.H2>{error.message}</typography_tsx_1.H2>
				<div>
					{frames.map(function (frame) { return (<div key={[frame.fileName, frame.lineNumber, frame.columnNumber].join('-')} className="pt-4">
							<typography_tsx_1.H6 as="div" className="pt-2">
								{frame.functionName}
							</typography_tsx_1.H6>
							<div className="font-mono opacity-75">
								{frame.fileName}:{frame.lineNumber}:{frame.columnNumber}
							</div>
						</div>); })}
				</div>
			</div>
		</div>);
}
function ErrorPage(_a) {
    var error = _a.error, articles = _a.articles, heroProps = _a.heroProps;
    if (articles === null || articles === void 0 ? void 0 : articles.length) {
        Object.assign(heroProps, {
            arrowUrl: '#articles',
            arrowLabel: 'But wait, there is more!',
        });
    }
    return (<>
			<noscript>
				<div style={{
            backgroundColor: 'black',
            color: 'white',
            padding: 30,
        }}>
					<h1 style={{ fontSize: '2em' }}>{heroProps.title}</h1>
					<p style={{ fontSize: '1.5em' }}>{heroProps.subtitle}</p>
					<small>
						Also, this site works much better with JavaScript enabled...
					</small>
				</div>
			</noscript>
			<main className="relative">
				{error && process.env.NODE_ENV === 'development' ? (<RedBox error={error}/>) : null}
				<hero_section_tsx_1.HeroSection {...heroProps}/>

				{(articles === null || articles === void 0 ? void 0 : articles.length) ? (<>
						<div id="articles"/>
						<blog_section_tsx_1.BlogSection articles={articles} title="Looking for something to read?" description="Have a look at these articles."/>
					</>) : null}
			</main>
		</>);
}
function FourOhFour(_a) {
    var articles = _a.articles;
    var matches = (0, react_1.useMatches)();
    var last = matches[matches.length - 1];
    var pathname = last === null || last === void 0 ? void 0 : last.pathname;
    return (<ErrorPage articles={articles} heroProps={{
            title: "404 - Oh no, you found a page that's missing stuff.",
            subtitle: "\"".concat(pathname, "\" is not a page on kentcdodds.com. So sorry."),
            image: <kifs_tsx_1.MissingSomething className="rounded-lg" aspectRatio="3:4"/>,
            action: <arrow_button_tsx_1.ArrowLink href="/">Go home</arrow_button_tsx_1.ArrowLink>,
        }}/>);
}
function FourHundred(_a) {
    var error = _a.error;
    return (<ErrorPage heroProps={{
            title: '400 - Oh no, you did something wrong.',
            subtitle: (0, misc_tsx_1.getErrorMessage)(error, "If you think I made a mistake, let me know..."),
            image: <kifs_tsx_1.Facepalm className="rounded-lg" aspectRatio="3:4"/>,
            action: <arrow_button_tsx_1.ArrowLink href="/">Go home</arrow_button_tsx_1.ArrowLink>,
        }}/>);
}
function ServerError(_a) {
    var error = _a.error, articles = _a.articles;
    var matches = (0, react_1.useMatches)();
    var last = matches[matches.length - 1];
    var pathname = last === null || last === void 0 ? void 0 : last.pathname;
    return (<ErrorPage error={error} articles={articles} heroProps={{
            title: '500 - Oh no, something did not go well.',
            subtitle: "\"".concat(pathname, "\" is currently not working. So sorry."),
            image: <kifs_tsx_1.Grimmacing className="rounded-lg" aspectRatio="3:4"/>,
            action: <arrow_button_tsx_1.ArrowLink href="/">Go home</arrow_button_tsx_1.ArrowLink>,
        }}/>);
}
