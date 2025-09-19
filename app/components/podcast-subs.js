"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PodcastSubs = PodcastSubs;
var icons_tsx_1 = require("./icons.tsx");
function PodcastAppLink(_a) {
    var icon = _a.icon, children = _a.children, props = __rest(_a, ["icon", "children"]);
    return (<a {...props} className="focus-ring text-primary bg-secondary mb-4 mr-4 flex flex-none items-center space-x-4 rounded-full px-8 py-4">
			<span className="text-gray-400">{icon}</span>
			<span>{children}</span>
		</a>);
}
function PodcastSubs(_a) {
    var apple = _a.apple, pocketCasts = _a.pocketCasts, spotify = _a.spotify, rss = _a.rss;
    return (<div className="col-span-full -mb-4 -mr-4 flex flex-wrap items-start justify-start lg:col-span-10">
			<PodcastAppLink icon={<icons_tsx_1.AppleIcon />} href={apple}>
				Apple podcasts
			</PodcastAppLink>
			<PodcastAppLink icon={<icons_tsx_1.PocketCastsIcon />} href={pocketCasts}>
				Pocket Casts
			</PodcastAppLink>
			<div className="flex-no-wrap flex">
				<PodcastAppLink icon={<icons_tsx_1.SpotifyIcon />} href={spotify}>
					Spotify
				</PodcastAppLink>
				<PodcastAppLink icon={<icons_tsx_1.RssIcon />} href={rss}>
					RSS
				</PodcastAppLink>
			</div>
		</div>);
}
