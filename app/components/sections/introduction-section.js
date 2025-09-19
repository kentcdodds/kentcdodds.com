"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntroductionSection = IntroductionSection;
var react_1 = require("@remix-run/react");
var images_tsx_1 = require("#app/images.tsx");
var arrow_button_tsx_1 = require("../arrow-button.tsx");
var fullscreen_yt_embed_tsx_1 = require("../fullscreen-yt-embed.tsx");
var grid_tsx_1 = require("../grid.tsx");
var typography_tsx_1 = require("../typography.tsx");
function IntroductionSection() {
    var searchParams = (0, react_1.useSearchParams)()[0];
    return (<grid_tsx_1.Grid>
			<div className="col-span-full lg:col-span-4">
				<fullscreen_yt_embed_tsx_1.FullScreenYouTubeEmbed autoplay={searchParams.has('autoplay')} img={<img {...(0, images_tsx_1.getImgProps)(images_tsx_1.images.getToKnowKentVideoThumbnail, {
            className: 'rounded-lg object-cover w-full',
            widths: [256, 550, 700, 900, 1300, 1800],
            sizes: [
                '(max-width: 320px) 256px',
                '(min-width: 321px) and (max-width: 1023px) 80vw',
                '(min-width: 1024px) 410px',
                '850px',
            ],
        })}/>} ytLiteEmbed={<fullscreen_yt_embed_tsx_1.LiteYouTubeEmbed id="a7VxBwLGcDE" announce="Watch" title="Get to know Kent C. Dodds" 
        // We don't show the poster, so we use the lowest-res version
        poster="default" params={new URLSearchParams({
                color: 'white',
                playsinline: '0',
                rel: '0',
            }).toString()}/>}/>
				<p className="text-secondary text-xl">{"Introduction video (2:13)"}</p>
				<react_1.Link prefetch="intent" className="underlined" to="/about?autoplay">{"or, watch the full video here (8:05)"}</react_1.Link>
			</div>
			<div className="col-span-full mt-12 lg:col-span-6 lg:col-start-6 lg:mt-0">
				<typography_tsx_1.H2 id="intro">
					{"Hi, I'm Kent C. Dodds. I help people make the world better through quality software."}
				</typography_tsx_1.H2>
				<typography_tsx_1.H3 variant="secondary" as="p" className="mt-12">
					{"\n            I'm also a big extreme sports enthusiast. When I'm not hanging out\n            with my family or at the computer you can find me cruising around on\n            my onewheel or hitting the slopes on my snowboard when it's cold.\n          "}
				</typography_tsx_1.H3>
				<arrow_button_tsx_1.ArrowLink to="/about" direction="right" className="mt-20" prefetch="intent">
					Learn more about me
				</arrow_button_tsx_1.ArrowLink>
			</div>
		</grid_tsx_1.Grid>);
}
