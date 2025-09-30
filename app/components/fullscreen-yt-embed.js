"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.links = exports.LiteYouTubeEmbed = void 0;
exports.FullScreenYouTubeEmbed = FullScreenYouTubeEmbed;
var dialog_1 = require("@reach/dialog");
var React = require("react");
var icons_tsx_1 = require("./icons.tsx");
function YouTubeEmbed(_a) {
    var onCloseClick = _a.onCloseClick, ytLiteEmbed = _a.ytLiteEmbed;
    var embedContainer = React.useRef(null);
    React.useLayoutEffect(function () {
        if (!embedContainer.current)
            return;
        var ytLite = embedContainer.current.querySelector('.yt-lite');
        if (!(ytLite instanceof HTMLElement))
            return;
        ytLite.click();
    }, []);
    return (<div className="fixed inset-0 bg-black px-5vw">
			<button aria-label="close video" onClick={onCloseClick} className="absolute right-4 top-8 z-50 rotate-45 transform text-white hover:scale-150 focus:scale-150 focus:outline-none">
				<icons_tsx_1.PlusIcon />
			</button>
			<div className="flex h-full w-full flex-col justify-center" ref={embedContainer}>
				{ytLiteEmbed}
			</div>
		</div>);
}
function FullScreenYouTubeEmbed(_a) {
    var _b, _c;
    var img = _a.img, _d = _a.autoplay, autoplay = _d === void 0 ? false : _d, ytLiteEmbed = _a.ytLiteEmbed;
    var _e = React.useState(autoplay), showPlayer = _e[0], setShowPlayer = _e[1];
    return (<>
			<dialog_1.Dialog isOpen={showPlayer} onDismiss={function () { return setShowPlayer(false); }} aria-label={"Watch ".concat((_c = (_b = ytLiteEmbed.props) === null || _b === void 0 ? void 0 : _b.title) !== null && _c !== void 0 ? _c : 'the video')}>
				<YouTubeEmbed onCloseClick={function () { return setShowPlayer(false); }} ytLiteEmbed={ytLiteEmbed}/>
			</dialog_1.Dialog>

			{showPlayer ? null : (<button className="group relative w-full" onClick={function () { return setShowPlayer(true); }}>
					{img}
					<span className="absolute left-0 top-0 h-full w-full">
						<span className="flex h-full w-full items-center justify-center">
							<span className="transform opacity-70 transition-all group-hover:opacity-100 group-focus:opacity-100 motion-safe:group-hover:scale-110 motion-safe:group-focus:scale-110 motion-safe:group-active:scale-125">
								<icons_tsx_1.PlayIcon />
							</span>
						</span>
					</span>
				</button>)}
		</>);
}
/**
 *  in order to prevent this error when running native ESM in production
 *  TypeError: Unknown file extension ".jsx" for
 *  kentcdodds.com/node_modules/react-lite-youtube-embed/dist/index.es.jsx
 *
 *  we import it here from 'react-lite-youtube-embed/dist/index.es.jsx' and add
 *  it to serverDependenciesToBundle in remix.config.js
 */
var index_es_jsx_1 = require("react-lite-youtube-embed/dist/index.es.jsx");
Object.defineProperty(exports, "LiteYouTubeEmbed", { enumerable: true, get: function () { return index_es_jsx_1.default; } });
var links = function () {
    // for the youtube embed
    return [
        { rel: 'preconnect', href: 'https://www.youtube-nocookie.com' },
        { rel: 'preconnect', href: 'https://www.google.com' },
    ];
};
exports.links = links;
